import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchXkcd, XkcdFetchError } from "../../src/services/xkcd-fetch.js";

const SAMPLE_COMIC = {
  num: 927,
  title: "Standards",
  safe_title: "Standards",
  alt: "Fortunately, the charging one has been solved now that we've all standardized on mini-USB. Or is it micro-USB? Shit.",
  img: "https://imgs.xkcd.com/comics/standards.png",
  year: "2011",
  month: "7",
  day: "20",
  transcript: "",
  link: "",
  news: "",
};

describe("fetchXkcd (unit tests with mocked fetch)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches a specific comic by number", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_COMIC), { status: 200 }),
    );

    const comic = await fetchXkcd(927);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xkcd.com/927/info.0.json",
    );
    expect(comic.num).toBe(927);
    expect(comic.title).toBe("Standards");
    expect(comic.alt).toContain("mini-USB");
  });

  it("fetches the latest comic when no number given", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_COMIC), { status: 200 }),
    );

    await fetchXkcd();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xkcd.com/info.0.json",
    );
  });

  it("throws XkcdFetchError on 404", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    await expect(fetchXkcd(99999)).rejects.toThrow(XkcdFetchError);
    await expect(fetchXkcd(99999)).rejects.toThrow("not found");
  });

  it("throws XkcdFetchError on server error", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("Error", { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(fetchXkcd(1)).rejects.toThrow(XkcdFetchError);
    await expect(fetchXkcd(1)).rejects.toThrow("500");
  });

  it("throws XkcdFetchError on network failure", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("DNS resolution failed"));

    await expect(fetchXkcd(1)).rejects.toThrow(XkcdFetchError);
    await expect(fetchXkcd(1)).rejects.toThrow("Network error");
  });

  it("parses all expected fields from the response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_COMIC), { status: 200 }),
    );

    const comic = await fetchXkcd(927);

    expect(comic.num).toBe(927);
    expect(comic.title).toBe("Standards");
    expect(comic.safe_title).toBe("Standards");
    expect(comic.img).toContain("https://");
    expect(comic.year).toBe("2011");
    expect(comic.month).toBe("7");
    expect(comic.day).toBe("20");
  });
});
