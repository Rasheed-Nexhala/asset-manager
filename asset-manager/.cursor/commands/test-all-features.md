# Test All Features

Execute the full Asset Manager test strategy. Follow `docs/testing-order.md` and `.cursor/skills/asset-manager-testing`. Subagent plan: `docs/test-all-subagent-plan.md`.

## Subagent Orchestration

1. **Explore subagent** (fast, readonly): Analyze `src/` — map all features, functions, components, screens, Redux slices, hooks, utils. Output a complete feature list to `docs/feature-test-list.md` with file paths and test targets.

2. **Shell subagent** (setup): Before writing any test, ensure all dependencies are set: `@testing-library/react-native`, `@testing-library/jest-native` installed; `src/__tests__/utils/renderWithProviders.tsx` exists; Jest `setupFilesAfterFramework` includes jest-native. Run `npm test` once to confirm the suite runs. **Do not write the first test until setup passes.**

3. **GeneralPurpose + Shell subagent** (loop): For each item in the feature list (Level 1 → 8), one at a time:
   - Write the test (or test file) for that item.
   - Run that specific test (e.g. `npm test -- --testPathPattern=authValidation`).
   - **If it passes** → proceed to write the next test.
   - **If it fails** → fix the test or stop and ask user. Do NOT write the next test until the current one passes.
   - **If code or edge case is not implemented, STOP** — ask the user to implement it and provide a concrete solution.

4. **Shell subagent** (final): Run `npm test -- --coverage`. Report failures and coverage gaps.

5. **Parent**: Verify every feature from `docs/feature-test-list.md` is covered. If any are missing or tests fail, report and stop. Ensure no feature or functionality is broken.

## Rules

- Dependencies and setup must pass before writing the first test.
- Write the next test only after the written test passes.
- Create `src/__tests__/utils/renderWithProviders.tsx` during setup if it does not exist.
- Use `getByRole` / `getByAccessibilityLabel` before `getByTestId`.
- Add `testID` only when other queries fail.
- One assertion per test; descriptive test names.
