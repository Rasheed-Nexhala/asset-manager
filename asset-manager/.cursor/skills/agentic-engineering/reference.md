# Agentic Engineering Reference

Detailed examples of orchestration patterns, subagent templates, and prompt structures.

---

## Custom Subagent Templates

### Readonly Explorer (cheapest)

```yaml
---
name: feature-explorer
model: fast
description: Explores codebase to map a feature's components, services, and data flow. Use when onboarding to a feature or before planning changes.
readonly: true
---

You are a codebase explorer. Given a feature name:

1. Use codebase_search and grep to find all related files
2. Read key files (components, services, models, routes)
3. Map the data flow: API → service → repository → component → template
4. Return a structured report with file paths and relationships

Do NOT modify any files.
```

### Code Reviewer (readonly, capable)

```yaml
---
name: code-reviewer
model: inherit
description: Reviews code changes for quality, patterns, and bugs. Use when the user asks for a review or before merging.
readonly: true
---

Review the current changes for:
1. Correctness and edge cases
2. Angular best practices (signals, OnPush, inject())
3. Accessibility (ARIA, focus, contrast)
4. Token-efficient: only read the changed files
```

### Test Runner (fast, shell-focused)

```yaml
---
name: test-runner
model: fast
description: Runs tests and reports results. Use when verifying changes compile and tests pass.
---

1. Run `ng build` and report errors
2. Run `ng test --watch=false` and report failures
3. If failures found, read the failing test file and the source file
4. Suggest fixes but do NOT apply them without user confirmation
```

### Translation Auditor (fast, readonly)

```yaml
---
name: translation-auditor
model: fast
description: Audits translation files for missing or mismatched keys. Use when adding translations or before releases.
readonly: true
---

1. Read src/assets/i18n/en.json and src/assets/i18n/nb.json
2. Compare all keys — find keys in en.json missing from nb.json and vice versa
3. Use grep to find hardcoded strings in .html templates not using transloco
4. Report findings as a checklist
```

---

## Orchestration Recipes

### Recipe 1: Full Feature Implementation

```
Prompt sequence (4 conversations):

1. /plan — "I need to add a booking feature with CRUD operations"
   → Agent creates plan with file list, component hierarchy, API endpoints
   → Save plan to .cursor/plans/

2. New chat — "Analyze the backend for the Booking feature"
   → Uses backend-api-analyzer subagent (readonly, fast)
   → Returns endpoint report

3. New chat — "Implement the booking service and store based on this plan: @.cursor/plans/booking.md"
   → Uses angular-service-creator + elf-store-creator
   → Creates service, repository, models

4. New chat — "Create the booking component following @.cursor/plans/booking.md"
   → Uses Angular-Component-Creator
   → Creates components with proper styling
```

**Token benefit:** Each chat starts fresh with only the context it needs. Plans persist as files.

### Recipe 2: Bug Fix with Evidence

```
Prompt:
1. Use codebase_search to find the component handling [feature]
2. Read the component and its template
3. Use browser_navigate to http://localhost:4200/[page]
4. Use browser_snapshot to capture current state
5. Reproduce the bug: [specific steps using browser_click, browser_fill]
6. Use browser_console_messages to check for errors
7. Based on evidence, identify the root cause
8. Use the ask question tool to confirm the fix approach
9. Edit the files to fix the bug
10. Use browser_navigate to verify the fix
```

### Recipe 3: Codebase-Wide Refactor

```
Step 1 (explore subagent, readonly, fast):
"Use grep to find all components using *ngIf. List each file path and line number."

Step 2 (parent agent):
"For each file found, replace *ngIf with @if control flow syntax.
Process files one at a time. After each file, run ng build to verify."

Step 3 (test-runner subagent, fast):
"Run ng test --watch=false and report any failures."
```

### Recipe 4: Multi-Model Comparison

```
Run in parallel (worktree mode):
- Model A: "Refactor ApplicationComponent to use signals instead of BehaviorSubjects"
- Model B: Same prompt
- Model C: Same prompt

Compare results → pick best → apply to main branch
```

---

## Prompt Templates by Orchestration Pattern

### Plan-First Template

```
I need to [high-level goal].

Before coding:
1. Research the codebase to understand the current implementation
2. Identify all files that will need changes
3. Create a step-by-step plan with file paths
4. Ask me any clarifying questions

Do NOT make any code changes yet.
```

### Subagent Pipeline Template

```
This is a two-phase task:

Phase 1 (Research — readonly):
Use codebase_search and grep to find [what you need].
Read the relevant files and summarize [specific information].

Phase 2 (Implementation):
Based on the research, [implement changes].
Use [specific tool] to verify.
```

### Verify Loop Template

```
Make [specific change] in [file].

Then verify:
1. Run ng build — fix any compilation errors
2. Run ng test --watch=false — fix any test failures
3. Use browser_navigate to [url] and browser_snapshot to check the UI
4. Repeat until all checks pass
```

### Token-Efficient Exploration Template

```
I need to understand [feature/concept] in this codebase.

Use codebase_search (not grep) to find the most relevant 3-5 files.
Read only those files. Do NOT read unrelated files.
Summarize:
- Key files and their roles
- Data flow (API → service → component)
- Any patterns or conventions used
```

---

## Context Budget Planning

For a complex task, estimate token budget before starting:

```
Available: 200,000 tokens

Allocate:
- System prompt + rules:     ~5,000 (always present)
- Skills (if loaded):        ~3,000 (loaded on demand)
- Conversation history:       ~4,000 per turn (accumulates)
- File reads:                 ~3,000 per 500-line file
- Search results:             ~1,000 per search call
- Agent reasoning:           ~2,000 per response
- Safety buffer:             ~20,000

Budget for a 10-turn conversation:
  5,000 + 3,000 + 40,000 + (5 files × 3,000) + (10 searches × 1,000) + (10 × 2,000) + 20,000
  = 5,000 + 3,000 + 40,000 + 15,000 + 10,000 + 20,000 + 20,000
  = 113,000 tokens used → 87,000 remaining for complex reasoning
```

**If approaching limit:** Start a new conversation and reference past work with `@Past Chats`.

---

## Decision Matrix: When to Use What

| Situation | Approach |
|-----------|----------|
| Simple code change | Direct agent, no subagents |
| Multi-file feature | Plan Mode → subagent pipeline |
| Bug investigation | Debug Mode or browser-assisted agent |
| Codebase understanding | Readonly explore subagent (fast model) |
| Large refactor | Parallel subagents per module |
| Architecture decision | Multi-model comparison |
| Repetitive workflow | Custom command (`.cursor/commands/`) |
| Domain knowledge | Custom skill (`.cursor/skills/`) |
| Specialized agent behavior | Custom subagent (`.cursor/agents/`) |
| Post-edit automation | Hooks (`.cursor/hooks.json`) |
