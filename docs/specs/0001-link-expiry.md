# 0001: Link expiry

Status: done
Owner: maintainer

## Problem

Campaign links should stop working after a campaign ends. Today every link lives forever.

## Scope

In:

- Optional `expiresInDays` (1 to 365) when creating a link
- Expired links stop redirecting
- Stats show whether a link has expired

Out (do not build):

- Changing the expiry of an existing link
- Background cleanup of expired rows
- Time zones other than UTC

## Behaviour

| Given | When | Then |
| --- | --- | --- |
| now = 2026-01-01T00:00Z | `POST /api/links {url, expiresInDays: 7}` | 201, `expiresAt = 2026-01-08T00:00:00.000Z` |
| no `expiresInDays` | create | `expiresAt = null`, never expires |
| `expiresInDays: 0` or `366` | create | 400 `invalid_request` |
| link expires in 1 day | `GET /:slug` before expiry | 302 to the target URL |
| link expired (now >= expiresAt) | `GET /:slug` | 410 `{ "error": "expired" }`, click not counted |
| link expired | `GET /api/links/:slug` | 200 with `expired: true` |

## Definition of done

- [x] `test/expiry.test.ts` covers every row above, using an injected clock (no real timers)
- [x] `pnpm check` passes
- [x] Existing fields in responses unchanged; `expiresAt` and `expired` added
- [x] README API section updated

## Risk

Medium: adds a nullable column (`expires_at`) and a new status code on a public route. Reversible: the column is nullable and ignored by old code.

## Notes for the agent

- Inject time through `createApp({ now })`; never call `Date.now()` in route handlers.
- Keep the expiry check in one exported function (`isExpired`) so stats and redirect agree.
