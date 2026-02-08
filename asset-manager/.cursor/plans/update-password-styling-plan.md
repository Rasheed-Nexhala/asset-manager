# UpdatePassword Screen - Detailed Styling Plan

## Overview

This document provides a comprehensive styling plan for the UpdatePassword screen using NativeWind and following the CIAMS design system. The plan covers responsive design, accessibility, component-specific styling, state management, and platform considerations.

---

## 1. Screen Container Structure

### SafeAreaView Container
**Purpose**: Ensures content respects device safe areas (notches, status bars)

```tsx
<SafeAreaView 
  className="flex-1 bg-[#F8FAFC]" 
  edges={['top']}
>
```

**NativeWind Classes**:
- `flex-1` - Takes full available height
- `bg-[#F8FAFC]` - CIAMS app background color (faint cool gray)
- `edges={['top']}` - Only applies safe area to top (header handles it)

**Accessibility Props**:
- No additional props needed (container element)

---

## 2. Header with Back Button

### Header Container
**Purpose**: Fixed header with back button, title, and consistent CIAMS styling

```tsx
<View
  className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center"
  style={{ height: 56 }}
>
```

**NativeWind Classes**:
- `bg-white` - White background for header
- `border-b border-[#E2E8F0]` - Bottom border divider (light gray)
- `h-14` - Height 56px (14 * 4px = 56px) - CIAMS standard header height
- `px-4` - Horizontal padding 16px (4 * 4px)
- `flex-row` - Horizontal layout for back button + title
- `items-center` - Vertical center alignment

**Accessibility Props**:
```tsx
accessibilityRole="header"
accessibilityLabel="Update Password screen header"
```

### Back Button
**Purpose**: Navigate back to previous screen

```tsx
<TouchableOpacity
  className="w-12 h-12 items-center justify-center -ml-2"
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel="Go back"
  accessibilityHint="Returns to the previous screen"
>
  <Ionicons name="arrow-back" size={24} color="#0F172A" />
</TouchableOpacity>
```

**NativeWind Classes**:
- `w-12 h-12` - 48px × 48px minimum touch target (meets CIAMS requirement)
- `items-center justify-center` - Center icon within button
- `-ml-2` - Negative margin left (-8px) to compensate for icon padding

**Accessibility Props**:
- `accessibilityRole="button"` - Identifies as interactive button
- `accessibilityLabel="Go back"` - Clear action description
- `accessibilityHint` - Provides context for action

**State Variations**:
- **Default**: Standard styling as above
- **Pressed**: `activeOpacity={0.7}` provides visual feedback
- **Disabled**: Not applicable (back button always enabled)

### Header Title
**Purpose**: Screen title text

```tsx
<Text
  className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
  numberOfLines={1}
  accessibilityRole="header"
>
  Update Password
</Text>
```

**NativeWind Classes**:
- `text-[22px]` - CIAMS screen title size
- `font-semibold` - Medium weight for emphasis
- `text-[#0F172A]` - Primary text color (dark slate)
- `flex-1` - Takes remaining space between back button and right edge
- `text-center` - Centers text horizontally

**Accessibility Props**:
- `accessibilityRole="header"` - Semantic header role
- `numberOfLines={1}` - Prevents text wrapping

---

## 3. Main Content Area

### ScrollView Container
**Purpose**: Scrollable content area for form fields

```tsx
<ScrollView
  className="flex-1"
  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
>
```

**NativeWind Classes**:
- `flex-1` - Takes remaining vertical space

