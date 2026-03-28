import { XkcdComicSchema, type XkcdComic } from "../types/xkcd.js";

const XKCD_BASE_URL = "https://xkcd.com";

export class XkcdFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "XkcdFetchError";
  }
}

/**
 * Fetch a specific xkcd comic by number, or the latest if no number is given.
 */
export async function fetchXkcd(comicNumber?: number): Promise<XkcdComic> {
  const url = comicNumber
    ? `${XKCD_BASE_URL}/${comicNumber}/info.0.json`
    : `${XKCD_BASE_URL}/info.0.json`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new XkcdFetchError(
      `Network error fetching xkcd${comicNumber ? ` #${comicNumber}` : ""}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new XkcdFetchError(
        `xkcd #${comicNumber} not found`,
        404,
      );
    }
    throw new XkcdFetchError(
      `xkcd API returned ${response.status}: ${response.statusText}`,
      response.status,
    );
  }

  const data = await response.json();
  return XkcdComicSchema.parse(data);
}
