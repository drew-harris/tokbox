import { pgTable, timestamp, boolean, text } from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  date: timestamp("date", { mode: "date" }).notNull(),
  file_name: text("file_name").notNull(),
  liked: boolean("liked").notNull().default(false),
  saved: boolean("saved").notNull().default(false),
});

export const watched = pgTable("watched", {
  link: text("link").primaryKey().notNull(),
  date: text("date").notNull(),
})
