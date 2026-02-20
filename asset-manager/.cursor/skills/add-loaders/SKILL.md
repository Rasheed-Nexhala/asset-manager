---
name: add-loaders
description: Add loading states and loaders to UI components and screens. Use when adding loaders, implementing loading states, improving UX during async operations, or when the user provides components that need loading indicators. Covers full-screen, button, inline, modal, list, refresh, and skeleton loaders for React Native and web apps.
---

# Adding Loaders to UI Components

Add appropriate loading indicators wherever async work occurs. Missing loaders cause confusion; overloading causes clutter. **Every loader must include an actual spinner** (`ActivityIndicator` in React Native); text like "Loading..." alone is not sufficient—it supplements the spinner. This skill defines loader types, when to use each, and implementation patterns.

## Loader Types and When to Use

| Type | When to Use | Example |
|------|-------------|---------|
| **Full-screen** | Initial data fetch, no content yet | List screen before first load |
| **Button** | Form submit, single action | Login, Save, Submit |
| **Inline** | Section or card loading | Widget, partial content |
| **Modal** | Modal content fetching | Selector with async options |
| **List** | Pagination, infinite scroll | "Load more" at list bottom |
| **Refresh** | Pull-to-refresh | Swipe down on list |
| **Skeleton** | Content layout known | Cards, tables (optional) |

## Quick Decision Flow

```
Async operation?
├── Initial load, no UI yet? → Full-screen loader
├── User-triggered action (button)? → Button loader
├── Part of screen loading? → Inline loader
├── Modal fetching data? → Modal content loader
├── Pagination / load more? → List footer loader
└── Pull-to-refresh? → RefreshControl
```

---

## 1. Full-Screen Loader

**When**: Screen depends on data; nothing meaningful to show until loaded.

**Pattern**:
```tsx
if (loading && items.length === 0) {
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="..." showBack onBackPress={handleBack} />
      <View className="flex-1 items-center justify-center px-4">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-[15px] text-[#64748B] mt-4">
          Loading...
        </Text>
      </View>
    </ScreenLayout>
  );
}
```

**Rules**:
- Show only when `loading && data.length === 0` (not on refresh)
- Include ScreenHeader if screen has one
- Use `size="large"`, primary color
- Optional: retry button on error

---

## 2. Button Loader

**When**: User taps a button that triggers async work (submit, save, delete).

**Pattern**:
```tsx
<TouchableOpacity
  className={`rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
    isLoading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
  }`}
  disabled={isLoading}
  onPress={handleSubmit}
  accessibilityLabel={isLoading ? 'Saving, please wait' : 'Save'}
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
>
  {isLoading ? (
    <>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
    </>
  ) : (
    <Text className="text-[15px] font-semibold text-white">Save</Text>
  )}
</TouchableOpacity>
```

**Rules**:
- `disabled={isLoading}` to prevent double-tap
- `size="small"` for button, white color on primary buttons
- `accessibilityState={{ busy: isLoading }}` for screen readers
- Dim button slightly when loading (`opacity-70` or similar)

---

## 3. Inline Loader

**When**: A section (card, widget) loads independently; rest of screen is visible.

**Pattern**:
```tsx
if (loading) {
  return (
    <View className="p-4 items-center justify-center min-h-[120px]">
      <ActivityIndicator size="small" color="#1E40AF" />
      <Text className="text-[13px] text-[#64748B] mt-2">Loading...</Text>
    </View>
  );
}
```

**Rules**:
- Use `size="small"` to avoid dominating the section
- Reserve min-height so layout doesn't jump

---

## 4. Modal Content Loader

**When**: Modal opens and needs to fetch options (users, sites, categories).

**Pattern**:
```tsx
// Inside modal body
{loading && items.length === 0 ? (
  <View className="flex-1 items-center justify-center py-12">
    <ActivityIndicator size="large" color="#1E40AF" />
    <Text className="text-[15px] text-[#64748B] mt-4">
      Loading options...
    </Text>
  </View>
) : (
  <FlatList data={items} ... />
)}
```

**Rules**:
- Keep modal header visible; only content area shows loader
- If modal has a submit button, consider disabling it while loading

---

## 5. List Footer Loader (Pagination)

**When**: Loading more items at bottom of list.

**Pattern**:
```tsx
<FlatList
  data={items}
  ListFooterComponent={
    loadingMore ? (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#1E40AF" />
      </View>
    ) : null
  }
  onEndReached={loadMore}
  onEndReachedThreshold={0.3}
/>
```

**Rules**:
- Use `size="small"` so it doesn't dominate
- Only show when `loadingMore`; hide when done or no more data

---

## 6. Pull-to-Refresh

**When**: User can refresh list/screen content.

**Pattern**:
```tsx
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await dispatch(fetchItems()).unwrap();
  setRefreshing(false);
}, [dispatch]);

<FlatList
  data={items}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#1E40AF']}
      tintColor="#1E40AF"
    />
  }
/>
```

**Rules**:
- Don't show full-screen loader during refresh; use RefreshControl only
- Set `refreshing` to false in `finally` to handle errors

---

## 7. Skeleton Loader (Optional)

**When**: Layout is known; skeleton improves perceived performance.

**Pattern** (conceptual):
```tsx
// Placeholder blocks matching content layout
{loading ? (
  <View className="gap-3">
    {[1,2,3].map(i => (
      <View key={i} className="h-20 bg-[#E2E8F0] rounded-[10px] animate-pulse" />
    ))}
  </View>
) : (
  <ActualContent />
)}
```

---

## Implementation Checklist

When auditing a component for loaders:

1. **Identify async operations**
   - Data fetches (Redux thunks, RTK Query, useEffect + fetch)
   - Form submissions
   - Modal/dropdown data loading
   - Pagination, refresh

2. **Map to loader type**
   - Initial fetch → full-screen
   - Submit/save/delete → button
   - Section/widget → inline
   - Modal options → modal content
   - Load more → list footer
   - Refresh → RefreshControl

3. **Add loading state**
   - Redux: use selector (e.g. `selectItemsLoading`)
   - Local: `useState(false)` and set in async handler
   - Ensure `loading` is set true at start, false in `finally`

4. **Handle error and empty**
   - Error: show message + retry if appropriate
   - Empty: show empty state, not loader

5. **Accessibility**
   - `accessibilityState={{ disabled, busy }}` on buttons
   - `accessibilityLabel` that reflects loading (e.g. "Saving, please wait")

---

## React Native Specifics

- **Always use `ActivityIndicator`** — Every loading state must show an actual spinner. Text like "Loading..." alone is not a loader; it supplements the spinner.
- Use `ActivityIndicator` from `react-native`
- Colors: `#1E40AF` (primary), `#FFFFFF` (on dark buttons)
- Sizes: `large` for full-screen/inline blocks, `small` for buttons/list footer
- Wrap in `View` with `flex-1 items-center justify-center` for centered full-screen

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| **Text-only loading** (no spinner) | Always include `ActivityIndicator`; text is optional supplement |
| Full-screen loader on every refresh | Use RefreshControl; full-screen only when `data.length === 0` |
| No button disable during submit | `disabled={isLoading}` |
| Loader without accessibility | Add `accessibilityState={{ busy }}` |
| Loading state never reset on error | Use `finally` or `catch` to set loading false |
| Modal submit enabled while options load | Disable primary action when `loading` |

---

## Reference

For CIAMS design tokens (colors, spacing), see [ciams-design-system/SKILL.md](../ciams-design-system/SKILL.md).
