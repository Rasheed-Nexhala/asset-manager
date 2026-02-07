# Complete Component Specifications

This document provides detailed specifications for all CIAMS components with exact dimensions, interactions, and states.

---

## Navigation Components

### Bottom Tab Bar

**Dimensions:**
- Height: 64px (includes safe area)
- Icon size: 24px
- Active indicator: 3px height, rounded

**States:**
- Active: Primary Blue (#1E40AF) icon + text, indicator line above
- Inactive: Text Secondary (#64748B) icon + text

**NativeWind:**
```tsx
<View className="bg-white border-t border-[#E2E8F0] h-16">
  <View className="flex-row justify-around items-center h-full">
    {/* Active Tab */}
    <TouchableOpacity className="items-center justify-center gap-1">
      <View className="w-full items-center">
        <View className="w-8 h-0.5 rounded-full bg-[#1E40AF] mb-1" />
        {/* Active Icon - use filled variant */}
        <Text className="text-[12px] text-[#1E40AF]">Dashboard</Text>
      </View>
    </TouchableOpacity>
    
    {/* Inactive Tab */}
    <TouchableOpacity className="items-center justify-center gap-1">
      {/* Inactive Icon - use outlined variant */}
      <Text className="text-[12px] text-[#64748B]">Inventory</Text>
    </TouchableOpacity>
  </View>
</View>
```

### Top App Bar / Screen Header

**Dimensions:**
- Height: 56px
- Side icon touch targets: 44x44px
- Title: Screen Title typography (22px SemiBold)

**Layout:**
- Left: Back arrow or empty
- Center: Screen title
- Right: 1-2 action icons (search, filter, add, notifications)

**NativeWind:**
```tsx
<View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
  <TouchableOpacity className="w-11 h-11 items-center justify-center -ml-2">
    {/* Back Icon */}
  </TouchableOpacity>
  
  <Text className="text-[22px] font-semibold text-[#0F172A]">
    Inventory
  </Text>
  
  <View className="flex-row gap-2">
    <TouchableOpacity className="w-11 h-11 items-center justify-center">
      {/* Search Icon */}
    </TouchableOpacity>
    <TouchableOpacity className="w-11 h-11 items-center justify-center">
      {/* Filter Icon */}
    </TouchableOpacity>
  </View>
</View>
```

---

## Card Components

### Standard List Card (Full Spec)

**Dimensions:**
- Border radius: 10px
- Internal padding: 16px all sides
- Border: 1px #E2E8F0
- Minimum height: 120px
- Spacing between cards: 12px

**Touch States:**
- Active: Scale 0.98, opacity 0.7 for 100ms
- Disabled: Opacity 0.5, no pointer events

**Layout Sections:**

1. **Top Row** (flex-row justify-between):
   - Left: Card title (15px SemiBold, flex-1 with ellipsis)
   - Right: Status badge (no flex, aligned right)
   - Spacing: 12px gap between title and badge

2. **Middle Section** (2-column grid):
   - Each column: flex-1
   - Label: 13px Regular, Text Secondary
   - Value: 15px Regular, Text Primary
   - Row gap: 12px
   - Column gap: 16px

3. **Bottom Row**:
   - Divider: 1px solid #E2E8F0, margin-top 12px
   - Footer height: 32px
   - Left: Timestamp/metadata (Caption)
   - Right: Action icon or chevron

**Complete Example:**
```tsx
<TouchableOpacity 
  className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
  activeOpacity={0.7}
  onPress={onCardPress}
>
  {/* Top Row */}
  <View className="flex-row justify-between items-start gap-3 mb-3">
    <Text 
      className="text-[15px] font-semibold text-[#0F172A] flex-1"
      numberOfLines={2}
    >
      Portland Cement OPC 53 Grade
    </Text>
    <StatusBadge status="approved" label="In Stock" />
  </View>

  {/* Middle Grid */}
  <View className="gap-3 mb-3">
    <View className="flex-row gap-4">
      <View className="flex-1">
        <Text className="text-[13px] text-[#64748B] mb-1">Quantity</Text>
        <Text className="text-[15px] text-[#0F172A]">450 bags</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[13px] text-[#64748B] mb-1">Location</Text>
        <Text className="text-[15px] text-[#0F172A]">Sector 12</Text>
      </View>
    </View>
    <View className="flex-row gap-4">
      <View className="flex-1">
        <Text className="text-[13px] text-[#64748B] mb-1">Category</Text>
        <Text className="text-[15px] text-[#0F172A]">Cement</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[13px] text-[#64748B] mb-1">Unit Price</Text>
        <Text className="text-[15px] text-[#0F172A]">₹325</Text>
      </View>
    </View>
  </View>

  {/* Bottom Row */}
  <View className="border-t border-[#E2E8F0] pt-3 flex-row justify-between items-center">
    <Text className="text-[13px] text-[#64748B]">Updated 2h ago</Text>
    {/* Optional: Chevron or menu icon */}
  </View>
</TouchableOpacity>
```

### KPI Card (Dashboard Metrics)

**Dimensions:**
- Border radius: 12px
- Internal padding: 16px
- Minimum width: 45% of screen (to show peek of next card)
- Height: auto, min 120px
- Shadow: subtle elevation

**Layout:**
- Icon/Emoji: 32px at top
- Number: 32px Bold
- Label: 13px Regular, Text Secondary
- Optional: Trend indicator (small arrow + percentage)

**With Gradient Tint (Optional):**
```tsx
<LinearGradient
  colors={['rgba(22, 163, 74, 0.05)', 'rgba(22, 163, 74, 0)']}
  className="rounded-xl"
>
  <View className="bg-white/80 rounded-xl p-4 shadow-sm min-w-[45%]">
    <Text className="text-3xl mb-2">📦</Text>
    <Text className="text-[32px] font-bold text-[#0F172A] mb-1">342</Text>
    <Text className="text-[13px] text-[#64748B]">Items in Stock</Text>
    
    {/* Optional Trend */}
    <View className="flex-row items-center gap-1 mt-2">
      <Text className="text-[12px] text-[#16A34A]">↑ 12%</Text>
      <Text className="text-[12px] text-[#64748B]">vs last month</Text>
    </View>
  </View>
</LinearGradient>
```

### Compact Activity Card

**Used for:** Activity logs, notification lists

**Dimensions:**
- No border/shadow (just bottom divider)
- Internal padding: 12px vertical, 16px horizontal
- Avatar/Icon: 36px circle
- Height: 64px

**Layout:**
```tsx
<View className="flex-row items-center gap-3 py-3 px-4 border-b border-[#E2E8F0]">
  {/* Left: Status Indicator */}
  <View className="w-9 h-9 rounded-full bg-[#16A34A]/15 items-center justify-center">
    {/* Icon 16px */}
    <Text className="text-[#16A34A]">✓</Text>
  </View>
  
  {/* Center: Text */}
  <View className="flex-1">
    <Text className="text-[15px] text-[#0F172A] mb-0.5">
      PO #1042 approved by Admin
    </Text>
    <Text className="text-[13px] text-[#64748B]">
      John Doe • Store Incharge
    </Text>
  </View>
  
  {/* Right: Timestamp */}
  <Text className="text-[13px] text-[#64748B]">2h ago</Text>
</View>
```

### Transfer Request Card (Specialized)

**Unique Feature:** Visual "from → to" layout

```tsx
<TouchableOpacity className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
  {/* Top: Transfer Route */}
  <View className="flex-row items-center justify-between mb-3">
    <View className="px-3 py-1.5 bg-[#F1F5F9] rounded-lg">
      <Text className="text-[13px] text-[#64748B]">From</Text>
      <Text className="text-[15px] font-semibold text-[#0F172A]">Central Store</Text>
    </View>
    
    <Text className="text-[#1E40AF] text-xl">→</Text>
    
    <View className="px-3 py-1.5 bg-[#F1F5F9] rounded-lg">
      <Text className="text-[13px] text-[#64748B]">To</Text>
      <Text className="text-[15px] font-semibold text-[#0F172A]">Site: Sector 12</Text>
    </View>
  </View>

  {/* Items List */}
  <View className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
    <Text className="text-[13px] text-[#64748B] mb-2">Items</Text>
    <View className="gap-1">
      <Text className="text-[15px] text-[#0F172A]">• Portland Cement: 50 bags</Text>
      <Text className="text-[15px] text-[#0F172A]">• Steel TMT Bars: 100 pieces</Text>
    </View>
  </View>

  {/* Bottom: Status & Requester */}
  <View className="flex-row justify-between items-center">
    <View>
      <Text className="text-[13px] text-[#64748B]">Requested by</Text>
      <Text className="text-[15px] text-[#0F172A]">Site Manager • Rajesh K.</Text>
    </View>
    <StatusBadge status="pending" label="Pending" />
  </View>
</TouchableOpacity>
```

---

## Input Components

### Text Input with Validation States

**States:**
1. Default: Border #E2E8F0
2. Focus: Border #1E40AF, subtle blue shadow
3. Error: Border #DC2626, red error message below
4. Disabled: Background #F8FAFC, text #94A3B8, no interaction
5. Success (optional): Border #16A34A, green checkmark icon

**Complete Implementation:**
```tsx
<View className="gap-1.5">
  <Text className="text-[15px] text-[#0F172A]">
    Email Address
    {required && <Text className="text-[#DC2626]"> *</Text>}
  </Text>
  
  <View>
    <TextInput
      className={`
        border rounded-lg h-12 px-4 bg-white
        ${error ? 'border-[#DC2626]' : isFocused ? 'border-[#1E40AF]' : 'border-[#E2E8F0]'}
        ${disabled && 'bg-[#F8FAFC]'}
      `}
      placeholderTextColor="#94A3B8"
      placeholder="Enter email address"
      editable={!disabled}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
    
    {/* Error Message */}
    {error && (
      <View className="flex-row items-center gap-1 mt-1">
        <Text className="text-[#DC2626]">⚠</Text>
        <Text className="text-[13px] text-[#DC2626]">{error}</Text>
      </View>
    )}
    
    {/* Helper Text */}
    {helperText && !error && (
      <Text className="text-[13px] text-[#64748B] mt-1">{helperText}</Text>
    )}
  </View>
</View>
```

### Dropdown/Select

**Implementation using Bottom Sheet:**
```tsx
const [isOpen, setIsOpen] = useState(false);
const [selectedValue, setSelectedValue] = useState(null);

// Trigger Button
<TouchableOpacity 
  className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between"
  onPress={() => setIsOpen(true)}
>
  <Text className={selectedValue ? "text-[15px] text-[#0F172A]" : "text-[15px] text-[#94A3B8]"}>
    {selectedValue || "Select category"}
  </Text>
  <Text className="text-[#64748B]">▼</Text>
</TouchableOpacity>

// Bottom Sheet with Options
<Modal visible={isOpen} transparent animationType="slide">
  <Pressable 
    className="flex-1 bg-black/50 justify-end"
    onPress={() => setIsOpen(false)}
  >
    <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
      <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
      
      <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
        Select Category
      </Text>
      
      <ScrollView>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            className="h-12 flex-row items-center justify-between px-2"
            onPress={() => {
              setSelectedValue(option.label);
              setIsOpen(false);
            }}
          >
            <Text className="text-[15px] text-[#0F172A]">{option.label}</Text>
            {selectedValue === option.label && (
              <Text className="text-[#1E40AF]">✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </Pressable>
</Modal>
```

### Search Bar

**Dimensions:**
- Height: 48px
- Border radius: 9999 (fully rounded)
- Background: #F1F5F9 (unfocused), white (focused)

```tsx
<View className={`
  ${isFocused ? 'bg-white border border-[#1E40AF]' : 'bg-[#F1F5F9]'}
  rounded-full h-12 px-4 flex-row items-center gap-3
`}>
  <Text className="text-[#64748B] text-xl">🔍</Text>
  
  <TextInput
    className="flex-1 text-[15px] text-[#0F172A]"
    placeholder="Search items, POs, assets…"
    placeholderTextColor="#94A3B8"
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    value={searchQuery}
    onChangeText={setSearchQuery}
  />
  
  {searchQuery.length > 0 && (
    <TouchableOpacity onPress={() => setSearchQuery('')}>
      <Text className="text-[#64748B]">✕</Text>
    </TouchableOpacity>
  )}
</View>
```

### Quantity Input (Stepper)

```tsx
<View className="gap-1.5">
  <Text className="text-[15px] text-[#0F172A]">Quantity</Text>
  
  <View className="flex-row items-center gap-3">
    {/* Minus Button */}
    <TouchableOpacity 
      className="w-10 h-10 border border-[#E2E8F0] rounded-full items-center justify-center"
      onPress={handleDecrement}
      disabled={quantity <= minValue}
    >
      <Text className="text-[#1E40AF] text-xl font-bold">−</Text>
    </TouchableOpacity>
    
    {/* Number Display */}
    <TextInput
      className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold"
      keyboardType="numeric"
      value={String(quantity)}
      onChangeText={handleManualInput}
    />
    
    {/* Plus Button */}
    <TouchableOpacity 
      className="w-10 h-10 border-2 border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
      onPress={handleIncrement}
      disabled={quantity >= maxValue}
    >
      <Text className="text-white text-xl font-bold">+</Text>
    </TouchableOpacity>
  </View>
  
  <Text className="text-[13px] text-[#64748B]">
    Min: {minValue}, Max: {maxValue}
  </Text>
</View>
```

---

## Button Specifications

### All Button Variants

```tsx
// PRIMARY BUTTON
<TouchableOpacity 
  className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center px-6"
  activeOpacity={0.7}
  disabled={isDisabled}
  style={{ opacity: isDisabled ? 0.5 : 1 }}
>
  <Text className="text-[15px] font-semibold text-white">Submit Request</Text>
</TouchableOpacity>

// SECONDARY/OUTLINED BUTTON
<TouchableOpacity 
  className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center px-6"
  activeOpacity={0.7}
>
  <Text className="text-[15px] font-semibold text-[#1E40AF]">Save as Draft</Text>
</TouchableOpacity>

// DESTRUCTIVE BUTTON
<TouchableOpacity 
  className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center px-6"
  activeOpacity={0.7}
>
  <Text className="text-[15px] font-semibold text-white">Delete Item</Text>
</TouchableOpacity>

// GHOST/TEXT BUTTON
<TouchableOpacity 
  className="h-11 items-center justify-center flex-row gap-2 px-3"
  activeOpacity={0.6}
>
  <Text className="text-[15px] text-[#3B82F6]">View All</Text>
  <Text className="text-[#3B82F6]">→</Text>
</TouchableOpacity>

// ICON BUTTON
<TouchableOpacity 
  className="w-11 h-11 items-center justify-center rounded-full"
  activeOpacity={0.6}
>
  {/* Icon 24px */}
</TouchableOpacity>

// FLOATING ACTION BUTTON (FAB)
<TouchableOpacity 
  className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-[#1E40AF] items-center justify-center shadow-lg"
  activeOpacity={0.8}
>
  <Text className="text-white text-2xl">+</Text>
</TouchableOpacity>
```

---

## Loading & Empty States

### Skeleton Loader

```tsx
const SkeletonCard = () => (
  <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
    {/* Shimmer effect using Animated or library like react-native-shimmer-placeholder */}
    <View className="flex-row justify-between mb-3">
      <View className="h-5 w-48 bg-[#E2E8F0] rounded" />
      <View className="h-6 w-20 bg-[#E2E8F0] rounded-full" />
    </View>
    
    <View className="flex-row gap-4 mb-3">
      <View className="flex-1">
        <View className="h-4 w-16 bg-[#E2E8F0] rounded mb-1" />
        <View className="h-4 w-24 bg-[#E2E8F0] rounded" />
      </View>
      <View className="flex-1">
        <View className="h-4 w-16 bg-[#E2E8F0] rounded mb-1" />
        <View className="h-4 w-24 bg-[#E2E8F0] rounded" />
      </View>
    </View>
    
    <View className="border-t border-[#E2E8F0] pt-2">
      <View className="h-3 w-32 bg-[#E2E8F0] rounded" />
    </View>
  </View>
);

// Render 3 skeleton cards
<View className="px-4">
  <SkeletonCard />
  <SkeletonCard />
  <SkeletonCard />
</View>
```

### Empty State (Full Spec)

```tsx
<View className="flex-1 items-center justify-center px-4">
  {/* Icon/Illustration */}
  <View className="w-20 h-20 items-center justify-center mb-4">
    <Text className="text-6xl opacity-40">📋</Text>
  </View>
  
  {/* Title */}
  <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
    No Purchase Orders Yet
  </Text>
  
  {/* Subtitle */}
  <Text className="text-[15px] text-[#64748B] text-center max-w-sm mb-6">
    Create your first PO to start tracking procurement and manage supplier orders
  </Text>
  
  {/* Primary Action */}
  <TouchableOpacity 
    className="bg-[#1E40AF] rounded-[10px] h-[50px] px-8 items-center justify-center"
    onPress={onCreatePO}
  >
    <Text className="text-[15px] font-semibold text-white">Create Purchase Order</Text>
  </TouchableOpacity>
</View>
```

### Error State

```tsx
<View className="flex-1 items-center justify-center px-4">
  <View className="w-20 h-20 items-center justify-center mb-4">
    <Text className="text-6xl">⚠️</Text>
  </View>
  
  <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
    Something went wrong
  </Text>
  
  <Text className="text-[15px] text-[#64748B] text-center max-w-sm mb-6">
    We couldn't load your inventory. Please check your connection and try again.
  </Text>
  
  <TouchableOpacity 
    className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] px-8 items-center justify-center"
    onPress={onRetry}
  >
    <Text className="text-[15px] font-semibold text-[#1E40AF]">Retry</Text>
  </TouchableOpacity>
</View>
```

---

## Stock Level Indicator

**Visual Progress Bar with Dynamic Colors:**

```tsx
type StockLevelProps = {
  current: number;
  max: number;
  unit: string;
};

const StockLevelIndicator = ({ current, max, unit }: StockLevelProps) => {
  const percentage = (current / max) * 100;
  
  // Color logic
  const getColor = () => {
    if (percentage > 50) return '#16A34A'; // Green
    if (percentage > 20) return '#D97706'; // Amber
    return '#DC2626'; // Red
  };
  
  return (
    <View className="gap-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">Stock Level</Text>
        <Text className="text-[15px] font-semibold text-[#0F172A]">
          {current} / {max} {unit}
        </Text>
      </View>
      
      {/* Progress Bar */}
      <View className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <View 
          className="h-full rounded-full"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getColor()
          }}
        />
      </View>
    </View>
  );
};
```

---

## Confirmation Dialog

```tsx
<Modal visible={isVisible} transparent animationType="fade">
  <View className="flex-1 bg-black/50 items-center justify-center px-4">
    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
      {/* Icon */}
      <View className="w-12 h-12 rounded-full bg-[#DC2626]/15 items-center justify-center mb-4 self-center">
        <Text className="text-[#DC2626] text-2xl">⚠</Text>
      </View>
      
      {/* Title */}
      <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
        Delete Item?
      </Text>
      
      {/* Description */}
      <Text className="text-[15px] text-[#64748B] text-center mb-6">
        Are you sure you want to delete "Portland Cement"? This action cannot be undone.
      </Text>
      
      {/* Buttons */}
      <View className="flex-row gap-3">
        <TouchableOpacity 
          className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center"
          onPress={onCancel}
        >
          <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-1 bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
          onPress={onConfirm}
        >
          <Text className="text-[15px] font-semibold text-white">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

---

This comprehensive component reference provides exact specifications for implementing every CIAMS UI element consistently across the application.
