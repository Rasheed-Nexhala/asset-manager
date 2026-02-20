---
name: react-native-standards
description: Enforces React Native coding standards including functional components, naming conventions, TypeScript interfaces, StyleSheet usage, hooks optimization, and folder structure. Use when writing React Native code, creating components, or structuring React Native projects.
---

# React Native Coding Standards

## Basic Rules

- **Always use `const` or `let`** to declare variables. Use `const` by default, unless a variable needs to be reassigned.
- **Always use functional components** - no class components.
- **No nested components** or `getComponent` inside render method. Always separate components into their own files when possible.

## Naming Conventions

- **PascalCase**: For React Native components and TypeScript interfaces
- **camelCase**: For variables, functions, and object properties
- **CONSTANT_CASE**: For global constants and enums

```typescript
// CONSTANT_CASE
const PRIMARY_COLOR = '#FF0000';
const FONT_SIZE_LARGE = 18;
const API_ENDPOINT = 'https://api.example.com';

// PascalCase for components and interfaces
interface UserProfile {
  firstName: string;  // camelCase
  lastName: string;   // camelCase
}

const UserCard = () => {  // PascalCase component
  // ...
};
```

## Type System

- **Always define types** when possible
- **`any` type is restricted** - avoid using `any` unless absolutely necessary

### Interfaces (TypeScript)

Always use interfaces to define object shapes:

```typescript
interface Person {
  name: string;
  age: number;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}
```

## Source Organization

### Imports

- **Use absolute paths** when possible
- **Use relative paths** only when referring to files within the same directory

```typescript
// Absolute path (preferred)
import { Button } from '@/components/Button';
import { UserService } from '@/services/UserService';

// Relative path (same directory only)
import { helper } from './helper';
```

### Exports

- **Prefer named exports** over default exports
- **Use file scope** for namespacing
- **Use the same name** when importing a default module

## Styles

### Component Styles

- **Always create separate style files** when creating a new component
- **Don't use inline styling** - always use `StyleSheet.create()`

```typescript
// styles.ts (separate file)
const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: 'Inter-Medium', fontSize: 18, color: '#000' },
});

export default styles;

// Component usage
import styles from './styles';

const MyComponent = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Hello</Text>
  </View>
);
```

**Never use inline styles:**
```typescript
// ❌ Bad
<Text style={{ fontSize: 16, color: 'red' }}>Hello</Text>

// ✅ Good
<Text style={styles.title}>Hello</Text>
```

## Consistency

### Arrow Functions

- **Use arrow functions** when declaring functions instead of traditional function syntax
- Use for event handlers, functional components, and callbacks

```typescript
// ✅ Good - Arrow function component
const MyComponent = () => {
  return <Text>Hello, React Native!</Text>;
};

// ❌ Avoid - Traditional function
function MyComponent() {
  return <Text>Hello</Text>;
}
```

## Hooks API

### useCallback & useMemo

- **Use `useCallback`** when memoizing functions
- **Use `useMemo`** when memoizing computed values
- **Only use when dependencies change** - don't overuse

```typescript
// ❌ Bad - Function recreated on every render
const FooComponent = () => {
  const onPress = () => { /* ... */ };
  return <Bar onPress={onPress} />;
};

// ✅ Good - Function memoized with dependencies
const FooComponent = ({ a, b }) => {
  const onPress = useCallback(() => { /* ... */ }, [a, b]);
  return <Bar onPress={onPress} />;
};

// ✅ Good - Memoized computed value
const ExpensiveComponent = ({ items }) => {
  const sortedItems = useMemo(() => items.sort((a, b) => a.value - b.value), [items]);
  return <List items={sortedItems} />;
};
```

## Redux Selectors

- **Use selectors** to pick values from Redux state
- Prefer selector functions over direct state access

## Folder Structure

Follow this standard folder structure:

```
src/
├── components/      # Common reusable components (Button, Input, etc.)
├── screens/        # Application screens/features
├── navigations/    # Navigation configs and navigators
├── services/       # Common services (API calls, etc.)
├── utils/          # Utility functions (calculations, formatters, constants)
├── types/          # TypeScript interfaces and enums
├── redux/          # Redux actions, reducers, and store
└── assets/         # Images, vectors, fonts, etc.

App.tsx             # Main component that starts the app
index.ts            # Entry point of the application
```

### Folder Guidelines

- **`components/`**: Generic, reusable components used across the app
- **`screens/`**: Feature-specific screens/pages
- **`services/`**: API calls, external service integrations
- **`utils/`**: Pure utility functions, helpers, constants
- **`types/`**: Shared TypeScript types, interfaces, enums
- **`redux/`**: State management (actions, reducers, store)
- **`assets/`**: Static assets (images, fonts, icons)

## Quick Reference Checklist

When creating a new component:

- [ ] Uses functional component with arrow function
- [ ] Uses `const` for variable declarations
- [ ] Has TypeScript interface for props
- [ ] Styles in separate `styles.ts` file using `StyleSheet.create()`
- [ ] No inline styles
- [ ] Uses absolute imports when possible
- [ ] Named exports preferred
- [ ] `useCallback`/`useMemo` used appropriately for optimization
- [ ] Component name follows PascalCase
- [ ] Placed in correct folder (`components/` vs `screens/`)
