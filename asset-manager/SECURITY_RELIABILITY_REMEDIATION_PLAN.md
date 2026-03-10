# Asset Manager Loophole Remediation Plan

This guide explains how to fix the identified loopholes in a safe order (most critical to lower), while minimizing risk to other parts of the app.

---

## Goals

- Close high-risk security and data-integrity gaps first.
- Avoid regressions by isolating changes behind clear boundaries.
- Roll out in small, verifiable increments.
- Keep existing screens and workflows stable while hardening backend behavior.

---

## Safe-Change Rules (Read Before Starting)

Use these rules for **every** fix:

1. **One boundary at a time**
   - First harden backend contracts (`firestore.rules`, Cloud Functions, transactions).
   - Then align client services.
   - Then update UI behavior only if needed.

2. **Do not change payload shapes casually**
   - Keep request/response shape backward-compatible where possible.
   - If a field must change, add a new field and migrate gradually.

3. **Prefer additive changes**
   - Add validation guards and feature flags before removing old logic.
   - Move from "allow + warn" to "deny invalid operations" in phases when needed.

4. **Protect with tests before refactors**
   - Add/extend tests for current critical flows first.
   - Then refactor in small commits.

5. **Use canary rollout mindset**
   - Enable stricter behavior for admin/test users first.
   - Monitor telemetry/errors before broad rollout.

---

## Priority Order (Critical -> Low)

| Priority | Area | Why |
|---|---|---|
| P0 | Firestore authorization and workflow invariants | Direct tampering risk + unauthorized writes |
| P0 | Non-atomic stock mutations (request/PO/maintenance) | Data corruption and stock mismatch |
| P0 | Over-permissive Site Manager data updates | Cross-site inventory manipulation |
| P1 | Auth fail-open behavior | Unauthorized app access during lookup failures |
| P1 | Upload trust based only on metadata | Malicious file upload risk |
| P1 | Unauthenticated logging endpoint abuse | Audit/log poisoning and cost abuse |
| P2 | Subscription error handling (empty-state masking) | Operational misinformation |
| P2 | Dashboard realtime fan-out and polling inefficiency | Scalability and performance degradation |
| P2 | Layering and large-module coupling | High regression risk during future changes |
| P3 | Testing/observability gaps | Slower detection of future defects |

---

## P0-1: Enforce Authorization in Firestore Rules (Critical)

### Target files

- `firestore.rules`
- `src/services/firebase/requestService.ts` (align with new denied writes)

### Problem

Some restrictions are currently enforced mainly in client/service logic. A malicious client can bypass UI and write directly to Firestore.

### Safe fix strategy

1. Add role-scoped field allowlists with `diff().affectedKeys().hasOnly([...])`.
2. Add strict status transition guards in rules.
3. Keep existing fields and write paths; only tighten what keys can change per role.
4. Deploy rules to staging/test first and run regression smoke flows.

### Example pattern

```rules
allow update: if isStoreIncharge()
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    "status", "processedAt", "processedBy", "rejectionReason"
  ])
  && resource.data.status == "pending"
  && request.resource.data.status in ["approved", "rejected"];
```

### Regression prevention checklist

- Verify all valid role actions still pass from UI.
- Confirm invalid direct writes fail in emulator tests.
- Add one test per status transition edge (`draft->pending`, `pending->approved`, etc.).

---

## P0-2: Make Stock-Critical Flows Atomic (Critical)

### Target files

- `src/services/firebase/requestService.ts`
- `src/services/firebase/purchaseOrderService.ts`
- `src/services/firebase/maintenanceService.ts`

### Problem

Read-check-write sequences can race. Two users can process the same action and over/under count stock.

### Safe fix strategy

1. Wrap each critical mutation in `runTransaction`.
2. Re-read current doc state inside transaction (never rely on stale pre-read state).
3. Add idempotency key (`operationId`) for one-time actions (receive PO, approve request, return batch).
4. Keep old public function names; change internals first to avoid UI breakage.

### Transaction design template

