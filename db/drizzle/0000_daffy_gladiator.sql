CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"file_name" text NOT NULL,
	"liked" boolean DEFAULT false NOT NULL,
	"saved" boolean DEFAULT false NOT NULL
);
