# Cursor Tool Prompt Examples

60 ready-to-use prompts organized by tool and complexity.

---

## Semantic Search / codebase_search

1. `Use codebase_search to find how authentication tokens are managed across the app.`
2. `Use semantic search to find where rental unit pricing is calculated.`
3. `Search the codebase for how form validation works in the application flow.`
4. `Use codebase_search to find all error handling patterns in the services layer.`
5. `Use semantic search to understand how the cart repository manages state.`
6. `Search the codebase to find how route guards protect authenticated pages.`
7. `Use codebase_search to find all dialog/modal patterns used in the app.`
8. `Use semantic search to find where customer information is fetched and cached.`
9. `Use codebase_search to find how the wish priority system works end-to-end.`
10. `Search the codebase for all places where loading state is managed with signals.`

## Grep

11. `Use grep to find all instances of ApplicationStatus enum usage.`
12. `Use grep to find all API endpoints called from the frontend services.`
13. `Use grep to find all TODO and FIXME comments across the codebase.`
14. `Use grep to find all places where toastService shows error messages.`
15. `Use grep to find all components still using *ngIf instead of @if.`
16. `Use grep to find all constructor injections that should use inject().`
17. `Use grep to find all hardcoded Norwegian strings not using Transloco.`
18. `Use grep to find all BehaviorSubject usages that could be replaced with signals.`
19. `Use grep to find all components missing ChangeDetectionStrategy.OnPush.`
20. `Use grep to find all ngClass usages that should be replaced with class bindings.`

## Read Files

21. `Read application.service.ts and summarize all API calls it makes.`
22. `Read en.json and nb.json, then find any missing or mismatched translation keys.`
23. `Read ApplicationController.cs and map each endpoint to its frontend service method.`
24. `Read the route configuration and draw the full routing tree.`
25. `Read application-cart.model.ts and suggest stricter TypeScript types.`
26. `Read application-details.component.ts and check if it follows OnPush change detection.`
27. `Read the ApplicationWishController.cs and LeaseApplicationController.cs side by side and compare their error handling.`

## Edit Files

28. `Edit application.component.ts to convert constructor injection to inject() function.`
29. `Edit the HTML template to replace all *ngIf with @if control flow syntax.`
30. `Edit application-utils.ts to add null-safety checks on all method parameters.`
31. `Edit the template to add proper ARIA labels and roles for screen readers.`
32. `Edit the service to add retry logic with exponential backoff on failed API calls.`
33. `Edit the component to replace ngClass with class bindings.`
34. `Edit application.model.ts to add JSDoc comments on all interface fields.`
35. `Edit the wish card component to use computed() for all derived state.`
36. `Edit the service to replace constructor injection with inject() function.`
37. `Edit the component to extract inline styles into Tailwind utility classes.`

## Terminal Commands

38. `Run ng test --watch=false to check if all unit tests pass.`
39. `Run npm audit to check for security vulnerabilities in dependencies.`
40. `Run git log --oneline -20 to show recent commits on this branch.`
41. `Run ng build and report any compilation errors.`
42. `Run npx depcheck to find unused dependencies in the project.`
43. `Run git diff --stat to show a summary of all changes on this branch.`

## Browser

44. `Use browser_navigate to open localhost:4200 and test the application submission flow.`
45. `Use browser_snapshot to check the accessibility tree of the wish card component.`
46. `Open the application list page and use browser_network_requests to verify API calls.`
47. `Use browser_console_messages to check for runtime errors on the market page.`
48. `Use browser_fill to enter test data in the form, browser_click submit, and verify the toast.`
49. `Use browser_take_screenshot of the mobile viewport after browser_resize to 375x812.`
50. `Use browser_navigate to the details page, then browser_scroll through the wish list.`
51. `Use browser_snapshot with interactive:true to find all clickable elements on the page.`
52. `Navigate to the app, use browser_profile_start, interact with the page, then browser_profile_stop to find performance bottlenecks.`

## Web Search

53. `Search the web for the latest Elf state management migration guide from Akita.`
54. `Search the web for WCAG AA contrast ratio requirements and audit our color palette.`
55. `Search the web for Angular signal best practices and suggest improvements to our code.`

## Ask Questions

56. `Before refactoring, use the ask question tool to confirm which state library I want to migrate to.`
57. `Use ask question to clarify the desired date format before changing date-utils.`
58. `Ask me which ApplicationStatus values should appear in each tab before implementing filters.`

## Multi-Tool Pipelines

59. `Use grep to find all hardcoded strings in templates, then edit en.json and nb.json to add translation keys, then edit the templates to use the transloco pipe.`
60. `Use codebase_search to find all date handling code, read each file, then refactor to use a consistent date utility pattern. Run ng build to verify nothing breaks.`
