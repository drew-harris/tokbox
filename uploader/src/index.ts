import { parseArgs } from "util";
import { z } from "zod";
import { applyFilters, getTiktokDataFromFile } from "./utils/json";
import { processVideo } from "./process";
import { db, schema } from "./db";

const argsSchema = z.object({
  path: z.string().default("./data.json"),
  limit: z.coerce.number().optional(),
  cursor: z.coerce.number().default(0),
  type: z.enum(["saved", "liked", "watched"]).default("saved"),
  concurrent: z.coerce.number().default(5), // Number of concurrent requests
});

export type ArgValues = z.infer<typeof argsSchema>;

// Simple promise pool implementation
async function poolAll<T, R>(
  items: T[],
  concurrent: number,
  fn: (item: T, index: number) => Promise<R>
) {
  const pool = new Set();
  const results: R[] = [];

  for (const [index, item] of items.entries()) {
    const promise = fn(item, index).catch(err => {
      console.error(`Error processing index ${index}:`, err);
      return null;
    });

    pool.add(promise);
    promise.then(() => pool.delete(promise));

    if (pool.size >= concurrent) {
      await Promise.race(pool);
    }
  }

  // Wait for remaining promises
  await Promise.all(pool);
  return results;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      wipe: {
        type: "boolean",
        short: "w",
        default: false,
      },
      path: {
        type: "string",
        short: "p",
      },
      limit: {
        type: "string",
        short: "l",
      },
      cursor: {
        type: "string",
        short: "c",
      },
      type: {
        type: "string",
        short: "t",
        default: "saved",
      },
      concurrent: {
        type: "string",
        short: "n",
        default: "5",
      },
    },
    allowPositionals: true,
  });

  if (values.wipe) {
    await db.delete(schema.videos);
  }

  const parsed = argsSchema.parse(values);
  const data = await getTiktokDataFromFile(parsed.path);

  console.log(positionals);
  if (positionals.includes("transfer")) {
    console.log("Transferring watched videos");
    await db.insert(schema.watched).values(data.Activity["Video Browsing History"].VideoList.map(v => ({ date: v.Date, link: v.Link })))
    process.exit(0);
  }

  const videos = applyFilters(parsed, data);

  if (parsed.limit) {
    videos.splice(parsed.limit);
  }

  const toProcess = videos.slice(parsed.cursor);
  console.log(`Processing ${toProcess.length} videos with ${parsed.concurrent} concurrent requests`);

  await poolAll(toProcess, parsed.concurrent, async (video, index) => {
    const actualIndex = index + parsed.cursor;
    try {
      const vid = await processVideo(video);
      if (!vid) return;

      console.log(
        `Index: ${String(actualIndex).padStart(5, "0")}, ` +
        `Uploaded https://tokbox-archive-drewh.s3.us-east-1.amazonaws.com/${vid.file_name}`
      );

      if (actualIndex % 20 === 0) {
        await Bun.write("./cursor.json", JSON.stringify({ cursor: actualIndex }));
      }
    } catch (err) {
      console.error(`Error at index ${actualIndex}:`, err);
    }
  });

  process.exit(0);
}

main();
