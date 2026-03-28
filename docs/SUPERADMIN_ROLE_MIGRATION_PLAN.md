# SuperAdmin as a first-class `UserRole` — migration plan

This document consolidates analysis from parallel codebase reviews of **`asset-manager`** (React Native) and **`asset-manager-web`** (React), plus **`firestore.rules`** / **`storage.rules`**. It is the implementation plan for using **`role: 'SuperAdmin'`** as the **only** way to represent super-admin access (the legacy **`isSuperadmin`** field is **removed** — see §2, §3.1, §9), alongside **`Admin`**, **`StoreIncharge`**, **`SiteManager`**, and **`Unassigned`**.

---

## 1. Goals

| Goal | Detail |
|------|--------|
| **Unified role model** | Super admin is selected and stored like other roles (Firestore `role` string), not a separate boolean. |
| **Admin-equivalent capabilities (phase 1)** | Users with `role == 'SuperAdmin'` receive **the same access as `Admin`** everywhere the backend and UI currently gate on `isAdmin()` / `selectIsAdmin`. |
| **Preserve special user-management rules** | Only **`role == 'SuperAdmin'`** may change/deactivate **other Admins** / **other SuperAdmins** and **cannot** change **self** from the Users UI; plain **`Admin`** cannot (same intent as the old boolean, without storing **`isSuperadmin`**). |
| **Data migration** | Existing documents with `isSuperadmin: true` must be migrated to **`role: 'SuperAdmin'`** and the **`isSuperadmin` field removed entirely** — no long-term or transitional use of the boolean (see §9). |
| **SuperAdmin > Admin (non-negotiable)** | Everywhere SuperAdmin **already had more power than Admin**, that **must remain** after the migration (see §1.2). |
| **SuperAdmin ≈ Store Incharge (selected flows)** | SuperAdmin must be able to **raise POs** and use **PO counters** like **Store Incharge**, and must be able to **approve / process site requests** (request queue) like **Admin and Store Incharge** (see §1.3). |

### 1.1 SuperAdmin vs Admin — what stays “extra”

`SuperAdmin` is **not** “Admin with a different label”. It is **Admin-level org access** **plus** capabilities that plain **`Admin`** does **not** have. After moving to `role: 'SuperAdmin'`, preserve at least:

| Area | More than plain `Admin`? | Notes |
|------|--------------------------|--------|
| **Users** | Yes | Only SuperAdmin may change/deactivate **other Admins** (and **other SuperAdmins**); cannot edit **self** in Users UI. |
| **Purchase orders — approve/reject** | Often yes | **Assignment** to a specific Admin: SuperAdmin may still **approve/reject** when a plain Admin is assigned (bypass in app + rules where applicable). |
| **Purchase orders — create / submit** | Yes | **Store Incharge** (and legacy flag) could create/submit drafts; **plain Admin** cannot. **`SuperAdmin`** must keep **Store Incharge–class** PO powers (create, draft → `pending_approval`, **`poCounters`**). |
| **Site requests — queue / approve / transfer** | **Yes (required)** | **`canManageRequests()`** today is `Admin \|\| StoreIncharge` only — it does **not** include the legacy boolean. **Extend** rules + app so **`SuperAdmin`** can **process the request queue** (approve, reject, transfer, etc.) on par with Admin and Store Incharge. |

Plain **`Admin`** must **not** gain PO-create or extra request powers unless you change product rules separately.

### 1.2 Product clarification: PO create vs Admin

Today in **Firestore**, **plain `Admin`** cannot **create** POs or use **`poCounters`**; only **`StoreIncharge`** or the legacy **super-admin flag** can.

**Target:** **`SuperAdmin`** always includes:

- **All `Admin`-equivalent** checks (sites, activity log, inventory admin paths, vendors, etc.) via **`isAdminOrSuperAdmin()`** where appropriate.
- **Store Incharge–parallel** PO behavior: **create PO**, **submit draft**, **`poCounters`** read/write — model with **`isStoreIncharge() || isSuperAdmin()`** (role-based) or **`isStoreInchargeOrSuperAdmin()`**.

