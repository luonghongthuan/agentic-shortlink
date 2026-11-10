import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { LinkRepo } from "./repo.js";

const config = loadConfig();
const db = openDb(config.DATABASE_PATH);
const app = createApp({
  repo: new LinkRepo(db),
  baseUrl: config.BASE_URL,
  adminApiKey: config.ADMIN_API_KEY,
});

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`shortlink listening on http://localhost:${info.port}`);
});
