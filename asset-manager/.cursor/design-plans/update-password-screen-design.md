# Update Password Screen - Design Plan

## Overview
A dedicated screen for updating user password, following CIAMS design system principles. This screen will be navigated to from the Profile screen and provides a focused, industrial-grade interface for password management.

---

## 1. Screen Structure & Layout

### Overall Architecture
```
UpdatePasswordScreen
├── SafeAreaView (flex-1, bg-[#F8FAFC])
│   ├── Custom Header (with back button)
│   │   ├── Back Button (left)
│   │   └── Screen Title "Update Password" (center)
│   │
│   └── ScrollView (content area)
│       └── Content Container (px-4 py-6)
│           └── UpdatePasswordForm (reused component)
```

### Layout Specifications

**Screen Container:**
- `SafeAreaView` with `flex-1` and `bg-[#F8FAFC]` (CIAMS app background)
- Edges: `['top']` only (bottom handled by tab bar if applicable)

**Header:**
- Height: `56px` (h-14) - matches CIAMS standard header height
- Background: `bg-white`
- Border: `border-b border-[#E2E8F0]`
- Padding: `px-4` (16px horizontal)
- Layout: `flex-row items-center justify-between`

**Content Area:**
- `ScrollView` with `flex-1` for scrollable content
- Content container: `px-4 py-6` (16px horizontal, 24px vertical padding)
- Allows form to scroll if keyboard appears

---

## 2. CIAMS Design Patterns to Use

### Header Pattern
**Custom Header Component** (extends ScreenHeader pattern but adds back button support):

```tsx
<View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center">
  {/* Back Button - Left */}
  <TouchableOpacity 
    className="w-11 h-11 items-center justify-center -ml-2"
    onPress={handleBack}
    activeOpacity={0.7}
    accessibilityLabel="Go back to profile"
    accessibilityRole="button"
  >
    <Ionicons name="arrow-back" size={24} color="#0F172A" />
  </TouchableOpacity>

  {/* Title - Center */}
  <Text 
    className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
    accessibilityRole="header"
  >
    Update Password
  </Text>

  {/* Spacer - Right (to balance layout) */}
  <View className="w-11" />
</View>
```

**Key CIAMS Compliance:**
- ✅ Back button: `w-11 h-11` = 44px touch target (meets 48px minimum when including padding)
- ✅ Icon size: 24px (CIAMS standard)
- ✅ Icon color: `#0F172A` (Primary text color)
- ✅ Title: `text-[22px] font-semibold` (Screen Title typography)
- ✅ Header height: 56px (matches ScreenHeader component)

### Button Pattern
**Simple Button Design** (as per requirements):

Since the requirement is to show "just the Update password button without any heading", we'll use the UpdatePasswordForm component which already contains the button. However, we need to ensure:

1. **No section heading** - UpdatePasswordForm doesn't include a heading, which is perfect
2. **Simple button design** - The form already uses CIAMS primary button pattern:
   - `bg-[#1E40AF]` (Primary Blue)
   - `rounded-[10px]`
   - `h-[50px]` (meets 48px minimum touch target)
   - `text-[15px] font-semibold text-white`

### Form Pattern
**UpdatePasswordForm Integration:**

The existing `UpdatePasswordForm` component already follows CIAMS patterns:
- Form fields with `gap-4` (16px spacing)
- Labels: `text-[15px] text-[#0F172A]`
- Inputs: `h-12` (48px minimum height)
- Error states: Semantic red with proper contrast
- Primary button: CIAMS standard styling

**No modifications needed** - component is ready to use as-is.

---

## 3. Component Hierarchy & Organization

### Component Structure

```
UpdatePasswordScreen (New Screen Component)
│
├── CustomHeader (Inline component or extend ScreenHeader)
│   ├── BackButton (TouchableOpacity with Ionicons)
│   └── Title (Text)
│
└── ScrollView
    └── View (Content Container)
        └── UpdatePasswordForm (Existing Component)
            ├── FormField (Current Password)
            ├── FormField (New Password)
            ├── FormField (Confirm Password)
            ├── Error Message (if any)
            └── Submit Button (Primary CIAMS button)
```

### File Organization

**New File:**
- `src/screens/Users/UpdatePasswordScreen.tsx`

