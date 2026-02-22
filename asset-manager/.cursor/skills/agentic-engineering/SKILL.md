---
name: agentic-engineering
description: Guide for using Cursor's agent system effectively — subagents, orchestration patterns, model selection, token optimization, and context management. Use when planning complex tasks, configuring agents, creating custom subagents, optimizing token usage, or when the user asks about agent architecture, subagents, or how to structure work for Cursor's AI.
---

# Agentic Engineering with Cursor

Maximize output quality and minimize token cost by structuring how you use Cursor's agents, subagents, and context system.

## Core Concepts

### Agent Harness = Messages + Tools + Instructions

Every Cursor agent run combines:
1. **User messages** — your prompts and follow-ups
2. **Tools** — file editing, search, terminal, browser, etc.
3. **Instructions** — system prompt + rules + skills

Cursor tunes these per model. You control quality through **prompt specificity**, **context management**, and **agent orchestration**.

### Token Budget (200k default)

| Consumer | Typical cost |
|----------|-------------|
| Agent exploration (large codebase) | 50,000+ tokens |
| 10-message conversation history | 20,000–40,000 tokens |
| Always-apply rule (100 lines) | 500–1,000 tokens |
| One 500-line file in context | 3,000–5,000 tokens |
| MCP tool descriptions (all loaded) | 5,000–15,000 tokens |

**Key insight:** Every token spent on bloated context is a token NOT available for reasoning.

## Subagents

### What They Are

Subagents are independent agents that handle discrete parts of a parent agent's task. Each runs in its **own isolated context window**.

### Why They Save Tokens

| Without subagents | With subagents |
|-------------------|----------------|
| One agent holds ALL context | Each agent holds only what it needs |
| Long research fills the window | Research stays in subagent's context |
| Summarization loses detail | Parent gets a concise result back |
| Sequential execution only | Parallel execution possible |

### Types of Subagents

| Type | Purpose | Context |
|------|---------|---------|
| **Default: explore** | Codebase research, file discovery | Read-only, fast model |
| **Default: shell** | Terminal commands, builds, tests | Command execution |
| **Default: generalPurpose** | Complex multi-step tasks | Full tool access |
| **Custom (`.cursor/agents/`)** | Domain-specific work | Configurable |

### Sync vs Async Subagents

**Synchronous** (default): Parent waits for subagent to finish.
- Use for: tasks where parent needs the result before continuing
- Example: "Research the auth flow, then I'll edit files based on findings"

**Asynchronous** (v2.5+): Parent continues while subagent works in background.
- Use for: independent parallel tasks
- Example: "Explore tests while I refactor the component"
- Subagents can spawn their own subagents (tree of work)

### Custom Subagent Format

Define in `.cursor/agents/agent-name.md`:

```yaml
---
name: agent-name
model: inherit          # or "fast" for cheaper tasks
description: What this agent does. When to use it.
readonly: true          # optional — restricts to read-only tools
---

[Agent instructions in markdown]
```

