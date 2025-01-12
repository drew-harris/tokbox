import { sql } from "drizzle-orm";
import type { ArgValues } from "..";
import { db, schema } from "../db";

type TiktokVid = { Date: string; Link: string };
export type TiktokData = {
  Activity: {
    "Favorite Videos": {
      FavoriteVideoList: TiktokVid[];
    };
    "Like List": {
      ItemFavoriteList: { date: string; link: string }[];
    };
    "Video Browsing History": {
      VideoList: TiktokVid[];
    };
  };
};
export const getTiktokDataFromFile = async (filepath: string) => {
  const raw = await Bun.file(filepath).text();
  const jsonValue = (await JSON.parse(raw)) as TiktokData;
  return jsonValue;
};

export type BaseVideo = {
  date: string;
  link: string;
};

export const applyFilters = (args: ArgValues, data: TiktokData) => {
  const result: BaseVideo[] = [];
  if (args.type === "liked") {
    result.push(...data.Activity["Like List"].ItemFavoriteList);
  }

  if (args.type === "saved") {
    result.push(
      ...data.Activity["Favorite Videos"].FavoriteVideoList.map((v) => ({
        date: v.Date,
        link: v.Link,
      })),
    );
  }

  if (args.type === "watched") {
    result.push(
      ...data.Activity["Video Browsing History"].VideoList.map((v) => ({
        date: v.Date,
        link: v.Link,
      })),
    );
  }

  return result;
};

export function parseTiktokTime(dateTimeString: string): Date {
  try {
    const [datePart, timePart] = dateTimeString.trim().split(/\s+/);

    if (!datePart || !timePart) {
      throw new Error("Invalid date time format");
    }

    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);

    if ([year, month, day, hours, minutes, seconds].some(isNaN)) {
      throw new Error("Invalid date time components");
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);

    // Validate the date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date;
  } catch (error: any) {
    throw new Error(`Failed to parse date time: ${error.message}`);
  }
}
