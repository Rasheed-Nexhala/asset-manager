# Web App Migration Plan: CIAMS Asset Manager

This document provides a highly structured, step-by-step plan to migrate the existing React Native (Expo) app to a React Web App using Vite + TailwindCSS. The plan is optimized for an AI coding assistant (like Cursor or Antigravity) to execute sequentially.

## Core Philosophy
1. **No Backend Changes**: Firebase, Firestore Rules, Cloud Functions, and Redux logic remain completely unchanged.
2. **Maximum Reusability**: Copy 100% of types, services, Redux store, constants, and utilities.
3. **UI Rewrite**: Rewrite NativeWind (React Native) UI into standard TailwindCSS (React Web) UI, translating `View` to `div`, `Text` to `p`/`span`/`h1`, etc.
4. **Responsive Design**: Use Tailwind's responsive prefixes (`md:`, `lg:`) to ensure all Web UI components work flawlessly on both Mobile Web and Desktop Web right from the start.

---

## Phase 1: Workspace & Initialization

**Goal**: Setup the new web project alongside the mobile project without modifying the mobile app.

### Step 1.1: Initialize Vite Project
- Navigate to the parent directory: `/Applications/Nexhala/asset-manager/`
- Run: `npm create vite@latest asset-manager-web -- --template react-ts`
- Run: `cd asset-manager-web && npm install`

### Step 1.2: Install Core Dependencies
In the new `asset-manager-web` directory, install the identical core logic libraries, plus web alternatives for UI and routing:
- **Logic**: `npm install firebase @reduxjs/toolkit react-redux`
- **Routing**: `npm install react-router-dom`
- **Tailwind**: `npm install -D tailwindcss postcss autoprefixer`
- **Icons**: `npm install @heroicons/react` (Building a central `<Icon />` component to replace Expo Vector Icons and Emojis).
- **Utilities**: `npm install date-fns clsx tailwind-merge`

### Step 1.3: Configure TailwindCSS
- Run: `npx tailwindcss init -p`
- Update `tailwind.config.js` `content` array to: `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`
- Add Tailwind directives to `src/index.css` (replacing the default Vite CSS).

---

## Phase 2: Logic Layer Migration (Pure Copy)

**Goal**: Move all framework-agnostic code from the mobile app to the web app.

### Step 2.1: Copy Directories
Copy the following directories completely unchanged from the mobile app (`asset-manager/src/`) to the web app (`asset-manager-web/src/`):
- `src/types/`
- `src/services/` (Firebase services logic works identically on web)
- `src/store/` (Redux slices, thunks, standard store setup)
- `src/constants/`
- `src/utils/`

### Step 2.2: Copy Config
- Copy `asset-manager/config/firebase.ts` to `asset-manager-web/src/config/firebase.ts`.
- Ensure environment variables (`import.meta.env` in Vite) logically match Expo's `process.env` equivalents. Create a `.env` file in the web root containing your Firebase credentials.

### Step 2.3: Hook Setup (Redux)
- In `src/main.tsx`, wrap the `<App />` component with `<Provider store={store}>` just like in the mobile application.

---

## Phase 3: Custom Hooks Adaptation

**Goal**: Move React Hooks, replacing any mobile-specific APIs with standard Web APIs.

### Step 3.1: Copy Hooks Directory
- Copy `src/hooks/` from Mobile to Web.

### Step 3.2: Adapt Network Status
- Locate `useNetworkStatus.ts`. Replace `@react-native-community/netinfo` with native Web APIs (`navigator.onLine`, `window.addEventListener('online', ...)`).

### Step 3.3: Adapt Push Notifications (Optional)
- Locate `usePushTokenRegistration.ts` (if it exists). Either mock it out initially to prevent compilation errors or replace `expo-notifications` with Firebase Cloud Messaging (FCM) Web Push APIs.