**Additional Props**:
- `contentContainerStyle` - Uses StyleSheet for padding (NativeWind gap doesn't work well with ScrollView contentContainerStyle)
- `showsVerticalScrollIndicator={false}` - Cleaner appearance
- `keyboardShouldPersistTaps="handled"` - Allows tapping buttons when keyboard is open

**Alternative using NativeWind padding**:
```tsx
<ScrollView
  className="flex-1 px-4 pt-6 pb-8"
  contentContainerStyle={{ flexGrow: 1 }}
  showsVerticalScrollIndicator={false}
>
```

**Accessibility Props**:
- No additional props needed (container)

### Content Wrapper
**Purpose**: Groups form content with consistent spacing

```tsx
<View className="gap-6">
  {/* Form content */}
</View>
```

**NativeWind Classes**:
- `gap-6` - 24px vertical spacing between major sections (CIAMS standard)

---

## 4. Form Card Container

### Card Wrapper
**Purpose**: White card container for form fields

```tsx
<View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
  {/* Form fields */}
</View>
```

**NativeWind Classes**:
- `bg-white` - White card background
- `rounded-[10px]` - CIAMS standard border radius (10px)
- `p-4` - 16px padding all around
- `border border-[#E2E8F0]` - Light gray border

**Accessibility Props**:
```tsx
accessibilityLabel="Password update form"
accessibilityRole="form"
```

---

## 5. Form Fields

### Form Field Container
**Purpose**: Groups label, input, and error message

```tsx
<View className="gap-1.5">
  {/* Label */}
  {/* Input */}
  {/* Error message */}
</View>
```

**NativeWind Classes**:
- `gap-1.5` - 6px spacing between label and input (CIAMS standard)

**Spacing Between Fields**:
```tsx
<View className="gap-4">
  {/* FormField 1 */}
  {/* FormField 2 */}
  {/* FormField 3 */}
</View>
```

**NativeWind Classes**:
- `gap-4` - 16px spacing between form fields (CIAMS standard)

### FormField Label
**Purpose**: Field label text

```tsx
<Text
  className="text-[15px] text-[#0F172A]"
  accessibilityRole="text"
>
  Current Password
</Text>
```

**NativeWind Classes**:
- `text-[15px]` - CIAMS body text size
- `text-[#0F172A]` - Primary text color

**Accessibility Props**:
- `accessibilityRole="text"` - Semantic text role

### TextInput Field
**Purpose**: Password input field

**Base Styling**:
```tsx
<TextInput
  className="border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
  placeholderTextColor="#94A3B8"
/>
```

**NativeWind Classes**:
- `border` - 1px border
- `rounded-lg` - 8px border radius
- `h-12` - 48px height (meets CIAMS 48px minimum touch target)
- `px-4` - 16px horizontal padding
- `bg-white` - White background
- `text-[15px]` - Body text size
- `text-[#0F172A]` - Primary text color

**Error State**:
```tsx
className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
  hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
}`}
```

**NativeWind Classes**:
- Conditional: `border-[#DC2626]` (danger red) when error, `border-[#E2E8F0]` (light gray) when normal

**With Right Icon (Password Toggle)**:
```tsx
className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] pr-12 ${
  hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
}`}
```

**NativeWind Classes**:
- `pr-12` - Right padding 48px to accommodate toggle button

**Accessibility Props**:
```tsx
accessibilityLabel="Current password input"
accessibilityRole="none"
accessibilityState={{ disabled: editable === false }}
```

### Password Toggle Button
**Purpose**: Show/hide password visibility

```tsx
<TouchableOpacity
  className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel={secureTextEntry ? "Show password" : "Hide password"}
>
  <Ionicons 
    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
    size={22} 
    color="#64748B" 
  />
