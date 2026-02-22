# Coding Prompt Engineering — Examples

Side-by-side weak vs strong prompts, plus ready-to-use templates.

---

## Weak vs Strong Comparisons

### 1. Feature Request

**Weak:**
> Add pagination to the list page.

**Strong:**
> Goal: Add cursor-based pagination to the application list page.
>
> Context: Currently loads all applications at once via GET /Application/ListByApplicant. The backend supports `?page=1&limit=20` query params.
>
> Constraints: Don't change the existing list item component. Use the existing loading spinner pattern.
>
> Acceptance Criteria:
> 1. First page loads 20 items
> 2. "Load more" button appears if more items exist
> 3. Loading spinner shows during fetch
>
> Verification: Run ng build. Use browser_navigate to the list page and browser_snapshot to verify pagination renders.

**Why it's better:** Specifies the pagination type, backend contract, scope limits, and verification.

---

### 2. Bug Fix

**Weak:**
> The form is broken.

**Strong:**
> Goal: Fix the application form crash when submitting without selecting a wish.
>
> Context:
> - Current: Clicking "Send Application" with zero wishes throws "Cannot read properties of undefined (reading 'priority')" in application.component.ts
> - Expected: Show validation error "Please add at least one wish" and prevent submission
>
> Constraints: Don't modify the wish card component or the API service.
>
> Verification: Use browser_navigate to the application form. Try submitting empty. Confirm error message appears via browser_snapshot.

**Why it's better:** Names the exact error, the file, expected behavior, and how to verify.

---

### 3. Refactoring

**Weak:**
> Refactor the service to use new patterns.

**Strong:**
> Goal: Migrate ApplicationService from constructor injection to inject() function.
>
> Context: The service at src/app/services/application.service.ts uses constructor injection for 7 dependencies. Our codebase convention is inject().
>
> Constraints:
> - Don't change any public method signatures
> - Don't modify the API endpoints
> - Process one dependency at a time
>
> Acceptance Criteria:
> 1. All constructor params replaced with inject() calls
> 2. Constructor is removed or empty
> 3. All existing functionality preserved
>
> Verification: Run ng build after each change. Run ng test --watch=false when done.

---

### 4. Translation

**Weak:**
> Add translations for the new component.

**Strong:**
> Goal: Add Transloco translations for all user-facing strings in the wish card component.
>
> Context: Component at src/app/components/.../wish-card.component.html. Translation files at src/assets/i18n/en.json and nb.json.
>
> Constraints: Follow existing key naming pattern (SECTION.KEY_NAME). Don't modify any logic.
>
> Verification: Read en.json and nb.json to confirm all new keys exist in both files.

---

### 5. Exploration

**Weak:**
> How does the cart work?

**Strong:**
> Goal: Explain the data flow of the application cart system.
>
> Context: I see CartRepository, ApplicationService, and application.component.ts are involved.
>
> Constraints: Do NOT read unrelated files. Focus only on cart-related code. Do NOT make any changes.
>
> Output format:
> 1. File list with roles
> 2. Data flow: User action → Component → Service → API → Store
> 3. Key patterns used

---

### 6. Code Review

**Weak:**
> Review my changes.

**Strong:**
> Goal: Review the changes on the current branch for bugs, accessibility issues, and Angular best practices.
>
> Context: Changes are in the application module — use `git diff` to see them.
>
> Constraints: Read-only — don't make any changes. Flag issues by severity.
>
> Output format:
> - Critical (must fix)
> - Suggestion (should consider)
> - Nice-to-have (optional)

---

## Modifier Patterns

Append these to any prompt to improve output:

### Force Assumptions Check
```
Before writing code, list all assumptions you are making.
Wait for my confirmation before proceeding.
```

### Incremental Verification
```
After each file change, run ng build to verify.
Do not proceed to the next file if the build fails.
```

### Scope Lock
```
Only modify files in src/app/components/application/.
Do not touch shared services, models, or other components.
```

### Convention Reminder
```
Follow existing codebase patterns. Use inject() for DI,
signals for state, @if/@for in templates, Tailwind for styling,
Transloco for user-facing strings.
```

### Output Control
```
Keep your response concise. Show only the changed code,
not the entire file. Explain what you changed and why in 2-3 sentences.
```

### Exploration Guard
```
Do NOT read unrelated files. Use codebase_search to find
the 3-5 most relevant files, read only those, and summarize.
```

---

## Prompt Complexity Guide

| Task Complexity | Prompt Length | Sections Needed |
|-----------------|--------------|-----------------|
| Simple fix (typo, style) | 1-2 lines | Goal only |
| Single-file change | 3-5 lines | Goal + Context |
| Multi-file feature | 10-15 lines | All four sections |
| Architecture change | 15-25 lines | All four + Plan Mode |
| Codebase-wide refactor | Use Plan Mode | Plan first, then execute per module |