### Step 3.4: Verify and Adapt All Hooks
- Validate that the following hooks are clean of React Native/Expo imports and function on web:
  - `useAuth.ts` — Firebase auth listener.
  - `useAuthStateSync.ts` — Syncs auth state to Redux.
  - `useUserRoleSync.ts` — Syncs user role from Firestore.
  - `useDashboardSubscriptions.ts` — Subscribes to dashboard data.
  - `useRequestsSubscriptions.ts` — Subscribes to request data.
  - `useInventoryAccessSync.ts` — Syncs inventory access state.
  - `useManagerValidationSync.ts` — Validates manager assignment.
  - `useWeightViewPreference.ts` — User preference for weight display units.
  - `useAutoClearError.ts` — Auto-dismisses error messages.
  - `useInventoryError.ts` — Inventory-specific error handling.
- These hooks are framework-agnostic and should copy directly.

---

## Phase 4: Routing Structure (React Router)

**Goal**: Replace React Navigation (Stack + Bottom Tabs) with React Router DOM.

### Step 4.1: Setup router.tsx
- Create `src/router.tsx`.
- Define the routes using `createBrowserRouter`.
- Setup standard paths: `/login`, `/dashboard`, `/inventory`, `/inventory/:itemId`, `/purchase-orders`, etc.
- Initially, use placeholder components for these routes (e.g., `<div>Dashboard Page</div>`).

### Step 4.2: Implement Protected Routes
- Create an `<AuthGuard />` component that checks Redux state: `useAppSelector(selectIsAuthenticated)`.
- If false, Redirect to `/login`.
- If true, render `<Outlet />` to show the protected children.

---

## Phase 5: Layout & Web Navigation Shell

**Goal**: Create a responsive layout structure (Top Navbar with Hamburger Menu for mobile, Sidebar for desktop).

### Step 5.1: Create Sidebar Component (Desktop)
- Make it structurally hidden on mobile (`hidden md:flex flex-col w-64`).
- Read the user role state (`selectIsAdmin`, etc.) to conditionally render Links (Dashboard, Inventory, POs, Users).
- Use `react-router-dom`'s `<NavLink>` to apply active styling.

### Step 5.2: Create Mobile Navbar
- Make it visible only on mobile (`flex md:hidden h-16 items-center`).
- Includes a top header with a Hamburger Menu icon that triggers a slide-out drawer or dropdown.

### Step 5.3: Central Icon Component
- Create `src/components/shared/Icon.tsx`.
- This component runs centrally using `@heroicons/react/24/outline` (or solid).
- **CRITICAL**: Do NOT use emojis for icons anywhere in the web app UI. Always use the `<Icon name="..." />` component for consistency, scalability, and Tailwind color-matching.

### Step 5.4: Main Layout Component
- Create `src/components/layout/AppLayout.tsx`.
- Structure should encompass the sidebar, navbar, and the main content area:
  ```tsx
  <div className="flex h-screen bg-gray-50 overflow-hidden">
    <Sidebar /> {/* Desktop */}
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <TopHeader /> {/* Mobile Header + Unified User Profile Dropdown */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <Outlet /> {/* Renders the current page view */}
      </main>
    </div>
  </div>
  ```

### Step 5.5: No Internet / Offline Banner
- Reference `asset-manager/src/components/NoInternetScreen.tsx`.
- Create a persistent banner component that appears when the browser goes offline (`navigator.onLine` / `useNetworkStatus` hook).
- Display at the top of the layout to warn the user of connectivity loss.

---

## Phase 6: Authentication UI

**Goal**: Implement the full Authentication flow using standard HTML.

### Step 6.1: Rewrite Auth/Login Screen
- Reference `asset-manager/src/screens/Authentication/AuthFlowScreen.tsx` and `LoginScreen.tsx`.
- Recreate the UI using `div`, `<input type="email">`, `<input type="password">`, and `button`.
- Execute the exact same Redux thunk: `dispatch(loginUser({ email, password }))` (found in `asset-manager/src/store/slices/authSlice.ts`).
- Apply responsive design: `w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg`.

