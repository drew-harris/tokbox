import { parseArgs } from "util";
import { z } from "zod";

const argsSchema = z.object({
  data: z.string().default("./data.json"),
  limit: z.coerce.number(),
});

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      data: {
        type: "string",
        default: "./data.json",
        short: "d",
        multiple: false,
      },
      limit: {
        type: "string",
        short: "l",
        default: "20",
      },
    },
    allowPositionals: true,
  });

  const parsed = argsSchema.parse(values);

  const raw = await Bun.file(parsed.data).text();
  const jsonValue = await JSON.parse(raw);
  console.log(jsonValue["Profile"]);
}

main();

