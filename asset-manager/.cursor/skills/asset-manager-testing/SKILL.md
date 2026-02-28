---
name: asset-manager-testing
description: Test the CIAMS Asset Manager app using Jest and React Native Testing Library. Covers utilities, Redux slices, hooks, components, and screens. Use when writing tests, adding test coverage, or when the user asks to test features in the asset manager application.
---

# Asset Manager Testing

## Quick Start

When testing this app, follow the order in [docs/testing-order.md](../../docs/testing-order.md): utilities → Redux slices → hooks → components → screens.

## Test Infrastructure

Create `src/__tests__/utils/renderWithProviders.tsx` with a custom render that wraps components in Redux Provider and SafeAreaProvider. Use the same reducer structure as `src/store/index.ts` (auth, sites, inventory, requests, steelMaster, maintenance, activityLog, purchaseOrders).

```typescript
export function renderWithProviders(ui, { preloadedState = {}, ...options } = {}) {
  const store = createMockStore(preloadedState);
  const Wrapper = ({ children }) => (
    <Provider store={store}><SafeAreaProvider>{children}</SafeAreaProvider></Provider>
  );
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
```

## Query Priority

1. `getByRole` / `getByAccessibilityLabel` — preferred (components already use accessibilityLabel)
2. `getByText` — for visible text
3. `getByPlaceholderText` — for inputs
4. `getByTestId` — last resort; add `testID` prop to component when needed

## App-Specific Mocks

### Firebase Auth Thunks

```typescript
jest.mock('../../store/thunks/authThunks', () => ({
  signInUser: jest.fn(() => ({ type: 'auth/signInUser/pending', unwrap: () => Promise.resolve() })),
  signUpUser: jest.fn(),
  signOutUser: jest.fn(),
}));
```

### Navigation

```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));
```

### Firebase Subscriptions (e.g. useDashboardSubscriptions)

```typescript
jest.mock('../../hooks/useDashboardSubscriptions', () => ({
  useDashboardSubscriptions: () => ({ isInitialLoad: false, triggerRefresh: jest.fn() }),
}));
```

### Expo Vector Icons

`@expo/vector-icons` is mocked globally via `moduleNameMapper` in `package.json` (see `jest/mocks/@expo-vector-icons.js`). **Do not add** `jest.mock('@expo/vector-icons', ...)` in individual test files.

## Key Components to Test

| Component | Props | Test Focus |
|-----------|-------|------------|
| RequestCard | request, onPress, showAvailability, isAllSufficient | Rendering, press, priority emoji, availability text |
| ItemCard | item, onPress | Name, SKU, stock, low stock badge |
| SiteCard | site, onPress | Name, address, manager |
| FormField | label, value, onChangeText, error | Label, value display, error display |
| LoginScreen | onGoToSignup | Validation, loading, auth error from Redux |
| DashboardScreen | — | Role-based widgets (Admin/StoreIncharge/SiteManager) |

## Redux Preloaded State

For screens that use `useAppSelector`, pass `preloadedState` to `renderWithProviders`:

```typescript
renderWithProviders(<LoginScreen />, {
  preloadedState: {
    auth: { isLoading: true, error: null, user: null, isAuthenticated: false },
  },
});
```

## testID Placement

Add `testID` only when other queries fail. Common placements:
- List items: `testID="list-item"` or `testID="request-card"`
- Loading spinners: `testID="loading-spinner"`
- Empty states: `testID="empty-state"`
- Modal containers: `testID="modal-content"`

## Arrange-Act-Assert

Structure each test:
1. **Arrange**: Render with `renderWithProviders`, set preloadedState if needed
2. **Act**: `fireEvent.press`, `fireEvent.changeText`, etc.
3. **Assert**: `expect(screen.getByText(...)).toBeTruthy()` or `expect(mockFn).toHaveBeenCalledWith(...)`

## Additional Resources

- For testing order (easy → difficult), see [docs/testing-order.md](../../../docs/testing-order.md)
- For concrete examples, see [examples.md](examples.md)
- For Jest/RNTL patterns, see [jest-react-native](../jest-react-native/SKILL.md) and [react-native-testing-library](../react-native-testing-library/SKILL.md)