### Step 6.2: Auth Checking Screen
- Reference `asset-manager/src/screens/Authentication/AuthCheckingScreen.tsx`.
- Implement a full-screen loading/splash state shown while the app resolves the Firebase auth session on startup.
- Use Redux `authSlice` loading state to conditionally render this before redirecting to `/dashboard` or `/login`.

### Step 6.3: Signup Screen
- Reference `asset-manager/src/screens/Authentication/SignupScreen.tsx`.
- Implement the new user registration form at route `/signup`.
- Fire the registration Redux thunk and handle validation errors inline.

### Step 6.4: Loading Screen
- Reference `asset-manager/src/screens/LoadingScreen.tsx`.
- Implement a full-screen loading/spinner component displayed during initial app bootstrap (e.g., while fetching user session or site data).
- Can be combined with `AuthCheckingScreen` logic or used as a standalone "app is loading" state.

---

## Phase 7: Dashboard Feature Migration

**Goal**: Rewrite the Dashboard logic and UI.

### Step 7.1: Setup Dashboard Page
- Create `src/pages/DashboardPage.tsx`.
- Hook up the same hook from `asset-manager/src/hooks/useDashboardSubscriptions.ts`.
- Fetch data identically to how `asset-manager/src/screens/DashboardScreen.tsx` behaves.

### Step 7.2: Rewrite KPI Cards & Widgets
- Reference components in `asset-manager/src/components/KPICard.tsx` or `DashboardStats.tsx`.
- Convert mobile KPI components (`View`, `Text`) to semantic Web HTML (`div`, `h3`, `p`).
- Apply Tailwind classes: `bg-white shadow rounded-lg p-5 flex flex-col`.
- Organize cards in a responsive CSS grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

### Step 7.3: Activity Log & "My Activity"
- Reference `asset-manager/src/screens/ActivityLog/ActivityLogScreen.tsx` and `MyActivityScreen.tsx`.
- Construct a vertical timeline using Tailwind border properties (`border-l-2 border-gray-200`).
- "My Activity" view filters the log by the current user's UID from Redux state.
- Paginate the log feed for performance on web.

### Step 7.4: Notification Center
- Reference `asset-manager/src/screens/Notifications/NotificationCenterScreen.tsx`.
- Implement a `/notifications` page displaying in-app notifications from Firestore.
- Show a notification badge count on the top navbar icon.
- Replace `expo-notifications` push delivery with FCM Web Push or mock it initially.

---

## Phase 8: Inventory Feature Migration

**Goal**: Migrate the most complex feature systematically across all inventory sub-screens and views.

### Step 8.1: Inventory Shell & Navigation
- Reference `asset-manager/src/screens/InventoryScreen.tsx`.
- Implement a top-level `/inventory` route with nested sub-routes for the different views.
- Add a tab-bar or sub-nav to switch between: **My Site**, **Central Store**, **Other Sites**, and **Steel Master**.

### Step 8.2: My Site Inventory
- Reference `asset-manager/src/screens/Inventory/MySiteInventoryScreen.tsx`.
- Desktop: Render a `<table>` with columns for Name, SKU, Category, Unit (Kg/Pieces), Fuel Type, and Quantity.
- Mobile: Render stacked cards (`grid grid-cols-1 gap-4 md:hidden`).
- Connect the same search and filter Redux logic.

### Step 8.3: Central Store Inventory
- Reference `asset-manager/src/screens/Inventory/CentralStoreInventoryScreen.tsx`.
- Similar responsive table/card layout, but filtered to the central store site.
- Includes any central-store-only actions (e.g., issuing to sites).

### Step 8.4: Other Site Inventory
- Reference `asset-manager/src/screens/Inventory/OtherSiteInventoryScreen.tsx`.
- Allows viewing inventory at other sites (read-only or with transfer capabilities).
- Connect transfer request initiation from this view.

