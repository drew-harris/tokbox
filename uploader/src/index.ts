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
});

export type ArgValues = z.infer<typeof argsSchema>;

async function main() {
  const { values } = parseArgs({
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
    },
    allowPositionals: true,
  });

  if (values.wipe) {
    await db.delete(schema.videos);
  }

  const parsed = argsSchema.parse(values);
  const data = await getTiktokDataFromFile(parsed.path);
  const videos = applyFilters(parsed, data);

  // Apply limit
  if (parsed.limit) {
    videos.splice(parsed.limit);
  }

  console.log(videos.length);

  for (let i = parsed.cursor; i < videos.length; i++) {
    try {
      const vid = await processVideo(videos[i]);
      if (!vid) continue;
      console.log(`Index: ${String(i).padStart(5, "0")}, Uploaded https://tokbox-archive-drewh.s3.us-east-1.amazonaws.com/${vid?.file_name}`);

      // save cursor to file
      if (i % 20 === 0) {
        await Bun.write("./cursor.json", JSON.stringify({ cursor: i }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  process.exit(0);
}

main();
