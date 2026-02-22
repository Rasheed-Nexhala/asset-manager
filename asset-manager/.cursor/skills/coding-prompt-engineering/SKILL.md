---
name: coding-prompt-engineering
description: Write effective prompts for AI coding agents that produce accurate, first-attempt output. Covers prompt structure, context engineering, hallucination prevention, task templates, and verification patterns. Use when writing prompts for Cursor, planning coding tasks, troubleshooting bad AI output, or when the user asks about prompt engineering, prompt optimization, or how to get better results from the agent.
---

# Coding Prompt Engineering

Write prompts that produce accurate, efficient output from coding agents on the first attempt.

## The Core Framework: Objective → Context → Constraints → Verification

Every effective coding prompt has four parts. Missing any one degrades output quality.

### 1. Objective — WHAT, not HOW

State the desired outcome. Let the agent figure out implementation.

- **Weak**: "Open src/auth/middleware.ts, find validateToken, add a try-catch around jwt.verify, return 401"
- **Strong**: "The validateToken middleware crashes on expired JWTs. Fix it to return 401 instead of crashing."

The weak prompt micromanages. The strong prompt describes the problem and desired outcome — the agent may find a better solution than try-catch.

### 2. Context — what the agent needs to know

The agent can search your codebase but doesn't know your business logic, preferences, or conventions.

**Always include:**
- Current behavior vs desired behavior
- Relevant file paths (if known)
- Tech stack specifics (library versions, patterns in use)

**Don't include:**
- Every file in the project (let the agent search)
- General programming knowledge (the agent already knows)

### 3. Constraints — guardrails

- "Don't modify the public API"
- "Don't install new dependencies"
- "Use existing patterns from the codebase"
- "Use Transloco for all user-facing strings"

### 4. Verification — how to confirm success

This is the part most people skip. It's the most important for agents.

- "Run ng build to verify compilation"
- "Run ng test --watch=false"
- "Use browser_navigate and browser_snapshot to check the UI"
- "Read en.json and nb.json to confirm keys match"

## Structured Prompt Format

Use sections, not paragraphs. Agents parse structure more reliably.

```
Goal: [one sentence — what "done" looks like]

Context:
- Current behavior: [what happens now]
- Desired behavior: [what should happen]
- Files: [relevant paths if known]

Constraints:
- [rule 1]
- [rule 2]

Acceptance Criteria:
1. [testable condition]
2. [testable condition]

Verification:
- [command or tool to run]
```

## Task-Specific Templates

### Feature Implementation

```
Goal: Add [feature] to [component/module].

Context:
- Similar feature exists in [reference component] — follow its patterns
- Backend endpoint: [method] [url] returning [shape]
- This is a [standalone/module] component using [state approach]

Constraints:
- Use inject() for DI, signals for state, @if/@for in templates
- Use Tailwind for styling, Transloco for strings
- Follow OnPush change detection

Acceptance Criteria:
1. [functional requirement]
2. [functional requirement]
3. No compilation errors

Verification: Run ng build. Use browser_navigate to [url] and browser_snapshot to verify.
```

### Bug Fix

```
Goal: Fix [symptom] in [component/page].

Context:
- Current: [what happens — error message, wrong behavior]
- Expected: [what should happen]
- Reproduction: [steps or URL]

Constraints:
- Don't change unrelated functionality
- Preserve existing tests

Verification: Run ng test. Use browser_navigate to reproduce and confirm fix.
```

### Refactoring

```
Goal: Refactor [target] to [new pattern].

Context:
- Current pattern: [what it uses now]
- Target pattern: [what it should use]
- Scope: [these files only / entire module]

Constraints:
- Don't change public API / component inputs/outputs
- Existing tests must still pass
- Process one file at a time

Verification: Run ng build after each file. Run ng test when done.
```

### Exploration / Understanding

```
Goal: Explain how [feature] works in this codebase.

Context:
- I'm looking at [file or area]
- I need to understand [specific aspect]

Constraints:
- Do NOT read unrelated files (keep exploration focused)
- Do NOT make any changes

Output: File list, data flow diagram, and key patterns used.
```

## Hallucination Prevention

Hallucinations happen when the agent **infers** missing information instead of **finding** it.

| Cause | Prevention |
|-------|------------|
| Vague references ("the service") | Name specific files/classes |
| Missing interfaces | Include or point to type definitions |
| Assumed API shape | Provide endpoint + response format |
| Incomplete requirements | Add acceptance criteria |
| No verification | Add build/test/browser check |

**Power move:** Start prompts with:
```
Before writing code, list all assumptions you are making about this feature.
```
This forces the agent to surface gaps you can correct before it generates wrong code.

## Prompt Quality Checklist

Before sending a prompt, verify:

- [ ] **Specific objective** — not "make this better" but "fix X so Y happens"
- [ ] **Context provided** — current vs desired behavior, relevant files
- [ ] **Constraints stated** — what NOT to do, patterns to follow
- [ ] **Acceptance criteria** — testable conditions for "done"
- [ ] **Verification step** — build, test, or browser check
- [ ] **Scoped** — not "fix the app" but "fix [component] in [file]"
- [ ] **No micromanaging** — describe the goal, not the exact code to write

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| **Vague prompt** ("make it better") | Agent guesses, wastes tokens exploring | State specific goal + acceptance criteria |
| **Paragraph dump** | Agent misses key details in wall of text | Use structured sections |
| **Micromanaging** (line-by-line instructions) | Blocks better solutions, fragile | Describe the outcome, not the steps |
| **No constraints** | Agent changes things it shouldn't | Explicit "don't modify X" |
| **No verification** | Bugs ship silently | Always add a check step |
| **Kitchen sink context** | Noise drowns signal, eats tokens | Include only relevant files/info |
| **Endless conversation** | Quality degrades after many turns | Start fresh after each logical task |
| **Treating agent like chatbot** | Back-and-forth instead of clear spec | Give complete instructions upfront |

## Escalation: When Prompts Aren't Enough

If a prompt keeps producing bad output:

1. **Add "list assumptions"** — surface what the agent is getting wrong
2. **Use Plan Mode** — force research before coding
3. **Break the task smaller** — single-responsibility per prompt
4. **Add an example** — show expected input/output (but don't over-rely on examples, agents overfit to them)
5. **Start a new conversation** — accumulated context may be causing confusion
6. **Use a more capable model** — some tasks need deeper reasoning

## Additional Resources

For concrete examples across different scenarios, see [examples.md](examples.md).