### Step 8.5: Steel Master
- Reference `asset-manager/src/screens/Inventory/SteelMasterScreen.tsx`.
- Implement a dedicated page for the steel master list, preserving all column logic and unit display.

### Step 8.6: Item Detail
- Reference `asset-manager/src/screens/Inventory/ItemDetailScreen.tsx`.
- Implement at route `/inventory/:itemId`.
- Display all item attributes, quantity history, and actions (edit, request, move to maintenance).

### Step 8.7: Add/Edit Inventory Item (Units & Fuel Types)
- Reference `asset-manager/src/screens/Inventory/AddEditItemScreen.tsx`.
- Multi-unit support: Implement unit selection (Kg vs Pieces) using `unitUtils.ts` and `weightConversionUtils.ts`.
- Fuel Type: Add a select dropdown for fuel types if applicable to the item category.
- Replace `expo-image-picker` with native `<input type="file" accept="image/*" />`.
- Use the Web `FileReader` API for image previews before upload.
- On submit, fire Firebase Storage + Firestore save/update thunks.

### Step 8.8: Add/Edit Custom Item
- Reference `asset-manager/src/screens/Inventory/AddEditCustomItemScreen.tsx`.
- Implement a separate form for custom items that may not follow standard inventory fields.

### Step 8.9: Category Management & Selection
- Reference `asset-manager/src/screens/Inventory/CategoryManagementScreen.tsx` and `CategorySelectScreen.tsx`.
- Implement an admin-only `/inventory/categories` page to create, edit, and delete item categories.
- `CategorySelectScreen` logic should be converted to a reusable `<CategoryPicker />` dropdown/modal component.

### Step 8.10: Inventory Update Requests
- Reference `asset-manager/src/screens/Inventory/InventoryUpdateRequestsScreen.tsx`.
- Implement a page (or panel) for reviewing and approving inventory update requests.

---

## Phase 9: Purchase Orders Feature

**Goal**: Migrate all Purchase Order screens.

### Step 9.1: PO List Page
- Reference `asset-manager/src/screens/PurchaseOrder/PurchaseOrderListScreen.tsx`.
- Implement at route `/purchase-orders`.
- Responsive List/Table paradigm: table on desktop, cards on mobile.
- Include Draft management UI: display draft POs and allow deletion.

### Step 9.2: PO Detail View
- Reference the PO detail screen (within the PurchaseOrder navigator).
- Render associated line items, vendor info, approval status badges, and action buttons (Approve, Receive).

### Step 9.3: Create Purchase Order
- Reference `asset-manager/src/screens/PurchaseOrder/CreatePOScreen.tsx`.
- Migrate the complex multi-field form. Use `SelectItemsScreen` logic (see Step 12.3) as a shared item picker.
- Role-Based logic: StoreIncharge, Admin see authorization/approval buttons via Redux selectors.

### Step 9.4: Approve Purchase Order
- Reference `asset-manager/src/screens/PurchaseOrder/ApprovePOScreen.tsx`.
- Implement at route `/purchase-orders/:poId/approve`.
- Show approver details, notes field, and Approve/Reject actions.

### Step 9.5: Receive Purchase Order
- Reference `asset-manager/src/screens/PurchaseOrder/ReceivePOScreen.tsx`.
- Implement at route `/purchase-orders/:poId/receive`.
- Allow StoreIncharge to mark line items as received with actual quantities.

### Step 9.6: Vendor Management
- Reference `asset-manager/src/screens/PurchaseOrder/VendorManagementScreen.tsx` and `AddVendorScreen.tsx`.
- Implement an admin-level `/vendors` page to manage the vendor list.
- Include add/edit/delete vendor functionality.

---

## Phase 10: Requests Feature

**Goal**: Migrate all Request screens and workflows.

### Step 10.1: Request Queue
- Reference `asset-manager/src/screens/Requests/RequestQueueScreen.tsx`.
- Implement at route `/requests/queue`.
- Shows all pending requests for the current site. Visible to StoreIncharge and Admin.
- Responsive table with status badges and action buttons.

