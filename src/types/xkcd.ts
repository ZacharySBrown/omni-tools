import { z } from "zod";

export const FetchXkcdInputSchema = z.object({
  comic_number: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Specific xkcd comic number to fetch. Omit to get the latest comic."),
});
export type FetchXkcdInput = z.infer<typeof FetchXkcdInputSchema>;

export const XkcdComicSchema = z.object({
  num: z.number(),
  title: z.string(),
  safe_title: z.string(),
  alt: z.string(),
  img: z.string(),
  year: z.string(),
  month: z.string(),
  day: z.string(),
  transcript: z.string().optional(),
  link: z.string().optional(),
  news: z.string().optional(),
});
export type XkcdComic = z.infer<typeof XkcdComicSchema>;
