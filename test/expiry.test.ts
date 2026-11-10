import { describe, expect, it } from "vitest";
import { makeApp } from "./helpers.js";

const DAY = 24 * 60 * 60 * 1000;

describe("link expiry (spec 0001)", () => {
  it("sets expiresAt from expiresInDays", async () => {
    const { post } = makeApp(new Date("2026-01-01T00:00:00Z"));
    const body = await (await post({ url: "https://example.com", expiresInDays: 7 })).json();
    expect(body.expiresAt).toBe("2026-01-08T00:00:00.000Z");
  });

  it("redirects before expiry and returns 410 after", async () => {
    const { app, post, advance } = makeApp();
    await post({ url: "https://example.com", slug: "soon", expiresInDays: 1 });
    expect((await app.request("/soon")).status).toBe(302);
    advance(DAY);
    expect((await app.request("/soon")).status).toBe(410);
  });

  it("does not count clicks on expired links", async () => {
    const { app, post, advance } = makeApp();
    await post({ url: "https://example.com", slug: "old", expiresInDays: 1 });
    advance(2 * DAY);
    await app.request("/old");
    const stats = await (await app.request("/api/links/old")).json();
    expect(stats).toMatchObject({ clicks: 0, expired: true });
  });
});
