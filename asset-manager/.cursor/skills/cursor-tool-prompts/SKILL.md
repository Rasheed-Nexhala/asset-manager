---
name: cursor-tool-prompts
description: Craft effective prompts that leverage Cursor's built-in agent tools. Use when the user asks for help writing prompts, wants to use specific Cursor tools, or needs guidance on which tool to use for a task.
---

# Cursor Tool Prompts

Help users write prompts that leverage Cursor's built-in tools effectively. Match the right tool to the task, combine tools for complex workflows, and write clear instructions the agent can follow.

## Available Tools

| Tool | Name in prompts | Best for |
|------|-----------------|----------|
| **Semantic search** | `codebase_search`, `semantic search` | Finding code by meaning, understanding patterns |
| **Grep** | `grep` | Exact text/regex matches, finding all usages |
| **File search** | `search files and folders` | Finding files by name/pattern |
| **Read files** | `read`, `read_file` | Inspecting file contents |
| **Edit files** | `edit`, `edit_file` | Making code changes |
| **Terminal** | `run_terminal_cmd`, `run shell` | Shell commands, builds, tests, git |
| **Web search** | `web_search`, `search the web` | Looking up docs, best practices |
| **Browser** | `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill`, etc. | Testing UI, interacting with pages |
| **Image generation** | `generate image` | UI mockups, visual assets |
| **Ask questions** | `ask question`, `message-question` | Clarification before acting |
| **Fetch rules** | `fetch rules` | Loading project conventions |

## Choosing the Right Tool

```
Need to find code?
├─ Know the exact text/symbol? → grep
├─ Know the file name? → search files and folders
└─ Know the concept but not the code? → codebase_search

Need to understand code?
├─ Specific file? → read_file
├─ Pattern across codebase? → codebase_search + read_file
└─ External API/library? → web_search

Need to change code?
├─ Single file? → edit_file
├─ Multi-file refactor? → grep (find) → edit_file (change) → run_terminal_cmd (verify)
└─ Unsure about approach? → ask question first

Need to verify changes?
├─ Build/lint? → run_terminal_cmd
├─ UI rendering? → browser_navigate + browser_snapshot
├─ API calls? → browser_network_requests
└─ Console errors? → browser_console_messages
```

## Prompt Patterns

### 1. Search-then-act

Find relevant code first, then make changes:

```
Use grep to find all places where [pattern] is used,
then edit each file to [change description].
```

### 2. Read-then-suggest

Understand before changing:

```
Read [file] and [file], then suggest improvements for [aspect].
```

### 3. Clarify-then-implement

Ask before committing to a direction:

```
Before making changes, use the ask question tool to confirm
[decision point]. Then implement based on my answer.
```

### 4. Implement-then-verify

Make changes and validate them:

```
Edit [file] to [change], then run [command] to verify
it compiles. Use browser_navigate to [url] and
browser_snapshot to confirm the UI looks correct.
```

### 5. Research-then-apply

Look up best practices first:

```
Search the web for [topic/library docs], then apply
those patterns to [file/component].
```

### 6. Multi-tool pipeline

Chain tools for complex workflows:

```
1. Use codebase_search to find [concept]
2. Read each relevant file
3. Edit them to [change]
4. Run [build/test command] to verify
5. Use browser_navigate to [url] and check the result
```

## Writing Effective Tool Prompts

### Be explicit about the tool

- **Weak**: "Find where authentication works" (agent picks any tool)
- **Strong**: "Use codebase_search to find how authentication tokens are validated" (agent uses semantic search)

### Be specific about what to do with results

- **Weak**: "Use grep to find all TODOs"
- **Strong**: "Use grep to find all TODO comments, then categorize them by priority and create a summary"

### Chain tools with clear transitions

- **Weak**: "Fix the form and test it"
- **Strong**: "Edit the form component to add required validation on the email field, then use browser_navigate to open the form, browser_fill with an empty email, browser_click submit, and browser_snapshot to verify the error message appears"

## Browser Tool Reference

Common browser tool combinations:

| Goal | Tools to chain |
|------|---------------|
| Visual check | `browser_navigate` → `browser_snapshot` or `browser_take_screenshot` |
| Form testing | `browser_navigate` → `browser_fill` → `browser_click` → `browser_snapshot` |
| Responsive test | `browser_navigate` → `browser_resize` → `browser_take_screenshot` |
| Debug errors | `browser_navigate` → `browser_console_messages` |
| API inspection | `browser_navigate` → `browser_network_requests` |
| Accessibility | `browser_navigate` → `browser_snapshot` (includes a11y tree) |

## Additional Resources

For 60 concrete examples across all tools, see [examples.md](examples.md).
