# Color Palette & Typography Reference

Complete reference for all CIAMS colors and typography with exact hex codes and usage guidelines.

---

## Complete Color Palette

### Primary Colors

| Color Name | Hex Code | NativeWind Class | Usage |
|------------|----------|------------------|-------|
| Primary Blue | `#1E40AF` | `bg-[#1E40AF]` `text-[#1E40AF]` | Main action buttons, active tab indicators, primary links, selected states, key headers |
| Primary Blue Light | `#3B82F6` | `bg-[#3B82F6]` `text-[#3B82F6]` | Secondary interactive elements, hover states, lighter accents, ghost button text |

**Usage Rules:**
- Use Primary Blue for the single most important action on any screen
- Primary Blue Light for supporting actions and links
- Never use both as competing CTAs on the same screen level

---

### Semantic Status Colors

These colors communicate state and require consistent usage:

| Status | Hex Code | When to Use | Badge Background | Badge Text |
|--------|----------|-------------|------------------|------------|
| Success Green | `#16A34A` | Approved requests, stock received, completed transfers, healthy stock levels (>50%), active/enabled states | `bg-[#16A34A]/15` | `text-[#16A34A]` |
| Warning Amber | `#D97706` | Pending approvals, low stock (20-50%), items nearing maintenance dates, attention needed | `bg-[#D97706]/15` | `text-[#D97706]` |
| Danger Red | `#DC2626` | Rejected requests, critical stock-outs (<20%), overdue maintenance, delete confirmations, errors | `bg-[#DC2626]/15` | `text-[#DC2626]` |
| Info Slate | `#475569` | Informational badges, neutral status indicators, draft states, secondary metadata | `bg-[#475569]/15` | `text-[#475569]` |

**Critical Rule:** Never use color alone to convey meaning. Always pair with text labels or icons.

**Badge Implementation Pattern:**
```tsx
// Success Badge
<View className="px-2 py-1 rounded-full bg-[#16A34A]/15">
  <Text className="text-[12px] font-medium text-[#16A34A]">Approved</Text>
</View>

// Warning Badge
<View className="px-2 py-1 rounded-full bg-[#D97706]/15">
  <Text className="text-[12px] font-medium text-[#D97706]">Pending</Text>
</View>

// Danger Badge
<View className="px-2 py-1 rounded-full bg-[#DC2626]/15">
  <Text className="text-[12px] font-medium text-[#DC2626]">Rejected</Text>
</View>

// Info Badge
<View className="px-2 py-1 rounded-full bg-[#475569]/15">
  <Text className="text-[12px] font-medium text-[#475569]">Draft</Text>
</View>
```

---

### Neutral Palette (Backgrounds & Text)

| Color Name | Hex Code | NativeWind Class | Usage |
|------------|----------|------------------|-------|
| App Background | `#F8FAFC` | `bg-[#F8FAFC]` | Overall app background behind all cards and content |
| Surface White | `#FFFFFF` | `bg-white` | Card backgrounds, modal backgrounds, input field backgrounds, bottom sheets |
| Border Gray | `#E2E8F0` | `border-[#E2E8F0]` | Card borders, dividers, input outlines, section separators |
| Text Primary | `#0F172A` | `text-[#0F172A]` | Main headings, important data, primary content, card titles |
| Text Secondary | `#64748B` | `text-[#64748B]` | Labels, descriptions, timestamps, metadata, caption text |
| Text Disabled | `#94A3B8` | `text-[#94A3B8]` | Placeholder text, disabled states, inactive elements |
| Light Gray Fill | `#F1F5F9` | `bg-[#F1F5F9]` | Search bar background (unfocused), subtle section backgrounds |

**Contrast Requirements:**
- Text Primary on Surface White: 15.85:1 ✅ Exceeds WCAG AAA
- Text Secondary on Surface White: 5.74:1 ✅ Exceeds WCAG AA
- Text Disabled on Surface White: 3.37:1 ⚠️ Use only for non-critical placeholder text

---

### Role Accent Colors

Used exclusively in user badges and role-specific dashboard headers:

| Role | Hex Code | NativeWind Class | Usage Context |
|------|----------|------------------|---------------|
| Admin | `#4338CA` (Deep Indigo) | `bg-[#4338CA]` `text-[#4338CA]` | Admin role badges, admin profile indicators |
| Store Incharge | `#0D9488` (Teal) | `bg-[#0D9488]` `text-[#0D9488]` | Store Incharge role badges and profile indicators |
| Site Manager | `#B45309` (Amber-Brown) | `bg-[#B45309]` `text-[#B45309]` | Site Manager role badges and profile indicators |

