---
name: ciams-design-system
description: Build CIAMS UI components using NativeWind following the industrial-grade design system. Use when creating screens, components, forms, cards, dashboards, or any UI elements for the Construction Inventory & Asset Management System. Ensures consistent styling, proper spacing, semantic colors, and field-ready touch targets.
---

# CIAMS Design System

Industrial-grade UI/UX system for construction inventory management. Every component prioritizes: **48px minimum touch targets**, **high contrast**, **scannable hierarchy**, and **minimal steps to complete actions**.

## Core Principles

**Industrial Clarity** — Designed for dusty job sites, bright sunlight, gloved hands. Think "control panel," not "social media app."

**Trust Through Structure** — Managing expensive inventory requires confidence. UI feels structured, organized, authoritative — like a well-run warehouse.

---

## Quick Reference: NativeWind Classes

### Color Palette

```typescript
// Primary Actions & Emphasis
bg-[#1E40AF]    // Primary Blue - main action buttons, active states
bg-[#3B82F6]    // Primary Blue Light - secondary interactive elements
text-[#1E40AF]  // Primary text/links

// Semantic Colors (use at 15% opacity for badge backgrounds)
bg-[#16A34A]    // Success Green - approved, in stock, completed
bg-[#D97706]    // Warning Amber - pending, low stock
bg-[#DC2626]    // Danger Red - rejected, out of stock, critical
bg-[#475569]    // Info Slate - neutral status

// Neutral Palette
bg-[#F8FAFC]    // App background - faint cool gray
bg-white        // Cards, modals, inputs
border-[#E2E8F0] // Borders, dividers
text-[#0F172A]  // Primary text - headings, important data
text-[#64748B]  // Secondary text - labels, timestamps
text-[#94A3B8]  // Disabled text - placeholders

// Role Accents (badges only)
bg-[#4338CA]    // Admin - Deep Indigo
bg-[#0D9488]    // Store Incharge - Teal
bg-[#B45309]    // Site Manager - Amber-Brown
```

### Typography Scale

```typescript
// Display - Dashboard KPIs (large numbers)
className="text-[32px] font-bold text-[#0F172A]"

// Screen Title - Main screen heading
className="text-[22px] font-semibold text-[#0F172A]"

// Section Header - Section dividers within screens
className="text-[17px] font-semibold text-[#0F172A]"

// Card Title - Primary text on cards
className="text-[15px] font-semibold text-[#0F172A]"

// Body - General text, form labels
className="text-[15px] text-[#0F172A]"

// Caption/Meta - Timestamps, codes, secondary info
className="text-[13px] text-[#64748B]"

// Badge Text - Status tags, role labels
className="text-[12px] font-medium"
```

### Spacing System (4px base unit)

```typescript
px-4    // Screen horizontal padding (16px)
p-4     // Card internal padding (16px)
gap-3   // Between cards in list (12px)
gap-6   // Between sections (24px)
gap-4   // Between form fields (16px)
gap-1.5 // Label to input (6px)
py-3.5 px-6  // Button padding (14px vertical, 24px horizontal)
```

### Common Component Classes

```typescript
// Standard Card
className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"

// KPI Card
className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]"

// Status Badge (add opacity-15 to bg for container)
className="px-2 py-1 rounded-full bg-[#16A34A]/15"
className="text-[12px] font-medium text-[#16A34A]"

// Primary Button (min height 50px = h-[50px])
className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
className="text-[15px] font-semibold text-white"

// Secondary Button
className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
className="text-[15px] font-semibold text-[#1E40AF]"

// Text Input (min height 48px)
className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white"
className="focus:border-[#1E40AF]"

// Search Bar
className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center"
```

---

## Component Patterns

### List Card (Most Common Component)

Every module (inventory, POs, transfers, assets) uses this pattern:

```tsx
<View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
  {/* Top Row: Title + Status Badge */}
  <View className="flex-row justify-between items-center mb-3">
    <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
      Portland Cement OPC 53
    </Text>
    <View className="px-2 py-1 rounded-full bg-[#16A34A]/15">
      <Text className="text-[12px] font-medium text-[#16A34A]">In Stock</Text>
    </View>
  </View>

  {/* Middle: Key-Value Grid */}
  <View className="flex-row gap-4 mb-3">
    <View className="flex-1">
      <Text className="text-[13px] text-[#64748B]">Qty</Text>
      <Text className="text-[15px] text-[#0F172A]">450 bags</Text>
    </View>
    <View className="flex-1">
      <Text className="text-[13px] text-[#64748B]">Site</Text>
      <Text className="text-[15px] text-[#0F172A]">Sector 12</Text>
    </View>
  </View>

  {/* Bottom: Divider + Footer */}
  <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
    <Text className="text-[13px] text-[#64748B]">Updated 2h ago</Text>
    {/* Optional: Action icon or chevron */}
  </View>
</View>
```

