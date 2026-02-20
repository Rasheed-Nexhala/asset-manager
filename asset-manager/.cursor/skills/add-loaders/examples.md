# Loader Examples

## ❌ Bad: Text-Only (No Spinner)

Never show only text during loading:

```tsx
// BAD - no actual loader
if (loading) {
  return <Text>Loading...</Text>;
}
```

Always include `ActivityIndicator`:

```tsx
// GOOD
if (loading) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
    </View>
  );
}
```

---

## Before/After: Screen with Initial Fetch

**Before** (no loader):
```tsx
export const UsersScreen = () => {
  const users = useAppSelector(selectAllUsers);
  const loading = useAppSelector(selectUsersLoading);

  return (
    <ScreenLayout>
      <FlatList data={users} ... />
    </ScreenLayout>
  );
};
```

**After** (full-screen loader when no data):
```tsx
if (loading && users.length === 0) {
  return (
    <ScreenLayout>
      <View className="flex-1 items-center justify-center px-4">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-[15px] text-[#64748B] mt-4">Loading users...</Text>
      </View>
    </ScreenLayout>
  );
}
return ( ... );
```

---

## Before/After: Form Submit Button

**Before**:
```tsx
<TouchableOpacity onPress={handleSave}>
  <Text>Save</Text>
</TouchableOpacity>
```

**After**:
```tsx
<TouchableOpacity
  disabled={isLoading}
  onPress={handleSave}
  accessibilityLabel={isLoading ? 'Saving, please wait' : 'Save'}
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
>
  {isLoading ? (
    <>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text>Please wait…</Text>
    </>
  ) : (
    <Text>Save</Text>
  )}
</TouchableOpacity>
```

---

## Before/After: Modal with Async Options

**Before** (options load async, no feedback):
```tsx
<Modal visible={visible}>
  <FlatList data={options} ... />
</Modal>
```

**After**:
```tsx
<Modal visible={visible}>
  {loading && options.length === 0 ? (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text className="text-[15px] text-[#64748B] mt-4">Loading options...</Text>
    </View>
  ) : (
    <FlatList data={options} ... />
  )}
</Modal>
```