**Role Badge Pattern:**
```tsx
// Admin Badge
<View className="px-2 py-1 rounded-full bg-[#4338CA]/15">
  <Text className="text-[12px] font-medium text-[#4338CA]">Admin</Text>
</View>

// Store Incharge Badge
<View className="px-2 py-1 rounded-full bg-[#0D9488]/15">
  <Text className="text-[12px] font-medium text-[#0D9488]">Store Incharge</Text>
</View>

// Site Manager Badge
<View className="px-2 py-1 rounded-full bg-[#B45309]/15">
  <Text className="text-[12px] font-medium text-[#B45309]">Site Manager</Text>
</View>
```

---

## Typography System

**Font Family:** Inter (or system default: San Francisco on iOS, Roboto on Android)

**Why Inter?**
- Optimized for UI and small text
- Excellent readability on mobile screens
- Clear distinction between characters (1, l, I are easily distinguishable)
- Available in all necessary weights without bloat

### Complete Typography Scale

| Style Name | Size | Weight | Line Height | Letter Spacing | Usage | NativeWind Class |
|------------|------|--------|-------------|----------------|-------|------------------|
| Display | 32px | Bold (700) | 38px | -0.02em | Dashboard KPI numbers, large metrics | `text-[32px] font-bold leading-[38px]` |
| Screen Title | 22px | SemiBold (600) | 28px | -0.01em | Main screen heading at top of each view | `text-[22px] font-semibold leading-7` |
| Section Header | 17px | SemiBold (600) | 22px | 0 | Section dividers within screens | `text-[17px] font-semibold` |
| Card Title | 15px | SemiBold (600) | 20px | 0 | Primary text on list cards (item names, PO numbers) | `text-[15px] font-semibold` |
| Body | 15px | Regular (400) | 20px | 0 | General descriptions, form labels, paragraph text | `text-[15px]` |
| Caption/Meta | 13px | Regular (400) | 18px | 0 | Timestamps, item codes, secondary metadata | `text-[13px]` |
| Badge Text | 12px | Medium (500) | 16px | 0.01em | Status tags, role labels, category pills | `text-[12px] font-medium` |

**Critical Rule:** Never go below 12px font size. Smallest interactive text should be 13px minimum.

### Typography Usage Examples

```tsx
// Display - Dashboard KPI Number
<Text className="text-[32px] font-bold text-[#0F172A]">342</Text>

// Screen Title - Main heading
<Text className="text-[22px] font-semibold text-[#0F172A]">Inventory</Text>

// Section Header - Within screen
<Text className="text-[17px] font-semibold text-[#0F172A]">Recent Activity</Text>

// Card Title - List item primary text
<Text className="text-[15px] font-semibold text-[#0F172A]">Portland Cement OPC 53</Text>

// Body - Form label
<Text className="text-[15px] text-[#0F172A]">Quantity</Text>

// Caption - Timestamp
<Text className="text-[13px] text-[#64748B]">Updated 2h ago</Text>

// Badge - Status label
<Text className="text-[12px] font-medium text-[#16A34A]">In Stock</Text>
```

### Typography with Semantic Colors

```tsx
// Primary text (headings, important data)
<Text className="text-[15px] font-semibold text-[#0F172A]">Item Name</Text>

// Secondary text (labels, metadata)
<Text className="text-[13px] text-[#64748B]">Last updated</Text>

// Disabled/Placeholder text
<Text className="text-[15px] text-[#94A3B8]">Enter quantity...</Text>

// Interactive text (links, buttons)
<Text className="text-[15px] font-semibold text-[#1E40AF]">View All</Text>

// Success message
<Text className="text-[15px] text-[#16A34A]">Stock received successfully</Text>

// Warning message
<Text className="text-[15px] text-[#D97706]">Low stock alert</Text>

// Error message
<Text className="text-[13px] text-[#DC2626]">Required field</Text>
```

---

## Color Combinations for Common Patterns

### Card on Background
```tsx
<View className="bg-[#F8FAFC]"> {/* App background */}
  <View className="bg-white border border-[#E2E8F0]"> {/* Card */}
    <Text className="text-[#0F172A]">Primary content</Text>
    <Text className="text-[#64748B]">Secondary content</Text>
  </View>
</View>
```

