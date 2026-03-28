import { FetchXkcdInputSchema } from "../types/xkcd.js";
import { fetchXkcd, XkcdFetchError } from "../services/xkcd-fetch.js";

export const fetchXkcdTool = {
  name: "fetch_xkcd" as const,
  description:
    "Fetch an xkcd comic by number. Use your knowledge of xkcd to pick the most relevant " +
    "(and appropriately snarky) comic for the situation — whether it's a technical problem, " +
    "a codebase pattern, or a talk topic. Returns the comic's title, alt text, and image URL. " +
    "Omit comic_number to fetch the latest comic.",
  inputSchema: FetchXkcdInputSchema,

  async execute(input: unknown) {
    const parsed = FetchXkcdInputSchema.parse(input);

    try {
      const comic = await fetchXkcd(parsed.comic_number);

      const dateStr = `${comic.year}-${comic.month.padStart(2, "0")}-${comic.day.padStart(2, "0")}`;

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `xkcd #${comic.num}: ${comic.title}`,
              `Date: ${dateStr}`,
              `Image: ${comic.img}`,
              `Alt text: ${comic.alt}`,
              comic.transcript ? `Transcript: ${comic.transcript}` : null,
              `Link: https://xkcd.com/${comic.num}/`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    } catch (err) {
      if (err instanceof XkcdFetchError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `xkcd fetch error: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
      throw err;
    }
  },
};
