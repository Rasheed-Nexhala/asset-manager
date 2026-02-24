# Test-All-Features: Subagent Orchestration Plan

Based on `.cursor/skills/agentic-engineering`. This document explains how subagents are placed and why.

---

## Subagent Placement

| Phase | Subagent Type | Model | Why |
|-------|---------------|------|-----|
| 1. Feature analysis | **explore** | fast | Read-only codebase scan. No edits. Fast model saves tokens. Returns structured feature list. |
| 2. Setup | **shell** | fast | Install deps, create renderWithProviders, verify Jest runs. Must pass before first test. |
| 3. Write + run (loop) | **generalPurpose** + **shell** | inherit / fast | Write one test → run it → if passes, write next; if fails, fix or stop. |
| 4. Final coverage | **shell** | fast | Run `npm test -- --coverage`. |
| 5. Verify | **parent** | — | Synthesizes results, checks feature list vs coverage, decides stop/continue. |

---

## Why This Order

1. **Explore first** — Parent gets a scoped feature list. No need to re-scan the codebase when writing tests.

2. **Setup before first test** — Dependencies (`@testing-library/react-native`, `@testing-library/jest-native`), `renderWithProviders`, and Jest config must be in place. Run `npm test` once to confirm the suite runs. **Do not write the first test until setup passes.**

3. **Write → Run → Pass → Next** — For each feature in the list: write the test, run that specific test (e.g. `npm test -- --testPathPattern=authValidation`). If it passes, write the next test. If it fails, fix or stop. **Never write the next test until the current one passes.**

4. **Shell for verification** — Isolated command execution. Fast model.

5. **Parent synthesizes** — Compares `docs/feature-test-list.md` with coverage report. Decides if any features are missing or broken.

---

## Sync vs Parallel

- **Phase 1 → 2**: Sequential (need feature list before setup)
- **Phase 2 → 3**: Sequential (setup must pass before first test)
- **Phase 3**: Loop per feature — write test → run test → pass? → next. Sequential.
- **Phase 3 → 4**: Sequential (all tests written before full coverage run)
- **Phase 4 → 5**: Sequential (need coverage before verification)

All subagents run **synchronously** — parent waits for each to complete before proceeding.

---

## When to Stop and Ask User

The GeneralPurpose subagent must **STOP** and ask the user when:

- A function/component referenced in the feature list does not exist
- An edge case (e.g. null, empty array, error state) is not handled in the code
- A mock or test setup requires code that is not implemented

In that case: describe what is missing, provide a concrete solution (code snippet or steps), and wait for user to implement before continuing.
