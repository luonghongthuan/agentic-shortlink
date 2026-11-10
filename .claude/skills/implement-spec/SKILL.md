---
name: implement-spec
description: Implement an approved spec from docs/specs end to end - plan, task table, test-first changes, full check, self-review. Use when asked to build a feature that has a spec.
argument-hint: "<spec number or path>"
---

Implement spec $ARGUMENTS.

## 1. Plan (no edits)

- Read the spec, AGENTS.md and every file the spec's Notes mention.
- Write `docs/tasks/<spec-file-name>.md` with a table: `# | Task | Files | Check | Depends on`. Each task fits one focused run and has a command that proves it is done.
- Mark which tasks can run in parallel (no shared files).
- Show the table and wait for the human to approve it.

## 2. Execute, one task at a time

For each task:

1. Write or extend the test for that task. Run it and confirm it fails for the right reason.
2. Make the smallest change that passes it.
3. Run the task's Check command. Do not move on while it is red.

## 3. Verify

- `pnpm check` must pass.
- If the change touches a route, start the server (`pnpm dev` with a temp `DATABASE_PATH`) and exercise one Behaviour row with curl-equivalent `app.request` in a test, not by hand.

## 4. Review

- Run the `reviewer` subagent, then pass its findings to the `refuter` subagent.
- Fix every CONFIRMED finding, re-run `pnpm check`.

## 5. Report

Tick the spec's Definition of done boxes that are now true. Then reply with:

- Done and verified: each item with the command that proved it
- Done, not verified: and why
- Skipped: and why
- Suggested commit message (Conventional Commits)

Do not push.
