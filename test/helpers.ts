import { createApp } from "../src/app.js";
import { openDb } from "../src/db.js";
import { LinkRepo } from "../src/repo.js";

export const ADMIN_KEY = "test-admin-key";

export function makeApp(start = new Date("2026-01-01T00:00:00Z")) {
  let current = start;
  const repo = new LinkRepo(openDb(":memory:"));
  const app = createApp({
    repo,
    baseUrl: "http://sho.rt",
    adminApiKey: ADMIN_KEY,
    now: () => current,
  });
  const advance = (ms: number) => {
    current = new Date(current.getTime() + ms);
  };
  const post = (body: unknown) =>
    app.request("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { app, repo, advance, post };
}
