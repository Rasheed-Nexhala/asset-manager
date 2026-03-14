# Asset Manager — Web Application Implementation Plan

> **Target Stack:** React 18 + TypeScript + Tailwind CSS + Firebase + Redux Toolkit + React Router DOM
> **Source:** Existing React Native / NativeWind / Firebase mobile app (v5.0.5)
> **Firebase Project:** `asset-management-system-622c2` (same project, same Firestore, same Auth)
> **Hosting:** Firebase Hosting
> **AI IDE Note:** Implement each phase completely before starting the next. Each phase is independently testable and does not break prior work.

---

## Repository Layout

```
/Applications/Nexhala/asset-manager/
├── asset-manager/          ← Mobile app (DO NOT TOUCH)
└── asset-manager-web/      ← New web app (create this)
    ├── src/
    ├── public/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Reference — Mobile App File Map

These mobile paths are referenced throughout the plan:

| Mobile Path | What lives there |
|---|---|
| `asset-manager/config/firebase.ts` | Firebase init (Web SDK — reuse directly) |
| `asset-manager/src/types/` | All TS interfaces — copy unchanged |
| `asset-manager/src/services/firebase/` | All Firestore services — copy unchanged |
| `asset-manager/src/store/` | Redux slices, thunks, selectors — copy unchanged |
| `asset-manager/src/hooks/` | Custom hooks — copy & adapt |
| `asset-manager/src/constants/` | App constants — copy unchanged |
| `asset-manager/src/utils/` | Utility functions — copy unchanged |
| `asset-manager/firestore.rules` | Already deployed — no changes needed |
| `asset-manager/storage.rules` | Already deployed — no changes needed |
| `asset-manager/firebase.json` | Update to add hosting section |

---

## Design System Conventions (apply throughout all phases)

### Breakpoints (Tailwind defaults — use these consistently)
| Name | Min-width | Use for |
|---|---|---|
| `sm` | 640px | Landscape mobile |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop / desktop |
| `xl` | 1280px | Wide desktop |

### Layout Rules
- Mobile (< md): single column, bottom/top nav hidden behind hamburger menu
- Tablet (md–lg): sidebar collapses to icon-only (64px wide)
- Desktop (≥ lg): sidebar fully expanded (240px wide), content fills remaining width
- Max content width: `max-w-7xl mx-auto` inside sidebar layout
- Page padding: `px-4 md:px-6 lg:px-8`

### Color Palette (match mobile app)
Map these to `tailwind.config.ts` custom colors:
```
primary:   #2563EB  (blue-600)
secondary: #64748B  (slate-500)
success:   #16A34A  (green-600)
warning:   #D97706  (amber-600)
danger:    #DC2626  (red-600)
surface:   #F8FAFC  (slate-50)
border:    #E2E8F0  (slate-200)
```

### Typography
- Font: System font stack (no custom fonts needed)
- Heading: `text-2xl font-bold text-gray-900`
- Subheading: `text-lg font-semibold text-gray-800`
- Body: `text-sm text-gray-700`
- Muted: `text-xs text-gray-500`

### Component Anatomy Rules
Every UI component file must:
1. Export a named React functional component
2. Accept typed props via a `Props` interface in the same file
3. Use Tailwind exclusively (no inline styles, no CSS modules)
4. Be fully self-contained (no implicit global state unless it is a Redux-connected container)

---

# PHASE 0 — Project Scaffold

**Goal:** Create the Vite + React + TypeScript project, install all dependencies, and verify it runs.

**No Firebase, no Redux yet — just a blank app that builds.**

---

## Step 0.1 — Create the Vite project

Run from `/Applications/Nexhala/asset-manager/`:

```bash
npm create vite@latest asset-manager-web -- --template react-ts
cd asset-manager-web
```

---

## Step 0.2 — Install all dependencies

```bash
# Core
npm install react-router-dom@6

# Firebase (same version as mobile)
npm install firebase@^12.9.0

# State management (same as mobile)
npm install @reduxjs/toolkit@^2.11.2 react-redux@^9.2.0

# Icons
npm install react-icons

# Date utilities (same as mobile uses Firestore Timestamps)
npm install date-fns

# Tailwind and tooling
npm install -D tailwindcss@^3 postcss autoprefixer