**Frontmatter fields:**
- `name`: identifier (kebab-case)
- `model`: `inherit` (parent's model) or `fast` (cheaper, quicker)
- `description`: triggers automatic selection — include WHAT + WHEN
- `readonly`: `true` for exploration-only agents (saves tokens by limiting tools)

## Orchestration Patterns

### Pattern 1: Plan → Execute

**Best for:** Complex features, multi-file changes, unfamiliar code.

```
Step 1: Use Plan Mode (Shift+Tab) with a capable model
        → Agent researches codebase, asks questions, creates plan
Step 2: Review/edit the plan markdown
Step 3: Execute with agent (can use a faster model)
```

**Token benefit:** Planning model scopes work precisely, execution model doesn't waste tokens exploring.

### Pattern 2: Analyze → Implement (subagent pipeline)

**Best for:** Backend-to-frontend features, service creation.

```
Step 1: Launch readonly subagent to analyze backend
        → Returns structured report (endpoints, models, patterns)
Step 2: Parent agent uses report to implement frontend
        → No need to re-read backend files
```

**Your existing pipeline:** `backend-api-analyzer` → `angular-service-creator`

### Pattern 3: Parallel Fan-Out

**Best for:** Large refactors, codebase-wide changes, comparisons.

```
Launch N subagents in parallel:
  - Subagent A: refactors module 1
  - Subagent B: refactors module 2
  - Subagent C: updates tests
Parent: merges results, resolves conflicts
```

**Token benefit:** Each subagent only loads its own module's context.

### Pattern 4: Research → Decide → Act

**Best for:** Tasks with ambiguity or multiple approaches.

```
Step 1: Subagent researches codebase (readonly, fast model)
Step 2: Parent presents findings, asks user to decide
Step 3: Parent implements chosen approach
```

### Pattern 5: Implement → Verify Loop

**Best for:** UI work, test-driven development.

```
Loop:
  1. Agent makes changes
  2. Runs build/tests (shell subagent)
  3. Checks browser (browser tool)
  4. If issues found → fix and repeat
  Until: all checks pass
```

**With hooks:** Configure `.cursor/hooks.json` to auto-loop until tests pass.

### Pattern 6: Multi-Model Comparison

**Best for:** Hard problems, architectural decisions.

```
Run same prompt across multiple models in parallel (worktree isolation)
Compare outputs side-by-side
Pick the best result
```

## Token Optimization Strategies

### 1. Dynamic Context Discovery (most impactful)

**Don't:** Load all files upfront, stuff rules with everything
**Do:** Let the agent find context on demand via search tools

Cursor already does this internally:
- MCP tool descriptions → stored as files, loaded on demand (46.9% token reduction)
- Terminal output → stored as files, agent reads with `tail`/`grep`
- Long tool responses → written to files instead of truncated
- Chat history → referenced as file during summarization

### 2. Rule Scoping

| Rule type | Token cost | When loaded |
|-----------|-----------|-------------|
| `always` | Every conversation | High cost — audit regularly |
| `glob-scoped` | Only matching files | Medium — use for file-specific rules |
| `agent-decided` | Only when relevant | Low — agent reads on demand |

**Action:** Convert always-apply rules to glob-scoped or agent-decided when possible.

### 3. Skill vs Rule Decision

| Use a Rule when | Use a Skill when |
|-----------------|------------------|
| Short (< 50 lines) | Long reference material |
| Always relevant | Only sometimes relevant |
| Style/conventions | Workflows/procedures |
| Commands to run | Domain knowledge |

Skills load dynamically (only when the agent decides they're relevant). Rules are always in context.

### 4. Conversation Hygiene

- **Start new conversations** after completing a logical unit of work
- **Use `@Past Chats`** to reference previous work instead of copy-pasting
- **Keep prompts specific** — vague prompts cause extra exploration tokens
- **Use `/summarize`** when conversations get long

### 5. Model Selection

| Task | Recommended model | Why |
|------|-------------------|-----|
| Planning, architecture | Capable model | Needs deep reasoning |
| Code generation, edits | Default model | Balance of quality and cost |
| Codebase exploration | Fast model | Simple search/read tasks |
| Test running, builds | Fast model | Just executing commands |
| Readonly analysis | Fast + readonly subagent | Minimal tool set, cheap |

### 6. Subagent Model Assignment

In custom agents, set `model: fast` for:
- Exploration/research agents
- Linting/formatting agents
- Test runners
- Simple search tasks

Keep `model: inherit` for:
- Code generation agents
- Architecture analysis
- Complex refactoring

## When to Start a New Conversation

**Start fresh when:**
- Finished one logical unit of work
- Agent seems confused or repeats mistakes
- Moving to a different task/feature
- Context has accumulated noise after many turns

**Continue when:**
- Debugging what it just built
- Iterating on the same feature
- Agent needs earlier context

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| God Agent | One agent does everything, context exhausted | Split into subagents |
| Context stuffing | Loading all files upfront | Let agent search dynamically |
| Always-apply bloat | Too many always-apply rules | Scope rules by glob/agent-decided |
| Never planning | Agent explores randomly | Use Plan Mode first |
| Endless conversation | Quality degrades over turns | Start fresh after each task |
| Vague prompts | Agent burns tokens exploring | Be specific, name tools + files |

## Additional Resources

For orchestration examples and subagent templates, see [reference.md](reference.md).
