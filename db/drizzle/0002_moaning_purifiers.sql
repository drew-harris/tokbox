CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"text" text NOT NULL,
	"video_id" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"username" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;