# TypeScript extras
npm install -D @types/node
```

---

## Step 0.3 — Initialize Tailwind

```bash
npx tailwindcss init -p
```

---

## Step 0.4 — Create `tailwind.config.ts`

Replace the generated `tailwind.config.js` with:

**File:** `asset-manager-web/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        surface: '#F8FAFC',
      },
      screens: {
        // Keep Tailwind defaults — do not override
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Step 0.5 — Update `src/index.css`

Replace the generated file completely:

**File:** `asset-manager-web/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  html {
    -webkit-text-size-adjust: 100%;
  }
  body {
    @apply bg-surface text-gray-900 antialiased;
    margin: 0;
    min-height: 100vh;
  }
  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
}

@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
}
```

---

## Step 0.6 — Update `index.html`

**File:** `asset-manager-web/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Asset Manager — Inventory & Site Management" />
    <title>Asset Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 0.7 — Update `tsconfig.json`

**File:** `asset-manager-web/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Step 0.8 — Update `vite.config.ts`

**File:** `asset-manager-web/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

---

## Step 0.9 — Replace `src/main.tsx` with a placeholder

**File:** `asset-manager-web/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <h1 className="text-2xl font-bold text-primary">Asset Manager Web — Phase 0 OK</h1>
    </div>
  </React.StrictMode>,
)
```

---

## Step 0.10 — Verify

```bash
npm run dev
```

Open `http://localhost:5173`. You should see "Asset Manager Web — Phase 0 OK" in blue on a light background.

**Phase 0 complete. The app builds and Tailwind works.**

---

# PHASE 1 — Firebase & Core Infrastructure

**Goal:** Wire up Firebase (same project as mobile), copy all types, services, store, and hooks. No UI yet — verify with console logs.

---

## Step 1.1 — Create Firebase config

**File:** `asset-manager-web/src/config/firebase.ts`

Copy the logic from `asset-manager/config/firebase.ts` but remove the React Native / AsyncStorage persistence. Replace the entire persistence block:

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSy...',           // copy from asset-manager/config/firebase.ts
  authDomain: '...',             // copy from asset-manager/config/firebase.ts
  projectId: 'asset-management-system-622c2',
  storageBucket: '...',          // copy from asset-manager/config/firebase.ts
  messagingSenderId: '...',      // copy from asset-manager/config/firebase.ts
  appId: '...',                  // copy from asset-manager/config/firebase.ts
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'europe-west1') // match mobile region

// Web uses browserLocalPersistence (replaces AsyncStorage from mobile)
setPersistence(auth, browserLocalPersistence).catch(console.error)

