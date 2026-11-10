import { describe, expect, it } from "vitest";
import { ADMIN_KEY, makeApp } from "./helpers.js";

describe("POST /api/links", () => {
  it("creates a link with a generated slug", async () => {
    const { post } = makeApp();
    const res = await post({ url: "https://example.com/a" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toMatch(/^[0-9a-zA-Z]{7}$/);
    expect(body.shortUrl).toBe(`http://sho.rt/${body.slug}`);
    expect(body.expiresAt).toBeNull();
  });

  it("accepts a custom slug once", async () => {
    const { post } = makeApp();
    expect((await post({ url: "https://example.com", slug: "docs" })).status).toBe(201);
    expect((await post({ url: "https://example.com", slug: "docs" })).status).toBe(409);
  });

  it.each([
    [{ url: "not a url" }],
    [{ url: "ftp://example.com" }],
    [{ url: "https://example.com", slug: "a" }],
    [{ url: "https://example.com", slug: "api" }],
    [{ url: "https://example.com", expiresInDays: 0 }],
  ])("rejects invalid input %j", async (input) => {
    const { post } = makeApp();
    expect((await post(input)).status).toBe(400);
  });
});

describe("GET /:slug", () => {
  it("redirects and counts clicks", async () => {
    const { app, post } = makeApp();
    await post({ url: "https://example.com/x", slug: "x1x" });
    const res = await app.request("/x1x");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/x");
    const stats = await (await app.request("/api/links/x1x")).json();
    expect(stats.clicks).toBe(1);
  });

  it("returns 404 for unknown slugs", async () => {
    const { app } = makeApp();
    expect((await app.request("/nope")).status).toBe(404);
  });
});

describe("DELETE /api/links/:slug", () => {
  it("requires the admin key", async () => {
    const { app, post } = makeApp();
    await post({ url: "https://example.com", slug: "gone" });
    expect((await app.request("/api/links/gone", { method: "DELETE" })).status).toBe(401);
    const ok = await app.request("/api/links/gone", {
      method: "DELETE",
      headers: { "x-api-key": ADMIN_KEY },
    });
    expect(ok.status).toBe(204);
    expect((await app.request("/gone")).status).toBe(404);
  });
});
