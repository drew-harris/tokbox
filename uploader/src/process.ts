import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { extractTikTokId } from "./utils/ids";
import { parseTiktokTime, type BaseVideo } from "./utils/json";
import { client } from "./s3";

export const processVideo = async (video: BaseVideo) => {
  const id = extractTikTokId(video.link);
  if (!id) return;
  const result = await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.id, id));

  if (result.length != 0) {
    console.log(`Skipping ${video.link} because it's already in the database`);
    return;
  }

  const redirectUrl = video.link.replace("tiktokv.com", "tiktok.com");

  const cobaltResponse = await fetch("https://cobalt.drewh.net", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: redirectUrl,
    }),
  });
  if (!cobaltResponse.ok) {
    console.error(await cobaltResponse.json());
    return;
  }

  const cobaltData = (await cobaltResponse.json()) as {
    url: string;
    filename: string;
  };


  if (!cobaltData.url) {
    return
  }
  // Download url as buffer and upload to S3Client
  const buffer = await fetch(cobaltData.url).then((r) => r.arrayBuffer());

  await client.write(cobaltData.filename, buffer);

  // Save to postgres
  const [inserted] = await db.insert(schema.videos).values({
    id: id,
    date: parseTiktokTime(video.date),
    file_name: cobaltData.filename,
    liked: false,
    saved: true,
  }).returning();
  return inserted
};

const getRedirect = async (url: string) => {
  const response = await fetch(url, {
    redirect: "manual",
  });
  const redirectUrl = response.headers.get("location");
  if (!redirectUrl) return null;
  return redirectUrl;
};
