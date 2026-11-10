# 0002: Daily click stats

Status: approved (exercise for readers; reference solution on branch `solution/0002-daily-stats`)
Owner: maintainer

## Problem

A single click counter cannot show whether a campaign is still getting traffic. Owners want clicks per day.

## Scope

In:

- Record each successful redirect with its UTC date
- `GET /api/links/:slug/stats/daily?days=N` returns the last N days (default 7, max 90), oldest first, including days with zero clicks

Out (do not build):

- Per-hour buckets, referrers, user agents, IP addresses (no personal data is stored)
- Backfilling history for clicks recorded before this change

## Behaviour

| Given | When | Then |
| --- | --- | --- |
| link `promo` clicked twice on 2026-01-01 and once on 2026-01-03; now = 2026-01-03 | `GET /api/links/promo/stats/daily?days=3` | 200 `{ "slug": "promo", "days": [{"date":"2026-01-01","clicks":2},{"date":"2026-01-02","clicks":0},{"date":"2026-01-03","clicks":1}] }` |
| no `days` param | same request | 7 entries |
| `days=0`, `days=91`, `days=abc` | same request | 400 `invalid_request` |
| unknown slug | same request | 404 `not_found` |
| expired link visited | `GET /:slug` | 410, no row recorded (same rule as spec 0001) |

## Definition of done

- [ ] New table `link_clicks (slug TEXT, day TEXT, clicks INTEGER, PRIMARY KEY (slug, day))`, created in `openDb`
- [ ] Redirect increments both `links.clicks` and today's `link_clicks` row in one transaction
- [ ] `test/daily-stats.test.ts` covers every row above with the injected clock
- [ ] Deleting a link deletes its daily rows
- [ ] `pnpm check` passes; README API section updated

## Risk

Medium: new table and a write on the hot redirect path. Reversible: the table can be dropped without touching `links`.

## Notes for the agent

- Use an upsert: `INSERT ... ON CONFLICT(slug, day) DO UPDATE SET clicks = clicks + 1`.
- Build the zero-filled day list in TypeScript, not SQL; keep it a pure function with its own unit test.
