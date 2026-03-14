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
- **Icons**: `npm install react-icons @heroicons/react`
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

### Step 3.4: Verify Pure Hooks
- Validate that business logic hooks like `useAuth`, `useUserRoleSync`, and `useDashboardSubscriptions` are completely clean of React Native/Expo imports.

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

### Step 5.3: Main Layout Component
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

---

## Phase 6: Authentication UI

**Goal**: Implement the Login flow using standard HTML.

### Step 6.1: Rewrite Auth Screen
- Read the logic from `asset-manager/src/screens/Authentication/AuthFlowScreen.tsx` (or `LoginScreen.tsx`).
- Recreate the UI using `div`, `<input type="email">`, `<input type="password">`, and `button`.
- Execute the exact same Redux thunk: `dispatch(loginUser({ email, password }))` (found in `asset-manager/src/store/slices/authSlice.ts`).
- Apply responsive design: `w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg`.

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

---

## Phase 8: Inventory Feature Migration

**Goal**: Migrate the most complex feature systematically (List, Detail, and Form).

### Step 8.1: Inventory List Page
- Reference `asset-manager/src/screens/InventoryListScreen.tsx` and `asset-manager/src/components/InventoryItemCard.tsx`.
- Desktop: Render a standard HTML `<table>` with columns for Name, SKU, Category, Quantity, etc., restricted to view via `hidden md:table`.
- Mobile: Render a stacked card layout for each item (`grid grid-cols-1 gap-4 md:hidden`).
- Connect the exact same search and filter Redux logic from `asset-manager/src/store/slices/inventorySlice.ts`.

### Step 8.2: Add/Edit Inventory Form (Expo API Replacements)
- Reference `asset-manager/src/screens/AddEditInventoryScreen.tsx`.
- Convert mobile input fields to a proper Web `<form>`.
- Replace `expo-image-picker` with native `<input type="file" accept="image/*" />`.
- Use the Web `FileReader` API to generate previews of images before upload.
- On submit, fire the exact same save/update thunks pushing to Firebase Storage and Firestore.

---

## Phase 9: Requests & Purchase Orders Features

**Goal**: Migrate Request and Purchase Order features seamlessly.

### Step 9.1: PO List & Detail Page
- Reference `asset-manager/src/screens/OrdersScreen.tsx` (or `PurchaseOrdersListScreen.tsx`) and `PurchaseOrderDetailScreen.tsx`.
- Similar to Inventory, implement a responsive List/Table paradigm.
- Detail view must cleanly render associated line items, approvals, and status badges.

### Step 9.2: Creating Purchase Orders
- Reference `asset-manager/src/screens/CreateOrderScreen.tsx`.
- Migrate the complex form to create a PO.
- Ensure Role-Based logic (StoreIncharge, Admin) hides or displays authorization/approval buttons via existing Redux selectors from `asset-manager/src/store/selectors/authSelectors.ts`.

---

## Phase 10: Secondary Features & Edge Cases (With References)

### Step 10.1: Migrate Remaining Pages
- **Sites List**: Reference `asset-manager/src/screens/SitesScreen.tsx`. Migrate Sites viewing capability.
- **Activity Log**: Reference `asset-manager/src/screens/ActivityLogScreen.tsx`. Construct a vertical timeline utilizing border edges in Tailwind (`border-l-2 border-gray-200`).
- **User Management**: Reference `asset-manager/src/screens/UsersScreen.tsx` (Admin only). Recreate the Admin-only users table, enabling admins to modify app-level roles seamlessly.

---

## Phase 11: Web-Specific Implementations & Deployment

### Step 11.1: Resolve Expo Nuances
- **Printing (`expo-print`)**: Replace with standard browser printing logic. Invoke `window.print()` and utilize an overarching `@media print` CSS block to hide navigation elements, formatting the tables cleanly for PDFs.
- **Document Selection (`expo-document-picker`)**: Replace directly with `<input type="file" accept=".pdf,.doc,.docx" />`.

### Step 11.2: Firebase Hosting Configuration
- Build the optimized Vite app: `npm run build`.
- In the root folder of your project structure (where `firebase.json` resides), map the hosting parameters securely:
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