**Key Points:**
- 16px padding all around (`p-4`)
- Status badge: colored bg at 15% opacity (`/15`), full-color text
- Use `gap-3` (12px) between cards in a list
- All touch targets minimum 48px

### KPI Card (Dashboard Metrics)

```tsx
<View className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]">
  {/* Icon/Emoji at top */}
  <Text className="text-2xl mb-2">📦</Text>
  
  {/* Large Number */}
  <Text className="text-[32px] font-bold text-[#0F172A]">342</Text>
  
  {/* Label */}
  <Text className="text-[13px] text-[#64748B]">Items in Stock</Text>
</View>
```

Use in horizontal `ScrollView` with 2-3 cards visible at once.

### Primary Button

```tsx
<TouchableOpacity 
  className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
  activeOpacity={0.7}
>
  <Text className="text-[15px] font-semibold text-white">Submit Request</Text>
</TouchableOpacity>
```

**Only one primary button per screen** — the main action.

### Text Input with Label

```tsx
<View className="gap-1.5">
  <Text className="text-[15px] text-[#0F172A]">Quantity</Text>
  <TextInput
    className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white focus:border-[#1E40AF]"
    placeholderTextColor="#94A3B8"
    placeholder="Enter quantity"
  />
</View>
```

**Spacing:** 6px gap between label and input (`gap-1.5`), 16px between form fields (`gap-4`).

### Status Badge Component

Create a reusable component:

```tsx
type StatusBadgeProps = {
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  label: string;
}

const statusColors = {
  approved: { bg: 'bg-[#16A34A]/15', text: 'text-[#16A34A]' },
  pending: { bg: 'bg-[#D97706]/15', text: 'text-[#D97706]' },
  rejected: { bg: 'bg-[#DC2626]/15', text: 'text-[#DC2626]' },
  draft: { bg: 'bg-[#475569]/15', text: 'text-[#475569]' },
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const colors = statusColors[status];
  return (
    <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
      <Text className={`text-[12px] font-medium ${colors.text}`}>{label}</Text>
    </View>
  );
};
```

### Bottom Sheet Container

```tsx
<View className="bg-white rounded-t-2xl p-4">
  {/* Handle Bar */}
  <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
  
  {/* Content */}
  <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
    Filter Options
  </Text>
  
  {/* Sheet content here */}
</View>
```

### Empty State

```tsx
<View className="flex-1 items-center justify-center px-4">
  {/* Icon - use a simple icon library or emoji */}
  <Text className="text-6xl mb-4">📋</Text>
  
  <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
    No Purchase Orders Yet
  </Text>
  
  <Text className="text-[15px] text-[#64748B] text-center mb-6">
    Create your first PO to start tracking procurement
  </Text>
  
  <TouchableOpacity className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center">
    <Text className="text-[15px] font-semibold text-white">Create Purchase Order</Text>
  </TouchableOpacity>
</View>
```

---

## Screen Structure Standards

### Standard Screen Layout

```tsx
<SafeAreaView className="flex-1 bg-[#F8FAFC]">
  {/* Header */}
  <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
    <TouchableOpacity className="w-11 h-11 items-center justify-center">
      {/* Back arrow icon */}
    </TouchableOpacity>
    <Text className="text-[22px] font-semibold text-[#0F172A]">Inventory</Text>
    <TouchableOpacity className="w-11 h-11 items-center justify-center">
      {/* Action icon (search, filter, add) */}
    </TouchableOpacity>
  </View>

  {/* Content */}
  <ScrollView className="flex-1 px-4">
    {/* Cards with gap-3 between them */}
  </ScrollView>
</SafeAreaView>
```

### Dashboard Layout (Role-Specific)