export default app
```

> **Important:** Copy the exact `firebaseConfig` values from `asset-manager/config/firebase.ts`. Do not guess or fabricate API keys.

---

## Step 1.2 — Copy all TypeScript types

Copy the entire `src/types/` directory from mobile to web unchanged:

```
asset-manager/src/types/auth.ts                        → asset-manager-web/src/types/auth.ts
asset-manager/src/types/roles.ts                       → asset-manager-web/src/types/roles.ts
asset-manager/src/types/inventory.ts                   → asset-manager-web/src/types/inventory.ts
asset-manager/src/types/sites.ts                       → asset-manager-web/src/types/sites.ts
asset-manager/src/types/request.ts                     → asset-manager-web/src/types/request.ts
asset-manager/src/types/purchaseOrder.ts               → asset-manager-web/src/types/purchaseOrder.ts
asset-manager/src/types/maintenance.ts                 → asset-manager-web/src/types/maintenance.ts
asset-manager/src/types/steelMaster.ts                 → asset-manager-web/src/types/steelMaster.ts
asset-manager/src/types/vendor.ts                      → asset-manager-web/src/types/vendor.ts
asset-manager/src/types/activityLog.ts                 → asset-manager-web/src/types/activityLog.ts
asset-manager/src/types/inventoryUpdateRequest.ts      → asset-manager-web/src/types/inventoryUpdateRequest.ts
```

After copying, delete `asset-manager-web/src/types/expo-vector-icons.d.ts` if it was copied — it is mobile-only.

No edits needed. All types are pure TypeScript.

---

## Step 1.3 — Copy all Firebase services

Copy the entire `src/services/` directory from mobile to web unchanged:

```
asset-manager/src/services/firebase/authService.ts                    → asset-manager-web/src/services/firebase/authService.ts
asset-manager/src/services/firebase/userRoleService.ts                → asset-manager-web/src/services/firebase/userRoleService.ts
asset-manager/src/services/firebase/siteService.ts                    → asset-manager-web/src/services/firebase/siteService.ts
asset-manager/src/services/firebase/inventoryService.ts               → asset-manager-web/src/services/firebase/inventoryService.ts
asset-manager/src/services/firebase/categoryService.ts                → asset-manager-web/src/services/firebase/categoryService.ts
asset-manager/src/services/firebase/steelMasterService.ts             → asset-manager-web/src/services/firebase/steelMasterService.ts
asset-manager/src/services/firebase/requestService.ts                 → asset-manager-web/src/services/firebase/requestService.ts
asset-manager/src/services/firebase/maintenanceService.ts             → asset-manager-web/src/services/firebase/maintenanceService.ts
asset-manager/src/services/firebase/purchaseOrderService.ts           → asset-manager-web/src/services/firebase/purchaseOrderService.ts
asset-manager/src/services/firebase/vendorService.ts                  → asset-manager-web/src/services/firebase/vendorService.ts
asset-manager/src/services/firebase/activityLogService.ts             → asset-manager-web/src/services/firebase/activityLogService.ts
asset-manager/src/services/firebase/storageService.ts                 → asset-manager-web/src/services/firebase/storageService.ts
asset-manager/src/services/firebase/inventoryUpdateRequestService.ts  → asset-manager-web/src/services/firebase/inventoryUpdateRequestService.ts
```

**DO NOT copy** `notificationService.ts` — Expo push notifications do not apply to web.

After copying, check each service file for this import:

```typescript
import { db, storage, functions } from '../../config/firebase'
// or
import { auth } from '../../config/firebase'
```

Verify the import path resolves to `src/config/firebase.ts` in the web project. Adjust `../../` depth if needed.

---

## Step 1.4 — Copy constants and utils

```
asset-manager/src/constants/  → asset-manager-web/src/constants/
asset-manager/src/utils/       → asset-manager-web/src/utils/
```

No edits needed.

---

## Step 1.5 — Copy the entire Redux store

```
asset-manager/src/store/slices/         → asset-manager-web/src/store/slices/
asset-manager/src/store/thunks/         → asset-manager-web/src/store/thunks/
asset-manager/src/store/selectors/      → asset-manager-web/src/store/selectors/
asset-manager/src/store/hooks.ts        → asset-manager-web/src/store/hooks.ts
asset-manager/src/store/index.ts        → asset-manager-web/src/store/index.ts
```

No edits needed. Redux Toolkit is framework-agnostic.

---

## Step 1.6 — Copy and adapt custom hooks

Copy these hooks unchanged (they are pure React, no React Native deps):

```
asset-manager/src/hooks/useAuth.ts                        → asset-manager-web/src/hooks/useAuth.ts
asset-manager/src/hooks/useAuthStateSync.ts               → asset-manager-web/src/hooks/useAuthStateSync.ts
asset-manager/src/hooks/useUserRoleSync.ts                → asset-manager-web/src/hooks/useUserRoleSync.ts
asset-manager/src/hooks/useAutoClearError.ts              → asset-manager-web/src/hooks/useAutoClearError.ts
asset-manager/src/hooks/useDashboardSubscriptions.ts      → asset-manager-web/src/hooks/useDashboardSubscriptions.ts
asset-manager/src/hooks/useRequestsSubscriptions.ts       → asset-manager-web/src/hooks/useRequestsSubscriptions.ts
asset-manager/src/hooks/useInventoryAccessSync.ts         → asset-manager-web/src/hooks/useInventoryAccessSync.ts
asset-manager/src/hooks/useManagerValidationSync.ts       → asset-manager-web/src/hooks/useManagerValidationSync.ts
asset-manager/src/hooks/useWeightViewPreference.ts        → asset-manager-web/src/hooks/useWeightViewPreference.ts
asset-manager/src/hooks/useInventoryError.ts              → asset-manager-web/src/hooks/useInventoryError.ts
```

**DO NOT copy** these mobile-only hooks:
- `usePushTokenRegistration.ts` — Expo push tokens
- `useNetworkStatus.ts` — Replace with web version below

**Create web replacement for `useNetworkStatus`:**

**File:** `asset-manager-web/src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react'

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsConnected(true)
    const handleOffline = () => setIsConnected(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isConnected }
}
```

---

## Step 1.7 — Wire Redux Provider into `main.tsx`

**File:** `asset-manager-web/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <h1 className="text-2xl font-bold text-primary">Asset Manager Web — Phase 1 OK</h1>
      </div>
    </Provider>
  </React.StrictMode>,
)
```

---

## Step 1.8 — Verify Phase 1

```bash
npm run dev
```

TypeScript must compile with zero errors. The page shows "Phase 1 OK". Open the browser console — no Firebase errors.

```bash
npm run build
```

Build must succeed. Fix any TypeScript compilation errors before proceeding.

**Phase 1 complete. All business logic, types, services, and Redux store are wired up.**

---

# PHASE 2 — Authentication

**Goal:** Login page, signup page, auth state detection, role loading, protected routes. Full auth flow working end-to-end.

---

## Step 2.1 — Create the router skeleton

**File:** `asset-manager-web/src/router.tsx`

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthPage } from '@/pages/auth/AuthPage'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      // Additional routes added in later phases
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
```

---

## Step 2.2 — Create `AuthGuard` component

**File:** `asset-manager-web/src/components/auth/AuthGuard.tsx`

```typescript
import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import {
  selectIsAuthenticated,
  selectIsRoleLoading,
} from '@/store/selectors/authSelectors'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface Props {
  children: ReactNode
}

export function AuthGuard({ children }: Props) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isRoleLoading = useAppSelector(selectIsRoleLoading)

  if (isRoleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
```

---