Do **not** narrow SuperAdmin to “Admin only” without PO/queue powers — that would **remove** existing or newly required behavior.

### 1.3 Site requests (request queue) — explicit requirement

**Requirement:** **`SuperAdmin`** must be able to **approve and process requests** (same operational scope as **Admin** and **Store Incharge** on the **`requests`** collection: queue, process, approve/reject/transfer flows).

**Implementation sketch:**

- **Firestore** — extend **`canManageRequests()`** (and any **`requests`** `allow read` / `allow update` / `allow delete` branch that currently uses only **`isAdmin()`** or **`isStoreIncharge()`**) so **`getUserRole() == 'SuperAdmin'`** is allowed wherever **either** Admin **or** Store Incharge may act. Concretely:  
  `canManageRequests() := … && (isAdmin() || isStoreIncharge() || isSuperAdminRole())`  
  (using the same **`isSuperAdmin()`** / **`isSuperAdminRole()`** helper as elsewhere).
- **App** — routes and navigation gated by **Admin OR Store Incharge** (e.g. **`AdminOrStoreInchargeGuard`**, sidebar links to **Request queue**, notification deep links) must also allow **`SuperAdmin`**: add **`selectIsSuperAdmin`** or a composite **`selectCanManageRequests`** (`Admin \|\| StoreIncharge \|\| SuperAdmin`) so SuperAdmins reach **Request queue**, **Process request**, etc., without needing a second role.

---

## 2. Current vs target model

| Aspect | Current | Target (phase 1) |
|--------|---------|------------------|
| Firestore `users/{uid}.role` | `'Admin'` often paired with flag | `'SuperAdmin'` for designated accounts (no reliance on boolean) |
| Firestore `users/{uid}.isSuperadmin` | `true` / absent | **Removed** — not read by rules or clients after rollout |
| Redux / `UserRoleData` | `role` + optional `isSuperadmin` | `role` may be `'SuperAdmin'`; **`isSuperadmin` omitted from types and API mapping** |
| Selectors | `selectIsSuperAdmin` reads boolean | `selectIsSuperAdmin` → `role === 'SuperAdmin'` (name can stay for minimal churn) |
| “Staff admin” UI | `selectIsAdmin` only | Introduce **`selectIsAdminOrSuperAdmin`** (or rename to `selectHasOrgAdminAccess`) for navigation, **`AdminGuard`**, **Sidebar**, **Activity Log**, **Sites**, **Users** list visibility—anywhere only **`Admin`** was allowed |

---

## 3. Firestore rules (`asset-manager/firestore.rules`)

### 3.1 `isSuperAdmin()` — role only (no `isSuperadmin` field)

**Current (boolean on user doc):** rules read `users/{uid}.data.isSuperadmin == true`.

**Target — single source of truth:**

```javascript
function isSuperAdmin() {
  return isAuthenticated() && getUserRole() == 'SuperAdmin';
}
```

Do **not** read **`isSuperadmin`** in Firestore rules, Storage rules, or app code after release. Migrate existing data **before** deploying rules that only check **`role`** (see §9).

### 3.2 Admin-equivalent access for `SuperAdmin`

Add helpers and use them consistently:

| Helper (suggested name) | Meaning |
|-------------------------|--------|
| `isAdminOrSuperAdmin()` | `getUserRole() == 'Admin' \|\| getUserRole() == 'SuperAdmin'` |
| `isStoreInchargeOrSuperAdmin()` | `getUserRole() == 'StoreIncharge' \|\| getUserRole() == 'SuperAdmin'` — for PO **create**, draft → **pending_approval**, **`poCounters`** |

Every match path that currently uses **`isAdmin()`** and should treat SuperAdmin like Admin must switch to **`isAdminOrSuperAdmin()`** (or the appropriate combined helper). Subagent review flagged these **`isAdmin()`-only areas** that did **not** include the old boolean:

- **`users`**: `get`, `list`, `create`, `delete` (non-self)
- **`sites`**: `create`, `delete`, most `update`s
- **`grrCounters`**
- **`activityLogs`** (read all)
- **`requestCounters`**
- **`requests`** (admin branches)
- **`inventoryUpdateRequests`**

Also update the **`users` `update`** inner condition that references **`resource.data.role != 'Admin'`** so **deactivating a user with `role: 'SuperAdmin'`** is similarly restricted (only another SuperAdmin should deactivate them—mirror the Admin rule).

### 3.3 Purchase orders

Replace **`isAdmin() \|\| isSuperAdmin()`** with **`isAdminOrSuperAdmin()`** (role-based).

Replace **`isStoreIncharge() \|\| isSuperAdmin()`** with **`isStoreIncharge() \|\| isSuperAdminRole()`** (or shared helper).

Outer **`isAdminOrStoreIncharge()`** on PO updates: ensure **`SuperAdmin`** is included if they must approve/reject without also being Store Incharge—typically **`isAdminOrSuperAdmin() \|\| isStoreIncharge()`** or a dedicated **`canAccessPurchaseOrders()`** helper matching product rules.

### 3.4 Site requests (`match /requests/{requestId}`)

Today **`canManageRequests()`** is **`isAdmin() \|\| isStoreIncharge()`** — **no** legacy super-admin flag. To meet §1.3, update to:

```javascript
function canManageRequests() {
  return isAuthenticated() && isUserActive() &&
    (isAdmin() || isStoreIncharge() || isSuperAdmin());
}
```

Then audit every **`requests`** rule branch that allows **`isAdmin()`** or **`isStoreIncharge()`** for **read / update / delete** so **`SuperAdmin`** is included wherever **either** role may process the queue (often by reusing **`canManageRequests()`** instead of duplicating role checks).

---

## 4. Storage rules (`asset-manager/storage.rules`)

Storage uses **`firestore.get`** on `users/{uid}` for **`role`**, not `isSuperadmin`.

**Required:** add **`SuperAdmin`** wherever **`isAdmin()`** should apply for parity (e.g. **`poSignedDocs`** currently Admin-only). Suggested pattern:

- `function isAdmin() { ... getUserRole() == 'Admin' || getUserRole() == 'SuperAdmin'; }`  
  **or** separate helpers mirroring Firestore naming.

Confirm **`poInvoices`**, **`itemImages`**, **`maintenancePhotos`** paths after the same policy.

---

## 5. `asset-manager` (React Native) — files to change

| Area | File(s) | Change summary |
|------|-----------|----------------|
| Types | `src/types/roles.ts` | Add `'SuperAdmin'` to `UserRole`; **remove `isSuperadmin`** from `UserRoleData` / `UserListItem`. |
| Firestore user API | `src/services/firebase/userRoleService.ts` | **Do not** read/write `isSuperadmin`; only `role` (and other non-legacy fields). |
| Selectors | `src/store/selectors/authSelectors.ts` | `selectIsSuperAdmin` → `role === 'SuperAdmin'`; add **`selectIsAdminOrSuperAdmin`**, **`selectCanManageRequests`**; update **`selectCanCreatePurchaseOrder`** to `StoreIncharge \|\| SuperAdmin` (role-based). |
| Guards / navigation | `src/navigation/RootNavigator.tsx`, `src/navigation/BottomTabNavigator.tsx` | Replace `isAdmin \|\| isSuperAdmin` with **`isAdminOrSuperAdmin`** where the intent is “org admin + super admin”; keep `selectIsSuperAdmin` only where you need **exclusive** super-admin behavior (e.g. user-row rules). |
| Requests (queue) | `src/navigation/RequestStackNavigator.tsx`, `src/navigation/BottomTabNavigator.tsx`, `src/navigation/RootNavigator.tsx` | **`canManageRequests`** and **`isAdmin \|\| isStoreIncharge`** must include **`SuperAdmin`** (e.g. `selectCanManageRequests` = Admin \|\| StoreIncharge \|\| SuperAdmin): initial route **RequestQueue**, registering **RequestQueue** / **RejectRequest** screens, notification deep links to **RequestQueue** / **ProcessRequest**, PO tab visibility if SuperAdmin should match staff (see existing patterns for PO). |
| Users UI | `src/components/Users/Users.tsx` | Read-only rules: treat **`role === 'SuperAdmin'`** like **`Admin`** for “only super admin can edit” (and **both** require `selectIsSuperAdmin` for editing those rows). Adjust `isTargetUserAdmin` to include SuperAdmin targets if they should be protected the same way. |
| PO | `src/services/firebase/purchaseOrderService.ts` | `fetchPoUserFlags`: use `role` only; rename `isSuperAdmin` locals to `isSuperAdminRole` for clarity; **`ensureCanCreatePO`**: `StoreIncharge` or `SuperAdmin`; **`ensureCanApproveRejectPO`**: `Admin` or `SuperAdmin`. |
| PO UI | `src/screens/PurchaseOrder/ApprovePOScreen.tsx`, `CreatePOScreen.tsx` | Use **`selectIsAdminOrSuperAdmin`** for approve where appropriate; assignment bypass stays tied to **`selectIsSuperAdmin`** only; update user-visible strings. |
| Tests | See **§11** — `authSelectors.test.ts`, `ApprovePOScreen.test.tsx`, `PurchaseOrderListScreen.test.tsx`, plus new cases for **`selectCanManageRequests`** / guards. |

