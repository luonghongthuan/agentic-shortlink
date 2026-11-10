# NNNN: <feature name>

Status: draft | approved | done
Owner: <human who approves the plan>

## Problem

One paragraph: who needs this and why. No solution here.

## Scope

In:

- ...

Out (do not build):

- ...

## Behaviour

Describe the observable behaviour as concrete examples. Prefer request/response pairs.

| Given | When | Then |
| --- | --- | --- |
| ... | ... | ... |

## Definition of done

Every line must be checkable by a machine or by reading one file.

- [ ] Tests in `test/<file>.test.ts` cover every row of the Behaviour table
- [ ] `pnpm check` passes (lint, typecheck, tests)
- [ ] No change to existing response fields unless listed under Behaviour
- [ ] README API section updated

## Risk

Reversible? Data migration? Public contract change? Pick the review level from AGENTS.md.

## Notes for the agent

Files likely to change, patterns to follow, traps.