## Step 2.3 — Create `LoadingSpinner` shared component

**File:** `asset-manager-web/src/components/shared/LoadingSpinner.tsx`

```typescript
interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
}

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`
        ${sizeMap[size]}
        rounded-full
        border-gray-200
        border-t-primary
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  )
}
```

---

## Step 2.4 — Create placeholder AppShell and DashboardPage

These will be fully implemented in Phase 3 and Phase 4. Create stubs now so the router compiles.

**File:** `asset-manager-web/src/components/layout/AppShell.tsx`

```typescript
import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      <Outlet />
    </div>
  )
}
```

**File:** `asset-manager-web/src/pages/dashboard/DashboardPage.tsx`

```typescript
export function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-2">Phase 4 will implement this.</p>
    </div>
  )
}
```

---

## Step 2.5 — Create the AuthPage

**File:** `asset-manager-web/src/pages/auth/AuthPage.tsx`

```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/selectors/authSelectors'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">AM</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Manager</h1>
          <p className="text-gray-500 mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          {mode === 'login' ? (
            <LoginForm onSwitchToSignup={() => setMode('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Nexhala
        </p>
      </div>
    </div>
  )
}
```

---

## Step 2.6 — Create `LoginForm`

**File:** `asset-manager-web/src/pages/auth/LoginForm.tsx`

```typescript
import { useState, FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signIn } from '@/store/thunks/authThunks'
import { selectAuthError, selectAuthLoading } from '@/store/selectors/authSelectors'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/shared/Button'

interface Props {
  onSwitchToSignup: () => void
}