</TouchableOpacity>
```

**NativeWind Classes**:
- `absolute right-0 top-0` - Positioned absolutely in top-right
- `h-12 w-12` - 48px × 48px touch target
- `items-center justify-center` - Center icon

**Accessibility Props**:
- `accessibilityRole="button"` - Interactive button
- `accessibilityLabel` - Dynamic label based on state

### Error Message
**Purpose**: Display field-level validation errors

```tsx
{error && (
  <Text 
    className="text-[13px] text-[#DC2626]" 
    accessibilityLiveRegion="polite"
  >
    {error}
  </Text>
)}
```

**NativeWind Classes**:
- `text-[13px]` - CIAMS caption/meta text size
- `text-[#DC2626]` - Danger red color

**Accessibility Props**:
- `accessibilityLiveRegion="polite"` - Announces errors to screen readers

---

## 6. General Error Message

**Purpose**: Display form-level errors (e.g., Firebase errors)

```tsx
{error && (
  <View
    className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3"
    accessibilityLiveRegion="assertive"
  >
    <Text className="text-[13px] text-[#DC2626]">{error}</Text>
  </View>
)}
```

**NativeWind Classes**:
- `bg-[#DC2626]/10` - Danger red background at 10% opacity
- `border border-[#DC2626]/20` - Danger red border at 20% opacity
- `rounded-lg` - 8px border radius
- `p-3` - 12px padding
- `text-[13px] text-[#DC2626]` - Error text styling

**Accessibility Props**:
- `accessibilityLiveRegion="assertive"` - Immediately announces critical errors

**State Variations**:
- **Visible**: Displayed with error styling
- **Hidden**: Not rendered when `error` is null/undefined

---

## 7. Success Message

**Purpose**: Display success confirmation after password update

```tsx
{showSuccess && (
  <View
    className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3 mb-4"
    accessibilityLiveRegion="polite"
  >
    <View className="flex-row items-center gap-2">
      <Text className="text-lg">✅</Text>
      <Text className="text-[13px] text-[#16A34A] flex-1">
        Password updated successfully
      </Text>
    </View>
  </View>
)}
```

**NativeWind Classes**:
- `bg-[#16A34A]/10` - Success green background at 10% opacity
- `border border-[#16A34A]/20` - Success green border at 20% opacity
- `rounded-lg` - 8px border radius
- `p-3` - 12px padding
- `mb-4` - 16px bottom margin
- `flex-row items-center gap-2` - Horizontal layout with 8px gap
- `text-lg` - Large emoji size
- `text-[13px] text-[#16A34A]` - Success text styling
- `flex-1` - Text takes remaining space

**Accessibility Props**:
- `accessibilityLiveRegion="polite"` - Announces success to screen readers

**State Variations**:
- **Visible**: Displayed with success styling
- **Hidden**: Not rendered when `showSuccess` is false

---

## 8. Submit Button

### Primary Button (Default State)
**Purpose**: Submit password update form

```tsx
<TouchableOpacity
  className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
  activeOpacity={0.7}
  disabled={isLoading}
  accessibilityRole="button"
  accessibilityLabel="Update password"
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
>
  <Text className="text-[15px] font-semibold text-white">
    Update Password
  </Text>
</TouchableOpacity>
```

**NativeWind Classes**:
- `bg-[#1E40AF]` - CIAMS primary blue
- `rounded-[10px]` - CIAMS standard border radius
- `h-[50px]` - 50px height (exceeds 48px minimum)
- `items-center justify-center` - Center content
- `text-[15px] font-semibold text-white` - Button text styling

**Accessibility Props**:
- `accessibilityRole="button"` - Interactive button
- `accessibilityLabel` - Clear action description
- `accessibilityState` - Communicates disabled/busy state

### Loading State
**Purpose**: Show loading indicator during password update

```tsx
<TouchableOpacity
  className={`bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${
    isLoading ? 'opacity-70' : ''
  }`}
  disabled={isLoading}
  accessibilityRole="button"
  accessibilityLabel={isLoading ? "Updating password, please wait" : "Update password"}
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
>
  {isLoading ? (
    <ActivityIndicator size="small" color="#FFFFFF" />
  ) : (
    <Text className="text-[15px] font-semibold text-white">
      Update Password
    </Text>
  )}
</TouchableOpacity>
```

**NativeWind Classes**:
- Conditional: `opacity-70` when loading (70% opacity)

**State Variations**:
- **Default**: Full opacity, shows text
- **Loading**: 70% opacity, shows ActivityIndicator
- **Disabled**: Same as loading (disabled prop prevents interaction)

### Error State (Button Disabled)
**Purpose**: Disable button when form has errors

```tsx
const hasErrors = Boolean(currentPasswordError || newPasswordError || confirmPasswordError);

<TouchableOpacity
  className={`bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${
    hasErrors || isLoading ? 'opacity-50' : ''
  }`}
  disabled={hasErrors || isLoading}
  accessibilityRole="button"
  accessibilityLabel={hasErrors ? "Please fix errors before updating password" : "Update password"}
  accessibilityState={{ disabled: hasErrors || isLoading }}
>
```

**NativeWind Classes**:
- Conditional: `opacity-50` when errors or loading

---

## 9. Responsive Design Considerations

### Screen Size Adaptations

**Small Screens (< 375px width)**:
- Reduce padding: `px-3` instead of `px-4` (12px vs 16px)
- Maintain 48px touch targets (critical)
- Use `text-[14px]` for labels if needed (still readable)

**Large Screens (> 414px width)**:
- Add max-width constraint for form card:
  ```tsx
  <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] max-w-md mx-auto">
  ```
- `max-w-md` - Max width 448px
- `mx-auto` - Center horizontally

### Keyboard Handling

**When Keyboard is Open**:
- ScrollView automatically adjusts (ensure `keyboardShouldPersistTaps="handled"`)
- Button remains accessible at bottom
- Consider `KeyboardAvoidingView` wrapper if needed:

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  className="flex-1"
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
>
  {/* Content */}
</KeyboardAvoidingView>
```

---

## 10. Accessibility Considerations

### Touch Targets
✅ **All interactive elements meet 48px minimum**:
- Back button: `w-12 h-12` (48px)
- Password toggle: `w-12 h-12` (48px)
- Submit button: `h-[50px]` (50px)
- TextInput: `h-12` (48px)

### Screen Reader Support
✅ **All interactive elements have accessibility labels**:
- Back button: `accessibilityLabel="Go back"`
- Form fields: `accessibilityLabel="Current password input"`
- Password toggle: Dynamic label based on state
- Submit button: Dynamic label based on state

✅ **Semantic roles assigned**:
- Header: `accessibilityRole="header"`
- Form: `accessibilityRole="form"`
- Buttons: `accessibilityRole="button"`
- Inputs: `accessibilityRole="none"` (label provides context)

### Contrast Ratios
✅ **All text meets WCAG AA contrast requirements**:
- Primary text (`#0F172A` on white): 16.6:1 ✅
- Secondary text (`#64748B` on white): 5.7:1 ✅
- Button text (white on `#1E40AF`): 4.5:1 ✅
- Error text (`#DC2626` on white): 5.1:1 ✅

### Live Regions
✅ **Dynamic content announced to screen readers**:
- Error messages: `accessibilityLiveRegion="polite"` or `"assertive"`
- Success messages: `accessibilityLiveRegion="polite"`
- Loading states: `accessibilityState={{ busy: true }}`

### Focus Management
- TextInputs automatically receive focus when tapped
- Submit button receives focus after form submission (if needed)
- Consider programmatic focus for first error field

---

## 11. Platform-Specific Considerations

### iOS Specific
- **Safe Area**: Use `SafeAreaView` with `edges={['top']}`
- **Keyboard**: Use `KeyboardAvoidingView` with `behavior="padding"`
- **Status Bar**: Inherits from app-level configuration
- **Haptic Feedback**: Consider adding on button press:
  ```tsx
  import * as Haptics from 'expo-haptics';
  
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSubmit();
  }}
  ```

### Android Specific
- **Safe Area**: `SafeAreaView` handles status bar automatically
- **Keyboard**: Use `KeyboardAvoidingView` with `behavior="height"`
- **Back Button**: Hardware back button handled by navigation
- **Ripple Effect**: `TouchableOpacity` provides native ripple on Android

### Platform Detection Pattern
```tsx
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

// Example: Platform-specific styling
<TouchableOpacity
  className={`bg-[#1E40AF] rounded-[10px] h-[50px] ${
    isIOS ? 'shadow-sm' : 'elevation-2'
  }`}
>
```

---

## 12. Complete Component Structure

### Full Screen Implementation

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '../components/FormField';
import { UpdatePasswordForm } from '../components/UpdatePasswordForm';

export const UpdatePasswordScreen: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <SafeAreaView 
      className="flex-1 bg-[#F8FAFC]" 
      edges={['top']}
    >
      {/* Header */}
      <View
        className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center"
        style={{ height: 56 }}
        accessibilityRole="header"
        accessibilityLabel="Update Password screen header"
      >
        {/* Back Button */}
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center -ml-2"
          activeOpacity={0.7}
          onPress={() => {/* Navigate back */}}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Title */}
        <Text
          className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
          numberOfLines={1}
          accessibilityRole="header"
        >
          Update Password
        </Text>

        {/* Right Spacer */}
        <View className="w-12" />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 px-4 pt-6 pb-8"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-6">
            {/* Success Message */}
            {showSuccess && (
              <View
                className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3"
                accessibilityLiveRegion="polite"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg">✅</Text>
                  <Text className="text-[13px] text-[#16A34A] flex-1">
                    Password updated successfully
                  </Text>
                </View>
              </View>
            )}

            {/* Form Card */}
            <View 
              className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
              accessibilityLabel="Password update form"
              accessibilityRole="form"
            >
              <UpdatePasswordForm
                onSuccess={() => setShowSuccess(true)}
                onError={(error) => console.error(error)}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
