import type { Db } from "./db.js";

export interface Link {
  slug: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  clicks: number;
}

interface LinkRow {
  slug: string;
  url: string;
  created_at: string;
  expires_at: string | null;
  clicks: number;
}

function toLink(row: LinkRow): Link {
  return {
    slug: row.slug,
    url: row.url,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    clicks: row.clicks,
  };
}

export class LinkRepo {
  constructor(private readonly db: Db) {}

  create(link: Omit<Link, "clicks">): Link | null {
    const result = this.db
      .prepare(
        "INSERT OR IGNORE INTO links (slug, url, created_at, expires_at) VALUES (?, ?, ?, ?)",
      )
      .run(link.slug, link.url, link.createdAt, link.expiresAt);
    return result.changes === 1 ? { ...link, clicks: 0 } : null;
  }

  find(slug: string): Link | null {
    const row = this.db.prepare("SELECT * FROM links WHERE slug = ?").get(slug) as
      | LinkRow
      | undefined;
    return row ? toLink(row) : null;
  }

  recordClick(slug: string): void {
    this.db.prepare("UPDATE links SET clicks = clicks + 1 WHERE slug = ?").run(slug);
  }

  delete(slug: string): boolean {
    return this.db.prepare("DELETE FROM links WHERE slug = ?").run(slug).changes === 1;
  }
}