**No changes found** under `asset-manager/functions/` for these identifiers (per search).

---

## 6. `asset-manager-web` (React) — files to change

| Area | File(s) | Change summary |
|------|-----------|----------------|
| Types | `src/types/roles.ts` | Same as mobile: `'SuperAdmin'` in `UserRole`; **remove `isSuperadmin`** from interfaces. |
| Firestore user API | `src/services/firebase/userRoleService.ts` | Same as mobile. |
| Selectors | `src/store/selectors/authSelectors.ts` | Same as mobile, plus **`selectCanManageRequests`** (§7). |
| Route guards | `src/components/auth/AdminGuard.tsx` | Use **`selectIsAdminOrSuperAdmin`** instead of **`selectIsAdmin`** so **`SuperAdmin`** can access `/activity`, `/sites`, `/admin/users`. |
| Layout | `src/components/layout/Sidebar.tsx` | Replace **`selectIsAdmin`** with **`selectIsAdminOrSuperAdmin`** for nav items that are admin-only (Activity, Vendors, Sites, Users). Extend **Requests** nav (queue vs my-requests) so **`SuperAdmin`** follows **Admin/Store Incharge** (same as §1.3). |
| Staff guard | `src/components/auth/AdminOrStoreInchargeGuard.tsx` | Include **`SuperAdmin`**: allow **`RequestQueuePage`**, **ProcessRequest**, and other staff routes when `role === 'SuperAdmin'`. |
| Users | `src/pages/UsersPage.tsx` | Same row-level logic as mobile; `selectIsSuperAdmin` from role; extend admin-target checks to **`SuperAdmin`** rows if needed. |
| PO | `src/services/firebase/purchaseOrderService.ts`, `src/pages/purchaseOrder/ApprovePOPage.tsx`, `PurchaseOrderDetailPage.tsx`, `CreatePOPage.tsx` | Align with mobile and rules; strings: “Store Incharge or Super Admin” / role-based approval copy. |
| Tests | See **§11** — same selector updates as mobile; add guard tests if added for web. |

**Router (`src/router.tsx`)** does not reference super admin directly; behavior changes follow **`AdminGuard`**, **`AdminOrStoreInchargeGuard`**, and **Sidebar** (§1.3). **`NotificationCenterPage`** (deep links to **`/requests/queue`**) should stay consistent with **`selectCanManageRequests`**.

---

## 7. Selectors — recommended API (both apps)