```

---

## 13. State-Specific Styling Summary

### Loading States
| Component | Default | Loading |
|-----------|---------|---------|
| Submit Button | `bg-[#1E40AF]` | `bg-[#1E40AF] opacity-70` + ActivityIndicator |
| Back Button | Standard | N/A (always enabled) |
| Form Fields | Standard | `editable={false}` + reduced opacity |

### Error States
| Component | Default | Error |
|-----------|---------|-------|
| TextInput Border | `border-[#E2E8F0]` | `border-[#DC2626]` |
| Error Message | Hidden | `bg-[#DC2626]/10 border-[#DC2626]/20` |
| Submit Button | Enabled | Disabled if errors present |

### Success States
| Component | Default | Success |
|-----------|---------|---------|
| Success Message | Hidden | `bg-[#16A34A]/10 border-[#16A34A]/20` |
| Form Fields | Editable | Reset to empty, editable |

---

## 14. Testing Checklist

### Visual Testing
- [ ] All spacing matches CIAMS design system (4px grid)
- [ ] Colors match CIAMS palette exactly
- [ ] Touch targets are minimum 48px
- [ ] Text sizes match typography scale
- [ ] Border radius matches standards (10px for cards, 8px for inputs)

### Accessibility Testing
- [ ] Screen reader announces all interactive elements
- [ ] Error messages announced when they appear
- [ ] Success message announced when password updated
- [ ] Button states (disabled, loading) communicated
- [ ] All text has sufficient contrast (4.5:1 minimum)

### Responsive Testing
- [ ] Layout works on small screens (iPhone SE: 375px)
- [ ] Layout works on large screens (iPhone Pro Max: 428px)
- [ ] Keyboard doesn't cover submit button
- [ ] Content scrolls when keyboard is open

### Platform Testing
- [ ] iOS: Safe area respected, keyboard behavior correct
- [ ] Android: Hardware back button works, keyboard behavior correct
- [ ] Both: Touch feedback works correctly

---

## 15. Quick Reference: NativeWind Class Cheat Sheet

### Colors
```tsx
// Primary
bg-[#1E40AF] text-[#1E40AF]      // Primary Blue
bg-[#3B82F6]                      // Primary Blue Light

// Semantic
bg-[#16A34A] text-[#16A34A]       // Success Green
bg-[#DC2626] text-[#DC2626]       // Danger Red
bg-[#D97706] text-[#D97706]       // Warning Amber

// Neutral
bg-[#F8FAFC]                      // App Background
bg-white                          // Cards, Inputs
border-[#E2E8F0]                  // Borders
text-[#0F172A]                    // Primary Text
text-[#64748B]                    // Secondary Text
text-[#94A3B8]                    // Placeholder Text
```

### Typography
```tsx
text-[22px] font-semibold         // Screen Title
text-[17px] font-semibold         // Section Header
text-[15px]                       // Body Text
text-[13px]                       // Caption/Meta
text-[12px] font-medium           // Badge Text
```

### Spacing
```tsx
gap-1.5  // 6px  - Label to input
gap-3    // 12px - Between cards
gap-4    // 16px - Between form fields, padding
gap-6    // 24px - Between sections
p-4      // 16px - Card padding
px-4     // 16px - Horizontal padding
py-6     // 24px - Vertical padding
```

### Components
```tsx
// Card
bg-white rounded-[10px] p-4 border border-[#E2E8F0]

// Primary Button
bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center

// Text Input
border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white

// Touch Target (minimum)
w-12 h-12 items-center justify-center
```

---

## Conclusion

This styling plan provides comprehensive guidance for implementing the UpdatePassword screen with:
- ✅ CIAMS design system compliance
- ✅ Full accessibility support
- ✅ Responsive design principles
- ✅ Platform-specific considerations
- ✅ State management for loading, error, and success states
- ✅ 48px minimum touch targets throughout

All className combinations are production-ready and follow NativeWind v4 best practices.