```ts
// Pseudocode pattern
await runTransaction(db, async (tx) => {
  const poSnap = await tx.get(poRef);
  if (!poSnap.exists()) throw new Error("PO not found");
  if (poSnap.data().status === "received") throw new Error("Already received");

  // Re-read inventory refs in tx, then apply updates
  const invSnap = await tx.get(invRef);
  const currentQty = invSnap.data().quantity ?? 0;
  tx.update(invRef, { quantity: currentQty + delta });

  tx.update(poRef, {
    status: "received",
    receivedTxId: operationId,
    receivedAt: serverTimestamp(),
  });
});
```

### Regression prevention checklist

- Concurrency test: two parallel calls for same action -> only one succeeds.
- Verify totals and history fields remain consistent after retries/network failures.
- Validate rollback behavior when any child update fails.

---

## P0-3: Restrict Site Manager Write Scope (Critical)

### Target files

- `firestore.rules`

### Problem

Site Manager updates appear broader than required, enabling potential cross-site or central-store tampering.

### Safe fix strategy

1. Add site ownership checks in rules (site manager must match assigned site).
2. Limit Site Manager field updates to operationally required fields only.
3. Deny edits to master metadata and cross-site inventory totals from client path.

### Regression prevention checklist

- Site manager can still perform intended tasks on assigned site.
- Site manager cannot mutate central store or other sites.
- Admin/Store Incharge paths still work unchanged.

---

## P1-1: Change Auth Sync From Fail-Open to Fail-Closed (High)

### Target files

- `src/hooks/useAuthStateSync.ts`

### Problem

On role lookup error, user session may still be set, allowing unintended access.

### Safe fix strategy

1. Introduce explicit auth states:
   - `authenticated`
   - `auth_pending_role_check`
   - `unauthorized_or_inactive`
2. If role fetch fails, do **not** grant full app access.
3. Show retry screen/toast and keep user in restricted/auth-check state.
4. Optionally allow limited cached mode only with clearly bounded permissions.

### Regression prevention checklist

- Network failure during login does not open full dashboard.
- Active users still get in when role service is healthy.
- Inactive users are blocked reliably.

---

## P1-2: Harden File Upload Validation (High)

### Target files

- `src/services/firebase/storageService.ts`
- `storage.rules`
- (new) Cloud Function validator (recommended)

### Problem

MIME/extension metadata can be spoofed.

### Safe fix strategy

1. Upload to `quarantine/` first.
2. Validate real file signature (magic bytes) in backend function.
3. Move valid files to trusted path; reject/delete invalid files.
4. Tighten allowed content types and filename constraints.

### Regression prevention checklist

- Valid image/pdf uploads still succeed.
- Incorrectly labeled files are rejected.
- Existing file consumers can read trusted path without changes.

---

## P1-3: Protect Unauthenticated Logging Endpoint (High)

### Target files

- `functions/src/index.ts` (`logAuthEvent`)

### Problem

Unauthenticated event logging can be spammed or poisoned.

### Safe fix strategy

1. Require App Check for anonymous logging paths.
2. Enforce strict schema and max lengths on all string fields.
3. Add rate limiting and abuse throttling.
4. Prefer trusted server-side auth telemetry where feasible.

### Regression prevention checklist

- Normal login-failed telemetry still appears.
- Spam volume drops and malformed payloads are rejected.
- No breaking changes to legitimate analytics dashboard queries.

---

## P2-1: Stop Empty-State Masking on Subscription Errors (High)

### Target files

- `src/services/firebase/requestService.ts`
- `src/services/firebase/inventoryService.ts`
- `src/services/firebase/siteService.ts`
- `src/hooks/useDashboardSubscriptions.ts`

### Problem

Errors are transformed into `[]`, making users think data truly disappeared.

### Safe fix strategy

1. Keep "last good data" in store.
2. Add separate error slice/flags per domain stream.
3. UI shows stale-data warning + retry, instead of replacing lists with empty arrays.

### Regression prevention checklist

- Temporary network/rules error does not wipe visible data.
- Error banners and retry controls appear correctly.
- Recovery path refreshes data when connection resumes.

---

## P2-2: Reduce Dashboard Realtime Fan-Out and Polling (High)