```tsx
<SafeAreaView className="flex-1 bg-[#F8FAFC]">
  <ScrollView className="flex-1">
    {/* KPI Row - Horizontal Scroll */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-4">
      <View className="flex-row gap-3">
        <KPICard value="342" label="Items in Stock" icon="📦" />
        <KPICard value="12" label="Low Stock" icon="⚠️" />
        <KPICard value="8" label="Pending" icon="⏳" />
      </View>
    </ScrollView>

    {/* Quick Actions Grid */}
    <View className="px-4 pb-4">
      <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">Quick Actions</Text>
      <View className="flex-row flex-wrap gap-3">
        <QuickActionCard title="New Request" icon="➕" onPress={() => {}} />
        <QuickActionCard title="Add Stock" icon="📥" onPress={() => {}} />
        {/* 2x2 or 2x3 grid, each card ~47% width */}
      </View>
    </View>

    {/* Activity Feed */}
    <View className="px-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[17px] font-semibold text-[#0F172A]">Recent Activity</Text>
        <TouchableOpacity>
          <Text className="text-[15px] text-[#3B82F6]">View All</Text>
        </TouchableOpacity>
      </View>
      {/* Compact activity list */}
    </View>
  </ScrollView>
</SafeAreaView>
```

---

## Form Patterns

### Multi-Field Form

```tsx
<ScrollView className="flex-1 bg-[#F8FAFC] px-4">
  <View className="gap-4 py-4">
    {/* Text Input */}
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Item Name</Text>
      <TextInput className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white" />
    </View>

    {/* Dropdown/Select */}
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Category</Text>
      <TouchableOpacity className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between">
        <Text className="text-[15px] text-[#0F172A]">Select Category</Text>
        {/* Chevron down icon */}
      </TouchableOpacity>
    </View>

    {/* Quantity Input */}
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Quantity</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity className="w-10 h-10 border border-[#E2E8F0] rounded-full items-center justify-center">
          <Text className="text-[#1E40AF] text-xl">−</Text>
        </TouchableOpacity>
        <TextInput 
          className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold"
          keyboardType="numeric"
        />
        <TouchableOpacity className="w-10 h-10 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]">
          <Text className="text-white text-xl">+</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Buttons at bottom */}
    <View className="flex-row gap-3 pt-4">
      <TouchableOpacity className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center">
        <Text className="text-[15px] font-semibold text-[#1E40AF]">Save as Draft</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center">
        <Text className="text-[15px] font-semibold text-white">Submit</Text>
      </TouchableOpacity>
    </View>
  </View>
</ScrollView>
```

---

## Accessibility & Field-Readiness

✅ **Minimum Touch Targets**: All interactive elements 48x48px minimum (`h-12 w-12` or larger)

✅ **High Contrast**: Text minimum 4.5:1 contrast ratio against backgrounds

✅ **Screen Reader Support**: Add `accessibilityLabel` and `accessibilityRole` to all interactive elements

✅ **Offline Indicators**: Show banner when offline:
```tsx
{!isOnline && (
  <View className="bg-[#D97706]/15 px-4 py-2 flex-row items-center">
    <Text className="text-[13px] text-[#D97706]">
      You're offline — changes will sync when connected
    </Text>
  </View>
)}
```

✅ **Loading States**: Use skeleton placeholders, not blank screens

✅ **Confirmation for Critical Actions**: Always confirm deletes, rejections, transfers

---

## Additional Resources

- For complete component specifications, see [components.md](components.md)
- For detailed color palette and typography scale, see [colors-typography.md](colors-typography.md)
- For code examples of complex patterns, see [examples.md](examples.md)

---

## Quick Tips

1. **Start with the card** — Most CIAMS screens are lists of cards. Build the card component first.

2. **Use semantic colors correctly** — Green = positive/success, Amber = caution/pending, Red = critical/danger. Never use color alone to convey meaning (always include text/icons).

3. **One primary action per screen** — Only one blue primary button. Everything else is secondary/outlined or ghost/text buttons.

4. **Spacing consistency** — Use the 4px grid: `gap-1.5` (6px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)

5. **Test with thick fingers** — If you can't reliably tap it with your thumb while walking, the touch target is too small.

6. **Empty states are onboarding** — Every empty screen should guide the user to the first action.

7. **Status first** — Users scan for status before details. Put status badges top-right on cards.

8. **Progressive disclosure** — Show essentials on the card, reveal details on tap. Don't cram everything into the list view.
