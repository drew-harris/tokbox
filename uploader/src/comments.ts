import { and, desc, eq, isNull, type SQLWrapper } from "drizzle-orm";
import type { ArgValues } from ".";
import { poolAll } from ".";
import { db, schema } from "./db";
import { z } from "zod";

const MIN_LIKES = 10;

export const processComments = async (args: ArgValues) => {
  const filters: (SQLWrapper | undefined)[] = [];
  if (args.type === "saved") {
    filters.push(eq(schema.videos.saved, true));
  } else if (args.type === "liked") {
    filters.push(eq(schema.videos.liked, true));
  }
  let query = db
    .select({
      id: schema.videos.id,
      date: schema.videos.date,
      file_name: schema.videos.file_name,
      liked: schema.videos.liked,
      saved: schema.videos.saved,
    })
    .from(schema.videos)
    .leftJoin(schema.comments, eq(schema.videos.id, schema.comments.video_id))
    .where(and(isNull(schema.comments.id), ...filters))
    .offset(args.cursor)
    .orderBy(desc(schema.videos.date))
    .limit(args.limit || 999_999);
  const videos = await query;

  await poolAll(videos, args.concurrent, async (video, index) => {
    try {
      const msg = await processVideo(video);
      console.log(
        `Index: ${String(index + args.cursor).padStart(5, "0")}, ` + msg,
      );
    } catch (error) {
      console.error(`Error processing video ${video.id}:`, error);
    }
  });
};

const commentSchema = z.object({
  cid: z.string(),
  text: z.string(),
  aweme_id: z.string(),
  create_time: z.number(),
  user: z.object({
    nickname: z.string(),
    uid: z.string(),
  }),
  digg_count: z.number(),
});
const commentResponseSchema = z.object({
  comments: z.array(commentSchema).nullish(),
  cursor: z.number().nullish(),
  total: z.number().nullish(),
});

async function getTikTokComments(
  videoId: string,
  cursor: number = 0,
  count: number = 40,
) {
  try {
    const response = await fetch(
      `https://www.tiktok.com/api/comment/list/?WebIdLastTime=1736494139&aid=1988&app_language=en&app_name=tiktok_web&aweme_id=${videoId}&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=MacIntel&browser_version=5.0%20(Macintosh)&channel=tiktok_web&cookie_enabled=true&count=${count}&cursor=${cursor}&data_collection_enabled=false&device_id=7458185493847655966&device_platform=web_pc&focus_state=true&from_page=video&history_len=2&is_fullscreen=false&is_page_visible=true&odinId=7458185524995736606&os=mac&priority_region=&referer=&region=US&screen_height=1440&screen_width=2560&tz_name=America%2FChicago&user_is_login=false&webcast_language=en&msToken=KoJlmWxwVpgtEkqWBC_hCh_KoC-JCqsjUF1NsEGVAq9P44E-kXxoEfF112Z_IU_ORLpYuSXrUwucxMoo9ZQ1bdH_uSvT7WbtvuSxF1TAvGB1w38vs6ReZIJ0i2wTlOeij-_jCJzNa6I=&X-Bogus=DFSzsIVOsXUANSaqtpAHbBjIVUXY"`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    try {
      const parsed = commentResponseSchema.parse(JSON.parse(data));
      return parsed;
    } catch (err) {
      console.error("Error parsing comments:", err);
      throw new Error("Error parsing comments");
    }
  } catch (error) {
    // console.error("Error fetching TikTok comments for video", videoId);
    throw error;
  }
}

async function getAllComments(videoId: string) {
  const comments: z.infer<typeof commentSchema>[] = [];
  let cursor = 0;
  while (true) {
    const response = await getTikTokComments(videoId, cursor);
    if (!response.comments) {
      break;
    }
    if (response.comments.length === 0) {
      break;
    }

    const highestDiggCount = response.comments.reduce(
      (highest, comment) => Math.max(highest, comment.digg_count),
      0,
    );

    if (highestDiggCount < MIN_LIKES) {
      break;
    }

    comments.push(...response.comments);
    if (!response.cursor) {
      break;
    }
    cursor = response.cursor;
  }
  return comments;
}

const transformCommentToDatabase = (
  comment: z.infer<typeof commentSchema>,
  videoId: string,
): typeof schema.comments.$inferInsert => {
  return {
    id: comment.cid,
    text: comment.text,
    username: comment.user.nickname,
    likes: comment.digg_count,
    date: new Date(comment.create_time * 1000),
    video_id: videoId,
  };
};

const processVideo = async (video: typeof schema.videos.$inferSelect) => {
  // check if there are already comments for this video
  const prevComments = await db
    .select()
    .from(schema.comments)
    .where(eq(schema.comments.video_id, video.id));

  if (prevComments.length > 0) {
    console.log("Already processed this video");
    return;
  }

  let comments = await getAllComments(video.id);
  comments = comments.filter((comment) => comment.digg_count >= MIN_LIKES);
  if (!comments.length) {
    return `No comments for video ${video.id}`;
  }
  await db
    .insert(schema.comments)
    .values(
      comments.map((comment) => transformCommentToDatabase(comment, video.id)),
    )
    .onConflictDoNothing();

  return `Processed ${comments.length} comments for video ${video.id}`;
};