export function LoginForm({ onSwitchToSignup }: Props) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const error = useAppSelector(selectAuthError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    dispatch(signIn({ email, password }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <FormField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Your password"
        required
        autoComplete="current-password"
      />

      {error && (
        <p className="text-sm text-danger bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" loading={isLoading} className="w-full">
        Sign In
      </Button>

      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-primary font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  )
}
```

---

## Step 2.7 — Create `SignupForm`

**File:** `asset-manager-web/src/pages/auth/SignupForm.tsx`

```typescript
import { useState, FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signUp } from '@/store/thunks/authThunks'
import { selectAuthError, selectAuthLoading } from '@/store/selectors/authSelectors'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/shared/Button'

interface Props {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: Props) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const error = useAppSelector(selectAuthError)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return
    dispatch(signUp({ displayName: name, email, password }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Full Name" value={name} onChange={setName} placeholder="Your name" required />
      <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <FormField label="Password" type="password" value={password} onChange={setPassword} placeholder="Create a password" required autoComplete="new-password" />

      {error && (
        <p className="text-sm text-danger bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" loading={isLoading} className="w-full">
        Create Account
      </Button>

      <div className="text-center mt-2 p-3 bg-amber-50 rounded-lg">
        <p className="text-xs text-amber-700">
          New accounts are assigned the <strong>Unassigned</strong> role. An Admin must assign your role before you can access the system.
        </p>
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary font-medium hover:underline">
          Sign in
        </button>
      </p>
    </form>
  )
}
```

---

## Step 2.8 — Create shared `FormField` component

**File:** `asset-manager-web/src/components/shared/FormField.tsx`

```typescript
import { HTMLInputTypeAttribute } from 'react'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  type?: HTMLInputTypeAttribute
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  hint?: string
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  required,
  disabled,
  autoComplete,
  hint,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`
          w-full px-3 py-2 rounded-lg border text-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-400
          transition-colors
          ${error ? 'border-danger bg-red-50' : 'border-border bg-white hover:border-gray-300'}
        `}
      />
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
```

---

## Step 2.9 — Create shared `Button` component

**File:** `asset-manager-web/src/components/shared/Button.tsx`

```typescript
import { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
}

const variantMap = {
  primary: 'bg-primary text-white hover:bg-primary-700 focus:ring-primary',
  secondary: 'bg-white text-gray-700 border border-border hover:bg-gray-50 focus:ring-gray-300',
  danger: 'bg-danger text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
}

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  disabled,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${className}
      `}
      {...rest}
    >
      {loading ? <LoadingSpinner size="sm" /> : leftIcon}
      {children}
    </button>
  )
}
```

---

## Step 2.10 — Initialise auth sync in `main.tsx`

**File:** `asset-manager-web/src/main.tsx` (final for Phase 2)

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from '@/store'
import { router } from '@/router'
import { AppBootstrap } from '@/components/auth/AppBootstrap'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppBootstrap>
        <RouterProvider router={router} />
      </AppBootstrap>
    </Provider>
  </React.StrictMode>,
)
```

**File:** `asset-manager-web/src/components/auth/AppBootstrap.tsx`

```typescript
import { ReactNode, useEffect } from 'react'
import { useAuthStateSync } from '@/hooks/useAuthStateSync'
import { useUserRoleSync } from '@/hooks/useUserRoleSync'
import { useAppSelector } from '@/store/hooks'
import { selectAuthChecking } from '@/store/selectors/authSelectors'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface Props { children: ReactNode }

function AuthSyncInner({ children }: Props) {
  useAuthStateSync()
  useUserRoleSync()
  return <>{children}</>
}

export function AppBootstrap({ children }: Props) {
  const isChecking = useAppSelector(selectAuthChecking)

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  return <AuthSyncInner>{children}</AuthSyncInner>
}
```

> **Note:** If `selectAuthChecking` does not exist in `authSelectors.ts`, add it. It should return `true` while Firebase is determining the initial auth state (the `isRoleLoading` state in the mobile app serves this purpose).

---

## Step 2.11 — Verify Phase 2

```bash
npm run dev
```

1. Open `http://localhost:5173` — redirects to `/auth`
2. Sign up with a new email
3. After signup, screen shows "Dashboard — Phase 4 will implement this"
4. Refresh — stays on Dashboard (auth persisted)
5. Open a new incognito window — redirects to auth

**Phase 2 complete. Full authentication flow works.**

---

# PHASE 3 — App Shell (Sidebar + Navbar + Layout)

**Goal:** Responsive layout with role-based sidebar navigation. All 5 tabs from mobile map to sidebar links. Mobile hamburger menu collapses sidebar.

---

## Step 3.1 — Create `useUserRole` helper hook

**File:** `asset-manager-web/src/hooks/useUserRole.ts`

```typescript
import { useAppSelector } from '@/store/hooks'
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserRole,
} from '@/store/selectors/authSelectors'

export function useUserRole() {
  const isAdmin = useAppSelector(selectIsAdmin)
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge)
  const isSiteManager = useAppSelector(selectIsSiteManager)
  const userRole = useAppSelector(selectUserRole)

  const canSeeInventory = isAdmin || isStoreIncharge || isSiteManager
  const canSeeRequests = isAdmin || isStoreIncharge || isSiteManager
  const canSeePurchaseOrders = isAdmin || isStoreIncharge
  const canSeeSites = isAdmin
  const canSeeUsers = isAdmin
  const canSeeMaintenance = isAdmin || isStoreIncharge

  return {
    isAdmin,
    isStoreIncharge,
    isSiteManager,
    userRole,
    canSeeInventory,
    canSeeRequests,
    canSeePurchaseOrders,
    canSeeSites,
    canSeeUsers,
    canSeeMaintenance,
  }
}
```

---

## Step 3.2 — Define nav items

**File:** `asset-manager-web/src/config/navItems.ts`

```typescript
import {
  MdDashboard,
  MdInventory,
  MdAssignment,
  MdShoppingCart,
  MdLocationOn,
  MdBuild,
  MdPeople,
  MdHistory,
} from 'react-icons/md'
import type { ComponentType } from 'react'
import type { IconBaseProps } from 'react-icons'

export interface NavItem {
  key: string
  label: string
  path: string
  Icon: ComponentType<IconBaseProps>
  /** If true, show a badge with the count from Redux */
  badgeSelector?: string
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',      label: 'Dashboard',       path: '/dashboard',       Icon: MdDashboard },
  { key: 'inventory',      label: 'Inventory',       path: '/inventory',       Icon: MdInventory },
  { key: 'requests',       label: 'Requests',        path: '/requests',        Icon: MdAssignment },
  { key: 'purchase-orders',label: 'Purchase Orders', path: '/purchase-orders', Icon: MdShoppingCart },
  { key: 'maintenance',    label: 'Maintenance',     path: '/maintenance',     Icon: MdBuild },
  { key: 'sites',          label: 'Sites',           path: '/sites',           Icon: MdLocationOn },
  { key: 'users',          label: 'Users',           path: '/users',           Icon: MdPeople },
  { key: 'activity-log',   label: 'Activity Log',    path: '/activity-log',    Icon: MdHistory },
]
```

---

## Step 3.3 — Create `Sidebar` component

**File:** `asset-manager-web/src/components/layout/Sidebar.tsx`

```typescript
import { NavLink } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { NAV_ITEMS } from '@/config/navItems'
import { useAppSelector } from '@/store/hooks'
import { selectPendingRequestsCount } from '@/store/selectors/requestSelectors'
import { selectPendingApprovalCount } from '@/store/selectors/purchaseOrderSelectors'

interface Props {
  collapsed: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, onClose }: Props) {
  const role = useUserRole()
  const pendingRequests = useAppSelector(selectPendingRequestsCount)
  const pendingApprovals = useAppSelector(selectPendingApprovalCount)

  const badgeMap: Record<string, number> = {
    requests: pendingRequests ?? 0,
    'purchase-orders': pendingApprovals ?? 0,
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === 'inventory') return role.canSeeInventory
    if (item.key === 'requests') return role.canSeeRequests
    if (item.key === 'purchase-orders') return role.canSeePurchaseOrders
    if (item.key === 'maintenance') return role.canSeeMaintenance
    if (item.key === 'sites') return role.canSeeSites
    if (item.key === 'users') return role.canSeeUsers
    return true // dashboard, activity-log
  })

  return (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-border
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">AM</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 text-sm truncate">Asset Manager</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2 no-scrollbar">
        {visibleItems.map((item) => {
          const badge = badgeMap[item.key]
          return (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {badge > 0 && !collapsed && (
                <span className="ml-auto bg-danger text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {badge > 0 && collapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Role badge at bottom */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <span className="text-xs text-gray-400">
            Role: <strong className="text-gray-600">{role.userRole ?? 'Unassigned'}</strong>
          </span>
        </div>
      )}
    </aside>
  )
}
```

---

## Step 3.4 — Create `TopBar` component

**File:** `asset-manager-web/src/components/layout/TopBar.tsx`

```typescript
import { MdMenu, MdMenuOpen, MdNotifications, MdLogout } from 'react-icons/md'
import { useAppDispatch } from '@/store/hooks'
import { signOut } from '@/store/thunks/authThunks'
import { useAppSelector } from '@/store/hooks'
import { selectUser } from '@/store/selectors/authSelectors'

interface Props {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  pageTitle: string
}

export function TopBar({ sidebarCollapsed, onToggleSidebar, pageTitle }: Props) {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed
          ? <MdMenu size={22} />
          : <MdMenuOpen size={22} />
        }
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">{pageTitle}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications — placeholder, wired up in Phase 11 */}
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
          <MdNotifications size={22} />
        </button>

        {/* User avatar + sign out */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <span className="hidden md:block text-sm text-gray-700 max-w-[120px] truncate">
            {user?.displayName ?? user?.email}
          </span>
        </div>

        <button
          onClick={() => dispatch(signOut())}
          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-danger transition-colors"
          aria-label="Sign out"
        >
          <MdLogout size={20} />
        </button>
      </div>
    </header>
  )
}
```

---

## Step 3.5 — Create `PageTitleContext`

**File:** `asset-manager-web/src/context/PageTitleContext.tsx`

```typescript
import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface PageTitleContextValue {
  title: string
  setTitle: (title: string) => void
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: 'Dashboard',
  setTitle: () => {},
})

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState('Dashboard')
  const setTitle = useCallback((t: string) => setTitleState(t), [])
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitle() { return useContext(PageTitleContext) }
```

---

## Step 3.6 — Create `useSetPageTitle` hook

**File:** `asset-manager-web/src/hooks/useSetPageTitle.ts`

```typescript
import { useEffect } from 'react'
import { usePageTitle } from '@/context/PageTitleContext'

export function useSetPageTitle(title: string) {
  const { setTitle } = usePageTitle()
  useEffect(() => {
    setTitle(title)
    document.title = `${title} — Asset Manager`
  }, [title, setTitle])
}
```

---

## Step 3.7 — Create full `AppShell`

Replace the stub from Phase 2:

**File:** `asset-manager-web/src/components/layout/AppShell.tsx`

```typescript
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PageTitleProvider, usePageTitle } from '@/context/PageTitleContext'
import { useDashboardSubscriptions } from '@/hooks/useDashboardSubscriptions'
import { useInventoryAccessSync } from '@/hooks/useInventoryAccessSync'

function ShellInner() {
  // On desktop (≥ lg) sidebar starts expanded. On smaller screens it starts collapsed.
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024)
  // On mobile, sidebar is an overlay when open
  const [mobileOpen, setMobileOpen] = useState(false)
  const { title } = usePageTitle()

  // Start global real-time subscriptions
  useDashboardSubscriptions()
  useInventoryAccessSync()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile overlay, static on desktop */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-30
          md:flex md:flex-shrink-0
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={collapsed && window.innerWidth >= 768}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleSidebar}
          pageTitle={title}
        />
        <main className="flex-1 overflow-y-auto bg-surface">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <PageTitleProvider>
      <ShellInner />
    </PageTitleProvider>
  )
}
```

---

## Step 3.8 — Verify Phase 3

```bash
npm run dev
```

1. Desktop (≥ 1024px): sidebar visible on left, content on right, collapse button works
2. Tablet (768–1023px): sidebar collapses to icon-only strip
3. Mobile (< 768px): sidebar hidden, hamburger opens overlay drawer
4. NavLinks highlight on active route
5. Sign out button works

**Phase 3 complete. Responsive app shell is working.**

---

# PHASE 4 — Dashboard Page

**Goal:** Fully functional dashboard with role-based widgets: Greeting, Quick Stats, Low Stock Alerts, Pending Requests/Approvals.

---

## Step 4.1 — Add route to router

Update `src/router.tsx` — the `dashboard` route already exists from Phase 2 pointing to `DashboardPage`. Replace the stub content inside `DashboardPage` with the real implementation below.

---

## Step 4.2 — Create `DashboardPage`

**File:** `asset-manager-web/src/pages/dashboard/DashboardPage.tsx`

```typescript
import { useSetPageTitle } from '@/hooks/useSetPageTitle'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/store/hooks'
import { selectUser } from '@/store/selectors/authSelectors'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow'
import { LowStockAlertWidget } from '@/components/dashboard/LowStockAlertWidget'
import { PendingRequestsWidget } from '@/components/dashboard/PendingRequestsWidget'
import { PendingApprovalsWidget } from '@/components/dashboard/PendingApprovalsWidget'

export function DashboardPage() {
  useSetPageTitle('Dashboard')
  const { isAdmin, isStoreIncharge, canSeeRequests, canSeePurchaseOrders } = useUserRole()
  const user = useAppSelector(selectUser)

  return (
    <div className="space-y-6">
      <DashboardGreeting userName={user?.displayName ?? 'User'} />
      <QuickStatsRow />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(isAdmin || isStoreIncharge) && <LowStockAlertWidget />}
        {canSeeRequests && <PendingRequestsWidget />}
        {canSeePurchaseOrders && <PendingApprovalsWidget />}
      </div>
    </div>
  )
}
```

---

## Step 4.3 — `DashboardGreeting` component

**File:** `asset-manager-web/src/components/dashboard/DashboardGreeting.tsx`

```typescript
import { useMemo } from 'react'

interface Props { userName: string }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardGreeting({ userName }: Props) {
  const greeting = useMemo(getGreeting, [])
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">
        {greeting}, {userName.split(' ')[0]}
      </h2>
      <p className="text-gray-500 text-sm mt-1">Here's what's happening today.</p>
    </div>
  )
}
```

---

## Step 4.4 — `QuickStatsRow` component

**File:** `asset-manager-web/src/components/dashboard/QuickStatsRow.tsx`

```typescript
import { useAppSelector } from '@/store/hooks'
import { selectInventoryItems } from '@/store/selectors/inventorySelectors'
import { selectPendingRequestsCount } from '@/store/selectors/requestSelectors'
import { selectPendingApprovalCount } from '@/store/selectors/purchaseOrderSelectors'
import { selectMaintenanceRecords } from '@/store/selectors/maintenanceSelectors'
import { MdInventory, MdAssignment, MdShoppingCart, MdBuild } from 'react-icons/md'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export function QuickStatsRow() {
  const items = useAppSelector(selectInventoryItems)
  const pendingRequests = useAppSelector(selectPendingRequestsCount)
  const pendingPOs = useAppSelector(selectPendingApprovalCount)
  const maintenance = useAppSelector(selectMaintenanceRecords)

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Total Items" value={items?.length ?? 0} icon={<MdInventory size={24} className="text-blue-600" />} color="bg-blue-50" />
      <StatCard label="Pending Requests" value={pendingRequests ?? 0} icon={<MdAssignment size={24} className="text-amber-600" />} color="bg-amber-50" />
      <StatCard label="POs Pending Approval" value={pendingPOs ?? 0} icon={<MdShoppingCart size={24} className="text-green-600" />} color="bg-green-50" />
      <StatCard label="In Maintenance" value={maintenance?.length ?? 0} icon={<MdBuild size={24} className="text-purple-600" />} color="bg-purple-50" />
    </div>
  )
}
```

---

## Step 4.5 — `LowStockAlertWidget`

**File:** `asset-manager-web/src/components/dashboard/LowStockAlertWidget.tsx`

```typescript
import { useAppSelector } from '@/store/hooks'
import { selectInventoryItems } from '@/store/selectors/inventorySelectors'
import { useNavigate } from 'react-router-dom'
import { MdWarning } from 'react-icons/md'
import type { Item } from '@/types/inventory'

export function LowStockAlertWidget() {
  const items = useAppSelector(selectInventoryItems) as Item[]
  const navigate = useNavigate()

  const lowStockItems = items
    .filter((i) => i.totalQuantity <= (i.minStockLevel ?? 0))
    .slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MdWarning className="text-warning" size={20} />
          Low Stock Alerts
        </h3>
        <button
          onClick={() => navigate('/inventory')}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      </div>

      {lowStockItems.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">All items are well-stocked.</p>
      ) : (
        <ul className="space-y-3">
          {lowStockItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              onClick={() => navigate(`/inventory/${item.id}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-sm font-bold text-danger">{item.totalQuantity}</span>
                <span className="text-xs text-gray-400 ml-1">/ {item.minStockLevel} min</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Step 4.6 — `PendingRequestsWidget`

**File:** `asset-manager-web/src/components/dashboard/PendingRequestsWidget.tsx`

```typescript
import { useAppSelector } from '@/store/hooks'
import { selectRequests } from '@/store/selectors/requestSelectors'
import { useNavigate } from 'react-router-dom'
import { MdAssignment } from 'react-icons/md'
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge'
import type { Request } from '@/types/request'

export function PendingRequestsWidget() {
  const requests = useAppSelector(selectRequests) as Request[]
  const navigate = useNavigate()

  const pending = requests
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MdAssignment className="text-primary" size={20} />
          Pending Requests
        </h3>
        <button onClick={() => navigate('/requests')} className="text-xs text-primary hover:underline">
          View all
        </button>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((req) => (
            <li
              key={req.id}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              onClick={() => navigate(`/requests/${req.id}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{req.requestNumber}</p>
                <p className="text-xs text-gray-400 truncate">{req.purpose ?? 'No purpose stated'}</p>
              </div>
              <RequestStatusBadge status={req.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Step 4.7 — `PendingApprovalsWidget` (PO)

**File:** `asset-manager-web/src/components/dashboard/PendingApprovalsWidget.tsx`

```typescript
import { useAppSelector } from '@/store/hooks'
import { selectPurchaseOrders } from '@/store/selectors/purchaseOrderSelectors'
import { useNavigate } from 'react-router-dom'
import { MdShoppingCart } from 'react-icons/md'
import { POStatusBadge } from '@/components/purchaseOrders/POStatusBadge'
import type { PurchaseOrder } from '@/types/purchaseOrder'

export function PendingApprovalsWidget() {
  const pos = useAppSelector(selectPurchaseOrders) as PurchaseOrder[]
  const navigate = useNavigate()

  const pending = pos.filter((p) => p.status === 'pending_approval').slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MdShoppingCart className="text-success" size={20} />
          POs Pending Approval
        </h3>
        <button onClick={() => navigate('/purchase-orders')} className="text-xs text-primary hover:underline">
          View all
        </button>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No POs pending approval.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((po) => (
            <li
              key={po.id}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              onClick={() => navigate(`/purchase-orders/${po.id}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{po.poNumber}</p>
                <p className="text-xs text-gray-400">₹{po.totalAmount?.toLocaleString('en-IN')}</p>
              </div>
              <POStatusBadge status={po.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Step 4.8 — Create Status Badge components (needed by widgets)

**File:** `asset-manager-web/src/components/requests/RequestStatusBadge.tsx`

```typescript
import type { RequestStatus } from '@/types/request'

const map: Record<RequestStatus, { label: string; className: string }> = {
  draft:               { label: 'Draft',               className: 'bg-gray-100 text-gray-600' },
  pending:             { label: 'Pending',             className: 'bg-amber-100 text-amber-700' },
  approved:            { label: 'Approved',            className: 'bg-blue-100 text-blue-700' },
  rejected:            { label: 'Rejected',            className: 'bg-red-100 text-red-700' },
  transferred:         { label: 'Transferred',         className: 'bg-green-100 text-green-700' },
  partially_returned:  { label: 'Partial Return',      className: 'bg-purple-100 text-purple-700' },
  returned:            { label: 'Returned',            className: 'bg-teal-100 text-teal-700' },
  cancelled:           { label: 'Cancelled',           className: 'bg-gray-100 text-gray-500' },
}

interface Props { status: RequestStatus }

export function RequestStatusBadge({ status }: Props) {
  const { label, className } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${className}`}>
      {label}
    </span>
  )
}
```

**File:** `asset-manager-web/src/components/purchaseOrders/POStatusBadge.tsx`

```typescript
import type { PurchaseOrderStatus } from '@/types/purchaseOrder'

const map: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft:              { label: 'Draft',            className: 'bg-gray-100 text-gray-600' },
  pending_approval:   { label: 'Pending Approval', className: 'bg-amber-100 text-amber-700' },
  approved:           { label: 'Approved',         className: 'bg-blue-100 text-blue-700' },
  ordered:            { label: 'Ordered',          className: 'bg-indigo-100 text-indigo-700' },
  partially_received: { label: 'Partial Receipt',  className: 'bg-purple-100 text-purple-700' },
  received:           { label: 'Received',         className: 'bg-green-100 text-green-700' },
  rejected:           { label: 'Rejected',         className: 'bg-red-100 text-red-700' },
}

interface Props { status: PurchaseOrderStatus }

export function POStatusBadge({ status }: Props) {
  const { label, className } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${className}`}>
      {label}
    </span>
  )
}
```

---

## Step 4.9 — Verify Phase 4

```bash
npm run dev
```

1. Login as Admin → see all 4 stat cards and both widgets
2. Login as SiteManager → see requests widget but not low stock or PO widget
3. Stats update in real-time (Firestore subscriptions active via AppShell)

**Phase 4 complete. Dashboard is fully functional.**