### Step 10.2: Create & Edit Requests
- Reference `asset-manager/src/screens/Requests/CreateRequestScreen.tsx` and `EditRequestScreen.tsx`.
- Implement a form at `/requests/new` for users to request items from inventory.
- Edit form available at `/requests/:requestId/edit` for pending requests.
- Integrates the shared item selector (see Step 12.3).

### Step 10.3: My Requests
- Reference `asset-manager/src/screens/Requests/MyRequestsScreen.tsx`.
- Implement at `/requests/my-requests` showing the current user's submitted requests and their statuses.

### Step 10.4: Process Request
- Reference `asset-manager/src/screens/Requests/ProcessRequestScreen.tsx`.
- Implement at `/requests/:requestId/process`.
- StoreIncharge can fulfill or partially fulfill a request. Includes unit-aware quantity inputs.

### Step 10.5: Reject Request
- Reference `asset-manager/src/screens/Requests/RejectRequestScreen.tsx`.
- Implement a confirmation modal or page at `/requests/:requestId/reject` with a reason field.

### Step 10.6: Return Items
- Reference `asset-manager/src/screens/Requests/ReturnItemsScreen.tsx`.
- Implement at `/requests/:requestId/return`.
- Allows users to return issued items back to inventory.

### Step 10.7: Site Transfer Requests
- Reference `asset-manager/src/screens/Requests/CreateSiteTransferRequestScreen.tsx` and `ConfirmTransferScreen.tsx`.
- Implement the Site Transfer workflow at `/requests/transfer/new`.
- Multi-step form: select items → select destination site → confirm.
- Ensure `requestService.ts` transfer methods are correctly called.

---

## Phase 11: Maintenance Feature

**Goal**: Migrate all Maintenance screens.

### Step 11.1: Maintenance Dashboard
- Reference `asset-manager/src/screens/Maintenance/MaintenanceDashboardScreen.tsx`.
- Implement at route `/maintenance`.
- Display KPI summary of items in maintenance and recent activity.

### Step 11.2: Add Item to Maintenance
- Reference `asset-manager/src/screens/Maintenance/AddToMaintenanceScreen.tsx` and `SelectItemForMaintenanceScreen.tsx`.
- A flow starting from item selection → entering maintenance details (issue, notes).
- Use the `ItemSelectorForMaintenance` component (web-adapted).

### Step 11.3: Maintenance Detail
- Reference `asset-manager/src/screens/Maintenance/MaintenanceDetailScreen.tsx`.
- Implement at `/maintenance/:maintenanceId`.
- Show item info, maintenance status, notes history, and actions (Return/Write-Off).

### Step 11.4: Return from Maintenance
- Reference `asset-manager/src/screens/Maintenance/ReturnFromMaintenanceScreen.tsx`.
- Implement at `/maintenance/:maintenanceId/return`.
- Allow marking an item as returned to inventory from maintenance.

### Step 11.5: Write Off
- Reference `asset-manager/src/screens/Maintenance/WriteOffScreen.tsx`.
- Implement at `/maintenance/:maintenanceId/write-off`.
- Confirm and record a permanent write-off of a lost/damaged item. Admin/Supervisor only.

---

## Phase 12: Site Management, Users & Profile

**Goal**: Migrate admin and user-account screens.

### Step 12.1: Site Management
- Reference `asset-manager/src/screens/Sites/SiteManagementScreen.tsx`, `AddSiteScreen.tsx`, and `EditSiteScreen.tsx`.
- Implement an admin-only `/sites` page listing all sites.
- Include Add Site and Edit Site forms (modal or separate route).

### Step 12.2: User Management
- Reference `asset-manager/src/screens/Users/UsersScreen.tsx`.
- Implement at `/admin/users` (admin only).
- Recreate the Admin users table: view, edit roles, and manage access.

