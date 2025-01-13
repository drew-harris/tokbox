import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/start";
import { commentsRoute } from "~/routes";

export const Comments = ({ videoId }: { videoId: string }) => {
  const comments = useServerFn(commentsRoute);

  const { data } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: () =>
      comments({
        data: {
          videoId: videoId,
        },
      }),
  });

  return (
    <div>
      {data?.comments.map((comment) => (
        <div
          className="p-2 bg-slate-800 m-1 max-w-[90vw] justify-between items-center border w-full rounded flex gap-2"
          key={comment.id}
        >
          <div>
            <div className="text-xs opacity-40">{comment.username}</div>
            <div className="">{comment.text}</div>
          </div>
          <div>
            <div className="text-xs opacity-40">
              {comment.date.toLocaleString()}
            </div>
            <div>{comment.likes} Likes</div>
          </div>
        </div>
      ))}
    </div>
  );
};
