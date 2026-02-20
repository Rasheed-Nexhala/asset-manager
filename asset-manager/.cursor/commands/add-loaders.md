Use the skill at `/Applications/React/Nexhala/asset-manager/asset-manager/.cursor/skills/add-loaders/SKILL.md` to add all missing loaders to the components I provide.

**Workflow:**
1. Read each component file I specify (or infer from paths/names).
2. Identify every async operation: data fetches, form submissions, modal loads, pagination, refresh.
3. For each async operation, determine the correct loader type (full-screen, button, inline, modal, list footer, RefreshControl).
4. Add the appropriate loader following the patterns in the skill.
5. Ensure loading state is properly managed (Redux selectors or local useState, set in finally/catch).
6. Add accessibility attributes (accessibilityState, accessibilityLabel) where applicable.

**Important:**
- Use Subagents whenever necessary and can break the task.
- Do not add loaders where they already exist and are correct.
- Prefer existing Redux loading selectors when available; use local state only when needed.
- Match the project's styling (ActivityIndicator color `#1E40AF`, NativeWind classes).
- Handle error and empty states; do not show a loader for empty data.

Apply the skill and implement the changes directly in the code.
