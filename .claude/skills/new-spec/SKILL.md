---
name: new-spec
description: Turn a feature idea into a spec file in docs/specs using the template. Use when someone describes a feature that has no spec yet.
argument-hint: "<short feature description>"
---

Write a spec for: $ARGUMENTS

1. Read `docs/specs/TEMPLATE.md` and the two most recent specs for tone and level of detail.
2. Read the code the feature will touch, so the Behaviour table uses real routes, fields and error codes.
3. Ask the human up to five questions where the idea is ambiguous (limits, error codes, what is out of scope). Wait for answers.
4. Create `docs/specs/NNNN-<kebab-name>.md` with the next free number. Status: draft.
   - Behaviour: concrete request/response rows, including at least two failure rows.
   - Definition of done: only items a machine or a single file read can check.
   - Risk: say whether it is reversible and which review level from AGENTS.md applies.
5. Do not write any code. Show the spec and stop.
