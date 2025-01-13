import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/start";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { useEffect, useState } from "react";
import { db, schema } from "~/db";
import { Comments } from "~/components/Comments";

export const commentsRoute = createServerFn({ method: "GET" })
  .validator(
    z.object({
      videoId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const comments = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.video_id, data.videoId))
      .orderBy(desc(schema.comments.likes));
    return {
      comments: comments,
    };
  });

const something = createServerFn({ method: "GET" })
  .validator(
    z.object({
      limit: z.number(),
      offset: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const videos = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.saved, true))
      .orderBy(desc(schema.videos.date))
      .limit(data.limit)
      .offset(data.offset);
    return {
      videos: videos,
      nextOffset: videos.length + data.offset,
    };
  });

type Video = typeof schema.videos.$inferSelect;

function VideoPlayer({ video }: { video: Video }) {
  const comments = useServerFn(commentsRoute);

  const { data } = useQuery({
    queryKey: ["comments", video.id],
    queryFn: () =>
      comments({
        data: {
          videoId: video.id,
        },
      }),
  });

  return (
    <div className="video-container" style={{ height: "100vh" }}>
      <video
        src={createFilePath(video)}
        controls
        autoPlay
        loop
        className="w-full h-full object-contain"
      />
    </div>
  );
}

const createFilePath = (video: Video) =>
  `https://tokbox-archive-drewh.s3.us-east-1.amazonaws.com/${video.file_name}`;

function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const callsomething = useServerFn(something);

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["videos"],
    queryFn: ({ pageParam }) => {
      return callsomething({
        data: {
          limit: 20,
          offset: pageParam,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.nextOffset,
  });

  const allVideos = data?.pages.flatMap((page) => page.videos) ?? [];

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  };

  const handleNextVideo = async () => {
    if (currentVideoIndex < allVideos.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
    } else if (hasNextPage) {
      // Load more videos if we're at the end and there are more pages
      await fetchNextPage();
      setCurrentVideoIndex((prev) => prev + 1);
    }
  };

  if (!allVideos.length) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative h-screen">
      {/* Video Player */}
      {/* <div className="flex px-8 max-w-[80vw] mx-auto"> */}
      <VideoPlayer video={allVideos[currentVideoIndex]} />
      <Comments videoId={allVideos[currentVideoIndex].id} />
      {/* </div> */}

      {/* Navigation Buttons */}
      <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4 transform -translate-y-1/2">
        {currentVideoIndex > 0 && (
          <button
            onClick={handlePrevVideo}
            className="bg-white/50 p-2 rounded-full hover:bg-white/75 transition-colors"
          >
            ↑ Previous
          </button>
        )}

        {(currentVideoIndex < allVideos.length - 1 || hasNextPage) && (
          <button
            onClick={handleNextVideo}
            className="bg-white/50 p-2 rounded-full hover:bg-white/75 transition-colors"
          >
            ↓ Next
          </button>
        )}
      </div>

      {/* Optional: Progress indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        {currentVideoIndex + 1} / {allVideos.length}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});