| Selector | Definition |
|----------|------------|
| `selectIsSuperAdmin` | `userRole?.role === 'SuperAdmin'` |
| `selectIsAdminOrSuperAdmin` | `role === 'Admin' \|\| role === 'SuperAdmin'` |
| `selectIsAdmin` | Unchanged: `role === 'Admin'` only (use where **exclusive** Admin matters) |
| `selectCanCreatePurchaseOrder` | `role === 'StoreIncharge' \|\| role === 'SuperAdmin'` (Store Incharge–class PO raise; §1.2) |
| `selectCanManageRequests` | `role === 'Admin' \|\| role === 'StoreIncharge' \|\| role === 'SuperAdmin'` — use for **Request queue**, **AdminOrStoreInchargeGuard**, and notification routing (§1.3) |

Use **`selectIsAdminOrSuperAdmin`** for: **AdminGuard**, **Sidebar** admin links, dashboard features that were admin-only, PO **approve** UI if SuperAdmin should mirror Admin (and keep **`selectIsSuperAdmin`** for assignment bypass and Users **mutate** rules).

Use **`selectCanManageRequests`** anywhere the app currently combines **`isAdmin \|\| isStoreIncharge`** for **staff request** flows so **SuperAdmin** is included without duplicating ORs.

---

## 8. User management UI semantics

After migration, suggested rules (mirror current behavior, extended for the new role):

- **Plain `Admin`**: cannot edit users whose **`role`** is **`Admin`** or **`SuperAdmin`** (existing Admin row lock + new SuperAdmin row lock).
- **`SuperAdmin`**: can edit **`Admin`** and other users as today; **cannot** edit **own** row (still read-only for self).
- **Role picker**: add **`SuperAdmin`** to **`ROLE_OPTIONS`** only if **`selectIsSuperAdmin`** (or hide from non–super-admins entirely—product choice).

---

## 9. Data migration (no legacy field)

1. **Before** shipping client + rules that only use **`role`**: for every `users/{uid}` with **`isSuperadmin == true`**, set **`role`** to **`'SuperAdmin'`** (preserve intended access — typically former `Admin` + flag → `SuperAdmin` only), then **delete the `isSuperadmin` field** from the document.
2. **Firestore console** or **admin script**: acceptable for small tenant counts.
3. **Order of operations (recommended):** migrate **all** super-admin user documents in each environment → deploy **Firestore/Storage rules** that use **`getUserRole() == 'SuperAdmin'`** only → deploy app builds that **never write or read `isSuperadmin`**.

There is **no** supported “dual mode” where rules or apps read both boolean and role long term.

Optional: one-off migration in **`functions/`** or a script colocated with other migrations if the team uses **`migrateInventory.ts`**-style jobs — only if that matches your ops process.

---

## 10. Regression: previous features must still work

After implementation, verify **behavior parity** (not just compilation):

| Feature area | What to verify |
|--------------|----------------|
| **Users** | SuperAdmin edits/deactivates other Admins and other SuperAdmins; cannot edit self; plain Admin cannot edit Admin/SuperAdmin rows. |
| **PO — create/submit** | SuperAdmin can create PO and move draft → pending; plain Admin cannot (unless product changes). |
| **PO — approve/reject / signed PDF** | SuperAdmin can approve/reject; assignment bypass for SuperAdmin when PO assigned to another admin still works. |
| **PO — counters** | SuperAdmin can use `poCounters` paths consistent with Store Incharge-class access. |
| **Requests** | SuperAdmin sees **Request queue** and can process (approve/reject/transfer) like Admin/Store Incharge. |
| **Inventory / vendors / maintenance / sites / activity** | SuperAdmin has **Admin-equivalent** access via **`isAdminOrSuperAdmin`** (and combined helpers where defined). |
| **Storage** | Signed PO docs, invoices, images — SuperAdmin treated like Admin (or combined policy) per §4. |
| **Notifications / deep links** | Taps to Request queue, Process request, Approve PO route correctly for SuperAdmin. |

---

## 11. Automated tests — add, update, and keep green

**Baseline (2026-03-28):** `asset-manager` Jest and `asset-manager-web` Vitest **full suites pass** (no failures to fix until code changes land). After each batch of implementation, run **`npm test`** in both packages and fix any regressions immediately.

