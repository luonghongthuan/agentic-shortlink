import { Hono } from "hono";
import { z } from "zod";
import { generateSlug, isValidCustomSlug } from "./lib/slug.js";
import type { Link, LinkRepo } from "./repo.js";

export interface AppDeps {
  repo: LinkRepo;
  baseUrl: string;
  adminApiKey: string;
  now?: () => Date;
}

const CreateLinkSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  slug: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const MAX_SLUG_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isExpired(link: Link, now: Date): boolean {
  return link.expiresAt !== null && new Date(link.expiresAt).getTime() <= now.getTime();
}

export function createApp({ repo, baseUrl, adminApiKey, now = () => new Date() }: AppDeps) {
  const app = new Hono();
  const shortUrl = (slug: string) => `${baseUrl.replace(/\/$/, "")}/${slug}`;

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/api/links", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    }
    const { url, slug: customSlug, expiresInDays } = parsed.data;
    if (customSlug !== undefined && !isValidCustomSlug(customSlug)) {
      return c.json({ error: "invalid_slug" }, 400);
    }

    const createdAt = now();
    const expiresAt = expiresInDays
      ? new Date(createdAt.getTime() + expiresInDays * DAY_MS).toISOString()
      : null;

    const attempts = customSlug ? 1 : MAX_SLUG_ATTEMPTS;
    for (let i = 0; i < attempts; i++) {
      const slug = customSlug ?? generateSlug();
      const link = repo.create({ slug, url, createdAt: createdAt.toISOString(), expiresAt });
      if (link) {
        return c.json({ ...link, shortUrl: shortUrl(slug) }, 201);
      }
    }
    return c.json({ error: "slug_taken" }, 409);
  });

  app.get("/api/links/:slug", (c) => {
    const link = repo.find(c.req.param("slug"));
    if (!link) return c.json({ error: "not_found" }, 404);
    return c.json({ ...link, shortUrl: shortUrl(link.slug), expired: isExpired(link, now()) });
  });

  app.delete("/api/links/:slug", (c) => {
    if (c.req.header("x-api-key") !== adminApiKey) {
      return c.json({ error: "unauthorized" }, 401);
    }
    return repo.delete(c.req.param("slug"))
      ? c.body(null, 204)
      : c.json({ error: "not_found" }, 404);
  });

  app.get("/:slug", (c) => {
    const link = repo.find(c.req.param("slug"));
    if (!link) return c.json({ error: "not_found" }, 404);
    if (isExpired(link, now())) return c.json({ error: "expired" }, 410);
    repo.recordClick(link.slug);
    return c.redirect(link.url, 302);
  });

  return app;
}
