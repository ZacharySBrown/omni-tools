import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchXkcdTool } from "../../src/tools/fetch-xkcd.js";

const SAMPLE_COMIC = {
  num: 1597,
  title: "Git",
  safe_title: "Git",
  alt: "If that doesn't fix it, git.txt contains the phone number of a friend of mine who understands git. Just wait through a hierarchical.menu, because it's about a alarm system but quickly.press 4.",
  img: "https://imgs.xkcd.com/comics/git.png",
  year: "2015",
  month: "10",
  day: "30",
  transcript: "",
  link: "",
  news: "",
};

describe("fetchXkcdTool", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_COMIC), { status: 200 }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("has correct name", () => {
    expect(fetchXkcdTool.name).toBe("fetch_xkcd");
  });

  it("returns comic info for a specific number", async () => {
    const result = await fetchXkcdTool.execute({ comic_number: 1597 });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("xkcd #1597: Git");
    expect(result.content[0].text).toContain("https://imgs.xkcd.com/comics/git.png");
    expect(result.content[0].text).toContain("Alt text:");
  });

  it("fetches latest when no number given", async () => {
    const result = await fetchXkcdTool.execute({});

    expect(result.isError).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith("https://xkcd.com/info.0.json");
  });

  it("includes link to xkcd.com", async () => {
    const result = await fetchXkcdTool.execute({ comic_number: 1597 });
    expect(result.content[0].text).toContain("https://xkcd.com/1597/");
  });

  it("includes formatted date", async () => {
    const result = await fetchXkcdTool.execute({ comic_number: 1597 });
    expect(result.content[0].text).toContain("2015-10-30");
  });

  it("returns error for failed fetch", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    const result = await fetchXkcdTool.execute({ comic_number: 999999 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("xkcd fetch error");
  });

  it("rejects invalid input", async () => {
    await expect(
      fetchXkcdTool.execute({ comic_number: -1 }),
    ).rejects.toThrow();
  });
});