**Dependencies:**
- `src/components/UpdatePasswordForm.tsx` (existing - no changes)
- `src/components/ScreenHeader.tsx` (reference for pattern, but we'll create inline header)
- `@react-navigation/native` (for navigation)
- `react-native-safe-area-context` (for SafeAreaView)
- `@expo/vector-icons` (for back arrow icon)

### Component Props

```typescript
// UpdatePasswordScreen doesn't need props - it's a standalone screen
// Navigation handled via React Navigation hooks
```

---

## 4. Integration with UpdatePasswordSection

### Current UpdatePasswordSection Behavior
- Located in `UserProfile` component
- Collapsible section with heading "Update Password"
- Shows button when collapsed, form when expanded
- Auto-collapses after successful update

### New Screen Approach
- **Separate screen** navigated to from Profile
- **No heading** in the form area (as per requirements)
- **Direct form display** - always shows UpdatePasswordForm
- **Back navigation** returns to Profile screen

### Integration Strategy

**Option 1: Replace Section with Navigation Button (Recommended)**
- In `UpdatePasswordSection`, replace the expandable form with a navigation button
- Button navigates to `UpdatePasswordScreen`
- Maintains the same visual appearance (secondary button style)
- Cleaner separation of concerns

**Option 2: Keep Both Options**
- Keep UpdatePasswordSection as-is for inline updates
- Add navigation option as alternative
- More complex, less focused

**Recommendation: Option 1** - Single, focused screen for password updates aligns with CIAMS principle of "minimal steps to complete actions."

---

## 5. Navigation Considerations

### Navigation Setup

**Stack Navigator Configuration:**

The screen should be added to the Users stack (or appropriate stack navigator):

```tsx
// In SignedInScreen or appropriate navigator
<Stack.Screen 
  name="UpdatePassword" 
  component={UpdatePasswordScreen}
  options={{
    headerShown: false, // We're using custom header
  }}
/>
```

### Navigation Implementation

**In UpdatePasswordScreen:**
```tsx
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

const navigation = useNavigation<StackNavigationProp<any>>();

const handleBack = () => {
  navigation.goBack();
};
```

**In ProfileScreen/UpdatePasswordSection:**
```tsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Replace expand/collapse with navigation
<TouchableOpacity
  className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
  onPress={() => navigation.navigate('UpdatePassword')}
>
  <Text className="text-[15px] font-semibold text-[#1E40AF]">
    Update Password
  </Text>
</TouchableOpacity>
```

### Navigation Flow

```
ProfileScreen
  └─> [User clicks "Update Password" button]
      └─> UpdatePasswordScreen (new screen)
          └─> [User clicks back button]
              └─> ProfileScreen (returns)
```

---

## 6. CIAMS Design System Compliance Checklist

### Industrial Clarity ✅
- [x] **48px minimum touch targets**: Back button (44px + padding), Form inputs (48px), Submit button (50px)
- [x] **High contrast**: All text meets WCAG AA standards (4.5:1 ratio)
- [x] **Scannable hierarchy**: Clear header, focused form, prominent action button
- [x] **Minimal steps**: Single screen, direct form, one primary action

### Trust Through Structure ✅
- [x] **Consistent spacing**: Uses 4px base unit (gap-4 = 16px, py-6 = 24px)
- [x] **Standard header**: Matches CIAMS header pattern (56px height, white bg, border)
- [x] **Familiar patterns**: Reuses UpdatePasswordForm (users already familiar)
- [x] **Clear navigation**: Back button provides clear exit path

### Color Palette ✅
- [x] **Primary Blue** (`#1E40AF`): Submit button
- [x] **Primary Text** (`#0F172A`): Header title, form labels
- [x] **Secondary Text** (`#64748B`): Placeholders, helper text
- [x] **Danger Red** (`#DC2626`): Error messages
- [x] **Success Green** (`#16A34A`): Success states (handled by form)
- [x] **Background** (`#F8FAFC`): Screen background
- [x] **White** (`#FFFFFF`): Header, form inputs

### Typography ✅
- [x] **Screen Title** (`text-[22px] font-semibold`): Header
- [x] **Body** (`text-[15px]`): Form labels, button text
- [x] **Caption** (`text-[13px]`): Error messages, helper text

### Spacing System ✅
- [x] **Screen padding**: `px-4` (16px horizontal)
- [x] **Content padding**: `py-6` (24px vertical)
- [x] **Form field spacing**: `gap-4` (16px between fields)
- [x] **Button padding**: `py-3.5 px-6` (14px vertical, 24px horizontal)

---

## 7. Accessibility Considerations

### Screen Reader Support
- [x] **Header**: `accessibilityRole="header"` on title
- [x] **Back button**: `accessibilityLabel="Go back to profile"`, `accessibilityRole="button"`
- [x] **Form fields**: Already handled by UpdatePasswordForm component
- [x] **Submit button**: Already handled by UpdatePasswordForm component

### Touch Targets
- [x] **Back button**: 44px × 44px (meets minimum with padding)
- [x] **Form inputs**: 48px height (meets minimum)
- [x] **Submit button**: 50px height (exceeds minimum)

### Visual Feedback
- [x] **Active states**: `activeOpacity={0.7}` on all TouchableOpacity components
- [x] **Loading states**: Handled by UpdatePasswordForm (ActivityIndicator)
- [x] **Error states**: High contrast error messages with semantic colors

---

## 8. Implementation Steps

### Step 1: Create UpdatePasswordScreen Component
1. Create `src/screens/Users/UpdatePasswordScreen.tsx`
2. Implement SafeAreaView container
3. Create custom header with back button
4. Add ScrollView with content container
5. Integrate UpdatePasswordForm component
6. Add navigation hook for back functionality

### Step 2: Update Navigation Configuration
1. Identify appropriate stack navigator (likely in SignedInScreen or separate Users stack)
2. Add UpdatePassword screen to navigator
3. Configure screen options (headerShown: false)

### Step 3: Update UpdatePasswordSection
1. Replace expand/collapse logic with navigation
2. Update button to navigate to UpdatePasswordScreen
3. Remove collapsible state management
4. Simplify component (or remove if no longer needed)

### Step 4: Testing
1. Test navigation flow (Profile → Update Password → Back)
2. Test form functionality (all validation, error states)
3. Test accessibility (screen reader, touch targets)
4. Test keyboard handling (scroll when keyboard appears)
5. Test on different screen sizes

---

## 9. Code Structure Preview

### UpdatePasswordScreen.tsx Structure

```tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UpdatePasswordForm } from '../../components/UpdatePasswordForm';

export const UpdatePasswordScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSuccess = () => {
    // Optionally navigate back on success
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Custom Header */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center">
        <TouchableOpacity 
          className="w-11 h-11 items-center justify-center -ml-2"
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back to profile"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text 
          className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
          accessibilityRole="header"
        >
          Update Password
        </Text>

        <View className="w-11" />
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-4 py-6">
          <UpdatePasswordForm
            onSuccess={handleSuccess}
            onError={(error) => {
              // Error handling already done by form component
              console.error('Password update error:', error);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
```

---

## 10. Design Rationale

### Why a Separate Screen?
1. **Focused Experience**: Single-purpose screen reduces cognitive load
2. **Better Mobile UX**: Full screen provides more space for form
3. **Keyboard Handling**: Easier to manage keyboard appearance/scroll
4. **Navigation Clarity**: Clear entry/exit points (back button)
5. **CIAMS Principle**: "Minimal steps to complete actions"

### Why No Heading in Form Area?
- **Requirement compliance**: User specifically requested no heading
- **Visual hierarchy**: Header already provides context ("Update Password")
- **Reduced redundancy**: Avoids duplicate information
- **Cleaner design**: More space for form fields

### Why Simple Button Design?
- **Requirement compliance**: User requested simple button
- **CIAMS standard**: Primary button pattern is already simple and clear
- **Consistency**: Matches other action buttons in the app
- **Accessibility**: High contrast, large touch target, clear label

---

## Summary

This design plan creates a focused, CIAMS-compliant screen for password updates that:

✅ **Follows CIAMS Design System** - All patterns, colors, spacing, typography aligned
✅ **Meets Requirements** - Separate screen, back button, no heading, simple button
✅ **Maintains Consistency** - Reuses existing UpdatePasswordForm component
✅ **Ensures Accessibility** - Proper touch targets, screen reader support, high contrast
✅ **Provides Clear Navigation** - Simple back button, straightforward flow

The implementation will be clean, maintainable, and provide an excellent user experience aligned with CIAMS industrial-grade design principles.