### Target files

- `src/hooks/useDashboardSubscriptions.ts`
- `src/screens/DashboardScreen.tsx`
- related services with broad `onSnapshot` usage

### Problem

Too many broad realtime subscriptions and polling loops create heavy reads and rerenders.

### Safe fix strategy

1. Replace full-collection dashboard listeners with compact summary docs (counts/KPIs).
2. Add query bounds (`limit`, date windows, status filters).
3. Keep detailed lists realtime only on their dedicated screens.
4. Replace unread polling with single source of truth (user-level `unreadCount` field + listener).

### Regression prevention checklist

- Dashboard shows same key metrics as before.
- Firestore read usage drops.
- Tab switches do not keep unnecessary background polling alive.

---

## P2-3: Improve Layer Boundaries and Decompose God Modules (Medium)

### Target files

- `src/screens/Requests/*`
- `src/services/firebase/requestService.ts`
- `src/services/firebase/inventoryService.ts`

### Problem

Direct service calls from screens and oversized modules increase coupling/regression risk.

### Safe fix strategy

1. Introduce use-case/thunk boundary:
   - UI -> thunk/use-case -> repository/service.
2. Move business rules (status transitions, quantity math) into pure domain utilities.
3. Keep current function contracts; refactor internals incrementally.

### Regression prevention checklist

- Screen behavior unchanged from user perspective.
- Unit tests exist for extracted domain utilities.
- Fewer duplicate logic paths across screens.

---

## P3-1: Expand Testing + Observability Coverage (Medium-Low)

### Target files

- `src/services/**/*`
- `src/store/thunks/**/*`
- `src/__tests__/**/*`
- logging wrappers / telemetry integration points

### Problem

Critical business logic has limited direct test coverage and inconsistent telemetry.

### Safe fix strategy

1. Add service-level unit tests for:
   - status transitions
   - quantity calculations
   - retry/conflict paths
2. Add emulator-backed integration tests for rules + transaction semantics.
3. Standardize structured logging (`errorCode`, `domain`, `operationId`, `userRole`).

### Regression prevention checklist

- Every P0/P1 fix has positive + negative tests.
- Incident triage can trace failures with operation context.
- CI fails on critical flow regressions.

---

## Suggested Implementation Sequence (Low Risk)

1. **Week 1:** Add tests around current critical flows (baseline safety net).
2. **Week 1-2:** Harden `firestore.rules` for field/status restrictions in staging.
3. **Week 2:** Convert PO/request/maintenance critical writes to transactions + idempotency.
4. **Week 2-3:** Fix auth fail-open and subscription error handling.
5. **Week 3:** Upload validation quarantine + logging endpoint hardening.
6. **Week 3-4:** Dashboard subscription optimization and module boundary refactors.

---

## Change Isolation Map (How to Avoid Breaking Other Sections)

Use this dependency map while implementing:

```text
[UI Screens]
   |
   v
[Thunks / Use-cases]  <-- keep this API stable
   |
   v
[Firebase Services]   <-- internal refactor + transactions here
   |
   v
[Firestore Rules / Cloud Functions]  <-- strongest enforcement boundary
```

**Rule of thumb:** if a fix can be enforced at a lower layer (rules/functions), do it there first.  
This protects all current and future clients without requiring broad UI rewrites.

---

## Definition of Done (Per Loophole)

Each loophole is considered fixed only when all are true:

- Security/data rule is enforced server-side (not only client-side).
- Automated tests cover success + abuse/failure path.
- No visible regression in core user flows (request lifecycle, PO receive, maintenance, dashboard).
- Telemetry exists to detect recurrence.
- Rollback plan documented (feature flag or targeted revert path).

---

## Quick Win Checklist (Start Here)

1. Add `diff().affectedKeys().hasOnly(...)` constraints in `firestore.rules`.
2. Convert `receivePO` and request approval to transaction + idempotency key.
3. Change `useAuthStateSync` to fail-closed when role cannot be confirmed.
4. Stop converting snapshot errors to empty arrays; preserve last good data.
5. Add emulator tests for forbidden writes and concurrent duplicate actions.