### Step 12.3: Shared Item Selector
- Reference `asset-manager/src/screens/SelectItems/SelectItemsScreen.tsx`.
- Convert to a reusable `<ItemSelectorModal />` web component used in Create PO, Create Request, and Site Transfer flows.
- Must support search, filters, and multi-select.

### Step 12.4: User Profile
- Reference `asset-manager/src/screens/Users/ProfileScreen.tsx` and `SignedInScreen.tsx`.
- Implement at `/profile` showing the current user's details, assigned site, and role.
- Include logout button.

### Step 12.5: Update Password
- Reference `asset-manager/src/screens/Users/UpdatePasswordScreen.tsx`.
- Implement at `/profile/update-password`.
- Secure form requiring current password before setting a new one.

### Step 12.6: Delete Account
- Reference `asset-manager/src/screens/Users/DeleteAccountScreen.tsx`.
- Implement at `/profile/delete-account` (or as a modal).
- Requires re-authentication confirmation before deletion.

---

## Phase 13: Web-Specific Implementations & Deployment

### Step 13.1: Resolve Expo Nuances
- **Printing (`expo-print`)**: Replace with standard browser printing. Invoke `window.print()` with an `@media print` CSS block that hides navigation and formats tables cleanly for PDFs.
- **Document Selection (`expo-document-picker`)**: Replace directly with `<input type="file" accept=".pdf,.doc,.docx" />`.
- **Unit Conversion**: Ensure `unitUtils.ts` and `weightConversionUtils.ts` are copied unchanged and used throughout Inventory, Requests, and PO forms.
- **Push Notifications**: Replace `expo-notifications` with Firebase Cloud Messaging (FCM) Web Push APIs or mock initially. Show in-app notifications via the `NotificationCenter` page.
- **CSV Export**: Ensure `csvExport.ts` utility works on web. Replace any mobile file-saving logic with browser `Blob` + `URL.createObjectURL()` + `<a download>` pattern for downloading CSV files.
- **PO PDF Generation**: Adapt `poPdfUtils.ts` for web. Replace `expo-print` with a browser-compatible PDF library (e.g., `jsPDF` or `html2pdf.js`) or `window.print()` with `@media print` styling.
- **Inventory Access Requests**: Reference components `RequestAccessBanner.tsx`, `RequestInventoryAccessModal.tsx`, and `ActiveAccessCard.tsx`. Ensure the inventory access request flow is migrated for users to request and admins to grant site inventory access.
- **SKU Generation**: Ensure `skuGenerationUtils.ts` is copied and used in Add/Edit Inventory forms.
- **Inventory Adjustment**: Reference `InventoryAdjustmentModal.tsx` and `StockEntryModal.tsx`. Ensure stock adjustment and entry modals are implemented as web modals/drawers.
- **Error Boundaries**: Reference `AppErrorBoundary.tsx` and `ErrorBoundaryFallback.tsx`. Implement React error boundaries for graceful error handling in the web app.

### Step 13.2: Firebase Hosting Configuration
- Build the optimized Vite app: `npm run build`.
- In the root folder (where `firebase.json` resides), map the hosting parameters securely:
  ```json
  {
    "hosting": {
      "public": "asset-manager-web/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [ 
        { "source": "**", "destination": "/index.html" } 
      ]
    }
  }
  ```
- Deploy the Web application to the global CDN: `firebase deploy --only hosting`.

---

## Strict Directives for AI Implementation
- **DO NOT** modify anything inside `src/store/`, `src/services/`, or `src/types/` during the UI rewrite.
- Map NativeWind classes mathematically to Web Tailwind (`className="flex-row items-center"` transforms to `className="flex items-center"`).
- Always use semantic HTML (`header`, `nav`, `main`, `section`, `article`, `button`) instead of simply slapping everything into generic `div`s.
- Never write ad-hoc CSS. All styling must be strict configuration mapped via Tailwind standard utilities.
