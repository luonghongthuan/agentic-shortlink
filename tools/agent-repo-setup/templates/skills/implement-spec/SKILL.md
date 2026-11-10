---
name: implement-spec
description: Implement an approved spec from docs/specs end to end - plan, task table, test-first changes, full gate, self-review. Use when asked to build a feature that has a spec.
argument-hint: "<spec number or path>"
---

Implement spec $ARGUMENTS.

## 1. Plan (no edits)

- Read the spec, AGENTS.md and every file the spec's Notes mention.
- Write `docs/tasks/<spec-file-name>.md` with a table: `# | Task | Files | Check | Depends on`. Each task fits one focused run and has a command that proves it is done.
- Mark which tasks can run in parallel (no shared files).
- Show the table and wait for the human to approve it.

## 2. Execute, one task at a time

1. Write or extend the test for that task. Run it (`{{TEST_ONE}}`) and confirm it fails for the right reason.
2. Make the smallest change that passes it.
3. Run the task's Check command. Do not move on while it is red.

## 3. Verify

- The full gate must pass: `{{GATE}}`.
- If the change has a UI or an endpoint, exercise one Behaviour row for real (a test, or the running app) and say how.

## 4. Review

- Run the `reviewer` subagent, then pass its findings to the `refuter` subagent.
- Fix every CONFIRMED finding and re-run the gate.

## 5. Report

Tick the spec's Definition of done boxes that are now true, then reply with:
- Done and verified: each item with the command that proved it
- Done, not verified: and why
- Skipped: and why
- Suggested commit message (Conventional Commits)

Do not push.