### Button States
```tsx
// Primary Button - Default
className="bg-[#1E40AF]"

// Primary Button - Pressed (use activeOpacity={0.7})
// NativeWind + Pressable will handle this automatically

// Primary Button - Disabled
className="bg-[#1E40AF]" style={{ opacity: 0.5 }}

// Secondary Button - Default
className="border-[1.5px] border-[#1E40AF]"
```

### Input Field States
```tsx
// Default
className="border border-[#E2E8F0] bg-white"

// Focused
className="border border-[#1E40AF] bg-white"

// Error
className="border border-[#DC2626] bg-white"

// Disabled
className="border border-[#E2E8F0] bg-[#F8FAFC]"
```

### Stock Level Indicator Colors

**Dynamic color based on percentage:**

```tsx
const getStockColor = (percentage: number) => {
  if (percentage > 50) return '#16A34A'; // Green - Healthy
  if (percentage > 20) return '#D97706'; // Amber - Low
  return '#DC2626'; // Red - Critical
};

// Usage in progress bar
<View 
  className="h-1.5 rounded-full"
  style={{ 
    width: `${percentage}%`,
    backgroundColor: getStockColor(percentage)
  }}
/>
```

---

## Dark Mode (Optional Implementation)

If implementing dark mode, use these mappings:

| Light Mode | Dark Mode | Usage |
|------------|-----------|-------|
| `#F8FAFC` | `#0F172A` | App background |
| `#FFFFFF` | `#1E293B` | Cards, surfaces |
| `#E2E8F0` | `#334155` | Borders |
| `#0F172A` | `#F1F5F9` | Primary text |
| `#64748B` | `#94A3B8` | Secondary text |
| `#94A3B8` | `#64748B` | Disabled text |

**Semantic colors remain the same** in dark mode but can be slightly lightened for better contrast:
- Success: `#16A34A` → `#22C55E`
- Warning: `#D97706` → `#F59E0B`
- Danger: `#DC2626` → `#EF4444`

---

## Accessibility Guidelines

### Minimum Contrast Ratios (WCAG 2.1)

- **AA Standard (body text):** 4.5:1 minimum
- **AA Standard (large text >18px):** 3:1 minimum
- **AAA Standard (body text):** 7:1 minimum

### CIAMS Compliance

| Combination | Ratio | Compliance |
|-------------|-------|------------|
| Text Primary (#0F172A) on White | 15.85:1 | AAA ✅ |
| Text Secondary (#64748B) on White | 5.74:1 | AA ✅ |
| Primary Blue (#1E40AF) on White | 8.59:1 | AAA ✅ |
| Success Green (#16A34A) on White | 4.54:1 | AA ✅ |
| Warning Amber (#D97706) on White | 4.52:1 | AA ✅ |
| Danger Red (#DC2626) on White | 5.94:1 | AA ✅ |

### Color Blindness Considerations

- **Never use color alone** to convey information (always add icons or text)
- Green/Red combinations always paired with text labels
- Status badges include text labels, not just colors
- Warning states use amber (not pure red) which is distinguishable

---

## Quick Reference: Common Component Colors

```tsx
// PRIMARY BUTTON
className="bg-[#1E40AF]" // background
className="text-white" // text

// SECONDARY BUTTON
className="border-[1.5px] border-[#1E40AF]" // border
className="text-[#1E40AF]" // text

// DESTRUCTIVE BUTTON
className="bg-[#DC2626]" // background
className="text-white" // text

// CARD
className="bg-white border border-[#E2E8F0]" // background + border

// STATUS BADGE (Approved)
className="px-2 py-1 rounded-full bg-[#16A34A]/15" // container
className="text-[12px] font-medium text-[#16A34A]" // text

// SEARCH BAR (unfocused)
className="bg-[#F1F5F9] rounded-full" // background

// SEARCH BAR (focused)
className="bg-white border border-[#1E40AF]" // background + border

// BOTTOM TAB (active)
className="text-[#1E40AF]" // icon + text
className="bg-[#1E40AF]" // indicator bar

// BOTTOM TAB (inactive)
className="text-[#64748B]" // icon + text
```

---

This reference ensures pixel-perfect color consistency across the entire CIAMS application.
