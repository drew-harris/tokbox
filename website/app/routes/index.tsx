import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/start";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "~/db";

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
      .orderBy(desc(schema.videos.date))
      .limit(data.limit)
      .offset(data.offset);
    return {
      videos: videos,
      nextOffset: videos.length + data.offset,
    };
  });

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const callsomething = useServerFn(something);
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ["videos"],
    maxPages: 2,
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

  return (
    <div className="p-2">
      <h3>Welcome Home!!!</h3>
      {JSON.stringify(data?.pages)}
      <button
        onClick={() => {
          fetchNextPage();
        }}
      >
        Fetch More
      </button>
    </div>
  );
}
