import { describe, expect, it } from "vitest";
import { fillDays, lastNDays } from "../src/lib/days.js";
import { ADMIN_KEY, makeApp } from "./helpers.js";

const DAY = 24 * 60 * 60 * 1000;

describe("lastNDays / fillDays", () => {
  it("lists N UTC days ending today, oldest first", () => {
    expect(lastNDays(new Date("2026-01-03T23:59:00Z"), 3)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("fills missing days with zero", () => {
    expect(fillDays(["2026-01-01", "2026-01-02"], new Map([["2026-01-02", 4]]))).toEqual([
      { date: "2026-01-01", clicks: 0 },
      { date: "2026-01-02", clicks: 4 },
    ]);
  });
});

describe("GET /api/links/:slug/stats/daily (spec 0002)", () => {
  it("returns zero-filled daily clicks, oldest first", async () => {
    const { app, post, advance } = makeApp(new Date("2026-01-01T10:00:00Z"));
    await post({ url: "https://example.com", slug: "promo" });
    await app.request("/promo");
    await app.request("/promo");
    advance(2 * DAY);
    await app.request("/promo");

    const res = await app.request("/api/links/promo/stats/daily?days=3");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      slug: "promo",
      days: [
        { date: "2026-01-01", clicks: 2 },
        { date: "2026-01-02", clicks: 0 },
        { date: "2026-01-03", clicks: 1 },
      ],
    });
  });

  it("defaults to 7 days", async () => {
    const { app, post } = makeApp();
    await post({ url: "https://example.com", slug: "week" });
    const body = await (await app.request("/api/links/week/stats/daily")).json();
    expect(body.days).toHaveLength(7);
  });

  it.each(["0", "91", "abc"])("rejects days=%s", async (days) => {
    const { app, post } = makeApp();
    await post({ url: "https://example.com", slug: "bad" });
    expect((await app.request(`/api/links/bad/stats/daily?days=${days}`)).status).toBe(400);
  });

  it("returns 404 for unknown slugs", async () => {
    const { app } = makeApp();
    expect((await app.request("/api/links/nope/stats/daily")).status).toBe(404);
  });

  it("does not record clicks on expired links", async () => {
    const { app, post, advance } = makeApp(new Date("2026-01-01T00:00:00Z"));
    await post({ url: "https://example.com", slug: "old", expiresInDays: 1 });
    advance(DAY);
    expect((await app.request("/old")).status).toBe(410);
    const body = await (await app.request("/api/links/old/stats/daily?days=2")).json();
    expect(body.days.every((d: { clicks: number }) => d.clicks === 0)).toBe(true);
  });

  it("deletes daily rows with the link", async () => {
    const { app, post, repo } = makeApp(new Date("2026-01-01T00:00:00Z"));
    await post({ url: "https://example.com", slug: "tmp" });
    await app.request("/tmp");
    await app.request("/api/links/tmp", { method: "DELETE", headers: { "x-api-key": ADMIN_KEY } });
    expect(repo.dailyClicks("tmp", "2026-01-01", "2026-01-01").size).toBe(0);
  });
});
