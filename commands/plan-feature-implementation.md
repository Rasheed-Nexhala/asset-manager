---
name: plan-feature-implementation
description: Analyze the given feature requirement and create a comprehensive implementation plan by examining the complete application architecture. Uses 4 subagents in parallel, then synthesizes findings into a step-by-step plan.
---

Analyze the given feature requirement and create a comprehensive implementation plan by examining the complete application architecture.

## Implementation Process

Use **4 subagents in parallel** to analyze different aspects, then synthesize their findings into a step-by-step implementation plan.

### Subagent 1: Application Architecture Analysis
**Task**: Map the current application structure
- Read `App.tsx` to understand app initialization (Redux store, auth hooks, navigation)
- Read `src/store/index.ts` to see existing Redux slices
- List all files in `src/store/` to identify existing state management
- Read `src/navigation/RootNavigator.tsx` and `src/navigation/BottomTabNavigator.tsx` to understand navigation flow
- List all screens in `src/screens/` and identify existing screen patterns
- List all components in `src/components/` to identify reusable components
- **Output**: Document current architecture: Redux slices, navigation structure, screen organization, component library

### Subagent 2: Firebase & Services Analysis
**Task**: Identify available Firebase features and services
- Read all files in `src/services/firebase/` (authService, userRoleService, etc.)
- Check `config/firebase.ts` or `config/firebase.js` to see Firebase initialization
- Identify which Firebase features are configured (Auth, Firestore, Storage, Functions)
- Document existing auth flows and methods available
- Check if Firestore collections are defined anywhere (types, interfaces, service files)
- Check if Cloud Storage is configured and used
- **Output**: List available Firebase services, auth methods, existing Firestore collections, Storage usage patterns

### Subagent 3: Authentication & Authorization Analysis
**Task**: Map authentication and role-based access patterns
- Read `src/services/firebase/authService.ts` thoroughly
- Check for `useAuth` or similar auth hooks in `src/hooks/`
- Read auth-related Redux slices (authSlice, selectors, thunks)
- Identify role management system (read `userRoleService.ts`)
- Check navigation guards or protected routes
- Identify current user roles (admin, manager, user, etc.)
- **Output**: Document auth methods available, user roles, role sync mechanism, protected route patterns

### Subagent 4: UI Patterns & Design System Analysis
**Task**: Identify UI patterns and design conventions
- Read `.cursor/skills/ciams-design-system/SKILL.md` or plugin equivalent to understand design system
- List and categorize existing components (form components, cards, headers, etc.)
- Identify common NativeWind patterns used across components
- Check existing form validation patterns
- Identify navigation patterns (stack, tabs, modals)
- Look for loading states, error handling UI patterns
- **Output**: Document reusable components, design patterns, form patterns, navigation patterns

---

## Synthesis Phase (Single Agent)

After all 4 subagents complete, **synthesize their outputs** and create the implementation plan:

### 1. Requirement Analysis
- Break down the feature requirement into specific capabilities
- Identify user stories and use cases
- Determine which user roles can access this feature

### 2. Architecture Fit Assessment
- Determine if new Redux slices are needed or if existing ones can be extended
- Identify which Firebase services are required (Auth, Firestore, Storage, Functions)
- Determine navigation changes needed (new screens, new tabs, modal overlays)
- Identify reusable components vs new components needed

### 3. Implementation Plan (Step-by-Step)

Provide a **precise, ordered implementation plan** following this structure:

#### Phase 1: Data & Backend Setup
- **Firebase Setup**: Which Firestore collections/documents to create, Storage folders, security rules
- **Redux Store**: New slices needed or modifications to existing slices (state shape, actions, thunks)
- **Services**: New service files or methods to add to existing services

#### Phase 2: Component Development
- **Reusable Components**: Which existing components to use (FormField, ScreenHeader, etc.)
- **New Components**: List components to create with their responsibilities
- **Design System**: Reference CIAMS design system patterns and NativeWind classes to use

#### Phase 3: Screen Development
- **New Screens**: List screens to create with their purpose
- **Screen Modifications**: Existing screens to modify
- **Navigation**: Where screens fit in navigation (stack, tabs, modals)

#### Phase 4: Integration
- **Auth Integration**: How auth/roles affect the feature (protected routes, role checks)
- **State Integration**: How components connect to Redux (selectors, dispatch)
- **Navigation Integration**: Navigation flow and screen transitions

#### Phase 5: Polish & Testing
- **Error Handling**: Error states and user feedback patterns
- **Loading States**: Loading indicators and optimistic updates
- **Validation**: Form validation and data validation
- **Testing**: Suggest test coverage (unit tests, component tests)

### 4. Existing Code Utilization
List specific files and their roles:
- **Services**: `src/services/firebase/authService.ts` - which methods to use
- **Redux**: `src/store/slices/authSlice.ts` - which selectors/actions
- **Components**: `src/components/FormField.tsx` - how to reuse
- **Hooks**: `src/hooks/useAuth.ts` - which hooks to leverage
- **Navigation**: How to integrate with `RootNavigator` and `BottomTabNavigator`

### 5. Implementation Order
Provide the **best sequential order** with dependencies clearly marked:
1. First: Backend/Firebase setup (collections, rules)
2. Then: Services layer (Firebase operations)
3. Then: Redux layer (state management)
4. Then: Reusable components (bottom-up)
5. Then: Screens (compose components)
6. Finally: Navigation integration

---

## Output Format

Present the plan in clear sections with:
- ✅ **Existing resources to use** (with file paths)
- 🆕 **New files to create** (with purposes)
- 🔧 **Files to modify** (with specific changes)
- 📋 **Step-by-step implementation order**
- ⚠️ **Considerations** (edge cases, security, performance)

**DO NOT create any markdown files** - provide the plan as conversational output directly to the user.

**Focus on precision**: Reference actual file paths, actual component names, actual Redux slice names from the application analysis.