### 11.1 Update existing tests (remove `isSuperadmin` from fixtures)

| Package | File | Action |
|---------|------|--------|
| Both | `src/store/selectors/__tests__/authSelectors.test.ts` | Replace **`Admin` + `isSuperadmin: true`** with **`role: 'SuperAdmin'`**; remove **`isSuperadmin`** from mock `userRole`. Add cases for **`selectIsAdminOrSuperAdmin`**, **`selectCanManageRequests`**, **`selectCanCreatePurchaseOrder`** with `SuperAdmin`. |
| Mobile | `src/screens/PurchaseOrder/__tests__/ApprovePOScreen.test.tsx` | Update **`superAdminPreloadedState`** to use **`role: 'SuperAdmin'`** only (no boolean). |
| Mobile | `src/screens/PurchaseOrder/__tests__/PurchaseOrderListScreen.test.tsx` | Refresh comments that mention “super admin” if copy changes. |

### 11.2 New or extended tests (recommended)

| Package | Suggested coverage |
|---------|-------------------|
| **Both** | **`selectCanManageRequests`**: true for Admin, StoreIncharge, SuperAdmin; false for SiteManager and Unassigned. |
| **Both** | **`selectIsAdminOrSuperAdmin`**: true for Admin and SuperAdmin only. |
| **Web** | **`AdminGuard`**: allows SuperAdmin when using **`selectIsAdminOrSuperAdmin`** (render or mock store). |
| **Web** | **`AdminOrStoreInchargeGuard`**: allows SuperAdmin via **`selectCanManageRequests`** (or equivalent). |
| **Mobile** | **`RequestStackNavigator`** (or thin test hook): initial route **RequestQueue** when `role === 'SuperAdmin'` (component test or navigation test if present). |
| **Mobile** | **`RootNavigator`** notification handler: **`canManageRequests`** includes SuperAdmin (unit-test the handler with mocked flags). |

### 11.3 Manual / E2E (checklist)

- [ ] Sign in as **SuperAdmin** (Firestore `role` only, **no** `isSuperadmin` field): smoke-test Users, PO create/approve, Request queue, sites, activity log.
- [ ] Sign in as **Admin**: confirm PO create still denied where expected; request queue only if Admin (unchanged).
- [ ] Sign in as **Store Incharge**: unchanged baseline.

### 11.4 Failing tests policy

If **`npm test`** fails after a change: **fix before merge** — either adjust expectations for intentional behavior changes or fix implementation bugs. Do not leave known-red tests on `main`.

---

## 12. Documentation and ancillary updates

Update internal docs that mention **`isSuperadmin`** or “set super admin in Firestore” (e.g. `APPLICATION_DOCUMENTATION.md`, product specs) to describe **`role: 'SuperAdmin'`** only and that the boolean field is **not** used.

---

## 13. Suggested implementation order

1. Add `'SuperAdmin'` to TypeScript `UserRole` and selectors (**no `isSuperadmin` in types).
2. **Migrate Firestore user documents** in target environment(s): set `role: 'SuperAdmin'`, **delete `isSuperadmin`**.
3. Deploy **`firestore.rules`** and **`storage.rules`** that use **`getUserRole() == 'SuperAdmin'`** only (no boolean reads).
4. Update **`userRoleService`** (stop mapping `isSuperadmin`), navigation, guards, PO/request flows, **Users** UI.
5. **Update and add tests** (§11); run **`npm test`** in both packages until green.
6. Update human-readable docs (§12).

---

## 14. Analysis sources

Findings were merged from:

- Focused exploration of **`asset-manager/`** (all `isSuperadmin` / `selectIsSuperAdmin` usages, tests, PO, navigation, Users).
- Focused exploration of **`asset-manager-web/`** (services, pages, guards, selectors, tests).
- Full read of **`firestore.rules`** and **`storage.rules`** for `isAdmin()` vs `isSuperAdmin()` coverage and PO/user paths.

---

*Last updated: 2026-03-28 (legacy field removal, regression + test sections)*
