# Add Firestore Pagination

Use `.cursor/skills/firestore-pagination/SKILL.md` to add pagination to the given module/component.

1. **Explore subagent:** Understand the module—Firestore service, Redux slice, screen, selectors, data flow.
2. **GeneralPurpose subagent:** Implement per skill: `getCountFromServer` + cursor `listPaginated`, thunks, slice (`totalCount`, `lastDoc`, `hasMore`), UI ("Total: X", "Showing Y of X", load more).

**Constraints:** Total from server only; filters in Firestore; search in Firestore. Add indexes if needed.

##IMPORTANT: Make sure SUBAGENTS are used as mentioned above
