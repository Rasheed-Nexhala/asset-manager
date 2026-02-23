# UI Patterns & Design System Analysis

**Asset Manager App** — React Native / NativeWind / CIAMS Design System

**Generated:** February 22, 2025

---

## 1. Design System Reference

**Source:** `/Applications/React/Nexhala/asset-manager/asset-manager/.cursor/skills/ciams-design-system/SKILL.md`

### Core Principles
- **Industrial Clarity** — Designed for dusty job sites, bright sunlight, gloved hands
- **Trust Through Structure** — Structured, organized, authoritative UI
- **48px minimum touch targets** — All interactive elements
- **High contrast** — 4.5:1 minimum text contrast
- **One primary action per screen** — Single blue primary button

### Color Palette (NativeWind)
| Purpose | Class | Hex |
|---------|-------|-----|
| Primary Blue | `bg-[#1E40AF]`, `text-[#1E40AF]` | #1E40AF |
| Primary Light | `bg-[#3B82F6]` | #3B82F6 |
| Success | `bg-[#16A34A]/15`, `text-[#16A34A]` | #16A34A |
| Warning | `bg-[#D97706]/15`, `text-[#D97706]` | #D97706 |
| Danger | `bg-[#DC2626]/15`, `text-[#DC2626]` | #DC2626 |
| Info/Neutral | `bg-[#475569]/15`, `text-[#64748B]` | #475569 / #64748B |
| App Background | `bg-[#F8FAFC]` | #F8FAFC |
| Card/Input BG | `bg-white` | white |
| Borders | `border-[#E2E8F0]` | #E2E8F0 |
| Primary Text | `text-[#0F172A]` | #0F172A |
| Secondary Text | `text-[#64748B]` | #64748B |
| Placeholder | `text-[#94A3B8]` | #94A3B8 |

### Typography Scale
| Role | Classes |
|------|---------|
| Display (KPIs) | `text-[32px] font-bold text-[#0F172A]` |
| Screen Title | `text-[22px] font-semibold text-[#0F172A]` |
| Section Header | `text-[17px] font-semibold text-[#0F172A]` |
| Card Title | `text-[15px] font-semibold text-[#0F172A]` |
| Body | `text-[15px] text-[#0F172A]` |
| Caption/Meta | `text-[13px] text-[#64748B]` |
| Badge Text | `text-[12px] font-medium` |

### Spacing (4px base)
| Use | Class |
|-----|-------|
| Screen padding | `px-4` (16px) |
| Card padding | `p-4` (16px) |
| Between cards | `gap-3` (12px), `mb-3` |
| Between sections | `gap-6` (24px) |
| Between form fields | `gap-4` (16px) |
| Label to input | `gap-1.5` (6px) |
| Button padding | `py-3.5 px-6`, `h-[50px]` |

---

## 2. Component Inventory & Categorization

**Base path:** `/Applications/React/Nexhala/asset-manager/asset-manager/src/components/`

### 2.1 Layout Components
| Component | Path | Purpose |
|-----------|------|---------|
| **ScreenLayout** | `layout/ScreenLayout.tsx` | SafeAreaView wrapper with optional KeyboardAvoidingView, `bg-[#F8FAFC]` |
| **ScreenHeader** | `ScreenHeader.tsx` | Title bar with back button, left/right actions, loading state for right action |

### 2.2 Form Components
| Component | Path | Purpose |
|-----------|------|---------|
| **FormField** | `FormField.tsx` | Reusable labeled input: label, required asterisk, error state, right icon (e.g. password toggle) |
| **ItemForm** | `Inventory/ItemForm.tsx` | Full item create/edit form with steel master, category, unit, image |
| **VendorForm** | `PurchaseOrder/VendorForm.tsx` | Vendor fields using FormField; controlled via `data` + `onChange` |
| **SiteForm** | `Sites/SiteForm.tsx` | Site create/edit with FormField, SiteManagerSelector, status toggle |
| **SteelMasterForm** | `Inventory/SteelMasterForm.tsx` | Steel master create/edit |
| **UpdatePasswordForm** | `UpdatePasswordForm.tsx` | Password change using FormField with success/error banners |

### 2.3 Selector Components (Dropdown/Modal)
| Component | Path | Purpose |
|-----------|------|---------|
| **CategorySelector** | `Inventory/CategorySelector.tsx` | Touchable trigger → bottom sheet modal with list + "Add New Category" |
| **UnitSelector** | `Inventory/UnitSelector.tsx` | Unit of measurement picker |
| **SteelMasterSelector** | `Inventory/SteelMasterSelector.tsx` | Steel master selection |
| **VendorSelector** | `PurchaseOrder/VendorSelector.tsx` | Vendor picker |
| **SiteManagerSelector** | `Sites/SiteManagerSelector.tsx` | Site manager user picker |
| **PrioritySelector** | `Requests/PrioritySelector.tsx` | High/Medium/Low priority |
| **IssueTypeSelector** | `Maintenance/IssueTypeSelector.tsx` | Maintenance issue type |
| **WriteOffReasonSelector** | `Maintenance/WriteOffReasonSelector.tsx` | Write-off reason |

### 2.4 Card Components (List Cards)
| Component | Path | Structure |
|-----------|------|-----------|
| **ItemCard** | `Inventory/ItemCard.tsx` | Image + name/SKU + badges (type, low stock) + key-value grid (Total, Central Store, At Sites, Maintenance) |
| **POCard** | `PurchaseOrder/POCard.tsx` | Title + POStatusBadge → Vendor/Items grid → Footer (date, amount) |
| **RequestCard** | `Requests/RequestCard.tsx` | Priority emoji + number + RequestStatusBadge → Site/Items → AvailabilityIndicator (optional) → Footer |
| **MaintenanceCard** | `Maintenance/MaintenanceCard.tsx` | Item name + MaintenanceStatusBadge → SKU/Quantity/IssueType/Added grid → Footer |
| **SiteCard** | `Sites/SiteCard.tsx` | Icon + name + status badge → Manager/Location/Description rows |
| **VendorCard** | `PurchaseOrder/VendorCard.tsx` | Vendor list item |
| **ActivityLogCard** | `ActivityLog/ActivityLogCard.tsx` | Activity log list item |
| **CategoryListItem** | `Inventory/CategoryListItem.tsx` | Category row |
| **InventoryListItem** | `Inventory/InventoryListItem.tsx` | Inventory list row |
| **POItemCard** | `PurchaseOrder/POItemCard.tsx` | PO line item |
| **RequestItemCard** | `Requests/RequestItemCard.tsx` | Request line item |

### 2.5 Status Badge Components
| Component | Path | Statuses |
|-----------|------|----------|
| **POStatusBadge** | `PurchaseOrder/POStatusBadge.tsx` | draft, pending_approval, approved, ordered, received, rejected |
| **RequestStatusBadge** | `Requests/RequestStatusBadge.tsx` | draft, pending, approved, rejected, transferred, partially_returned, returned, cancelled |
| **StockStatusBadge** | `Inventory/StockStatusBadge.tsx` | adequate, low_stock, discontinued |
| **MaintenanceStatusBadge** | `Maintenance/MaintenanceStatusBadge.tsx` | Maintenance-specific statuses |

### 2.6 Modal Components
| Component | Path | Pattern |
|-----------|------|---------|
| **StockEntryModal** | `Inventory/StockEntryModal.tsx` | Bottom sheet: handle bar, header, form (entry mode, amount, reason, notes) |
| **CategorySelector** (modal) | `Inventory/CategorySelector.tsx` | Bottom sheet: `bg-white rounded-t-2xl`, handle bar |
| **CategoryEditModal** | `Inventory/CategoryEditModal.tsx` | Category edit in modal |
| **POItemSelectorModal** | `PurchaseOrder/POItemSelectorModal.tsx` | Item selection for PO |
| **ItemSelectorModal** | `Requests/ItemSelectorModal.tsx` | Item selection for requests |
| **ActivityLogFilterModal** | `ActivityLog/ActivityLogFilterModal.tsx` | Filter options with date pickers |
| **ActivityLogDetailModal** | `ActivityLog/ActivityLogDetailModal.tsx` | Activity detail view |
| **ManagerReassignmentConfirmationModal** | `Sites/ManagerReassignmentConfirmationModal.tsx` | Confirmation before reassignment |

### 2.7 Other Components
| Component | Path | Purpose |
|-----------|------|---------|
| **AuthLogo** | `AuthLogo.tsx` | Auth screen logo |
| **WeightDisplay** | `Inventory/WeightDisplay.tsx` | Displays quantity in Pcs or Kg based on view mode |
| **ViewModeToggle** | `Inventory/ViewModeToggle.tsx` | Pcs ↔ Kg toggle for steel items |
| **AvailabilityIndicator** | `Requests/AvailabilityIndicator.tsx` | "All items available" / "Insufficient stock" |
| **InvoiceUploadField** | `PurchaseOrder/InvoiceUploadField.tsx` | Invoice file upload |
| **POReceiptSummary** | `PurchaseOrder/POReceiptSummary.tsx` | PO receipt summary |
| **MyRecentActivityWidget** | `ActivityLog/MyRecentActivityWidget.tsx` | Dashboard recent activity |
| **QuickMoveToMaintenanceButton** | `Maintenance/QuickMoveToMaintenanceButton.tsx` | Quick action button |
| **UserProfile** | `UserProfile/UserProfile.tsx` | User profile section |
| **Users** | `Users/Users.tsx` | User management list |

---

## 3. Common NativeWind Patterns

### 3.1 Standard Card
```tsx
className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
```
Used in: ItemCard, POCard, RequestCard, MaintenanceCard, SiteCard

### 3.2 Status Badge
```tsx
<View className={`px-2 py-1 rounded-full ${config.bg}`}>
  <Text className={`text-[12px] font-medium ${config.text}`}>{label}</Text>
</View>
```
- Background: `bg-[#16A34A]/15`, `bg-[#D97706]/15`, `bg-[#DC2626]/15`, `bg-[#475569]/15`, `bg-[#64748B]/15`
- Text: matching full-color class

### 3.3 Primary Button
```tsx
className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
// Loading state:
className="bg-[#1E40AF]/70" // or opacity-50 on container
```

### 3.4 Secondary Button
```tsx
className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
// Text:
className="text-[15px] font-semibold text-[#1E40AF]"
```

### 3.5 Text Input
```tsx
className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
// Error state:
className="border-[#DC2626]"
// Placeholder:
placeholderTextColor="#94A3B8"
```

### 3.6 Form Field Layout
```tsx
<View className="gap-1.5">
  <Text className="text-[15px] text-[#0F172A]">Label</Text>
  <TextInput ... />
  {error && <Text className="text-[13px] text-[#DC2626]">{error}</Text>}
</View>
```

### 3.7 Bottom Sheet Modal
```tsx
<Modal visible={visible} transparent animationType="slide">
  <View className="flex-1 bg-black/50 justify-end">
    <View className="bg-white rounded-t-2xl p-4">
      <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mb-4" />
      {/* Content */}
    </View>
  </View>
</Modal>
```

### 3.8 Segmented Control / Radio Group
```tsx
<TouchableOpacity
  className={`flex-1 border rounded-lg h-12 items-center justify-center ${
    selected ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
  }`}
>
  <Text className={selected ? 'text-white' : 'text-[#0F172A]'}>Option</Text>
</TouchableOpacity>
```

### 3.9 Key-Value Grid (Card Body)
```tsx
<View className="flex-row gap-4 mb-3">
  <View className="flex-1">
    <Text className="text-[13px] text-[#64748B]">Label</Text>
    <Text className="text-[15px] text-[#0F172A]">Value</Text>
  </View>
  ...
</View>
```

### 3.10 Card Footer
```tsx
<View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
  <Text className="text-[13px] text-[#64748B]">Meta info</Text>
  <Ionicons name="chevron-forward" size={16} color="#64748B" />
</View>
```

---

## 4. Form Validation Patterns

### 4.1 Validation Approach
- **Local state:** `useState` for `errors` object (`Record<string, string>` or typed `FormErrors`)
- **Validate on submit:** `validateForm()` returns `boolean`, sets errors via `setErrors()`
- **Clear on change:** When field updates, clear that field's error: `setErrors(prev => ({ ...prev, [field]: undefined }))`

### 4.2 FormField Integration
- `FormField` accepts `error?: string` and shows red border + error text below
- Error text: `text-[13px] text-[#DC2626]` with `accessibilityLiveRegion="polite"`

### 4.3 Validation Examples
| Form | Validation |
|------|-------------|
| **UpdatePasswordForm** | Required fields, min 6 chars, password match, `auth/wrong-password` handling |
| **ItemForm** | Required: name, sku, category, unit, initialQuantity, minStockLevel; weight conversion validation for Kg/Ton |
| **VendorForm** | Required: name, phone; errors passed from parent |
| **SiteForm** | Required: name, address; phone regex; manager reassignment confirmation for inactive |
| **StockEntryModal** | Amount > 0, reason, notes; weight conversion for steel items |

### 4.4 Success/Error Banners
```tsx
// Success
<View className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3">
  <Text className="text-[13px] text-[#16A34A]">Success message</Text>
</View>

// Error
<View className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3">
  <Text className="text-[13px] text-[#DC2626]">{error}</Text>
</View>
```

---

## 5. Navigation Patterns

**Base path:** `/Applications/React/Nexhala/asset-manager/asset-manager/src/navigation/`

### 5.1 Structure
```
RootNavigator (AuthStack)
├── Auth (unauthenticated)
├── Loading (role loading)
└── Main (MainStackNavigator)
    ├── Tabs (BottomTabNavigator)
    │   ├── Dashboard (DashboardStackNavigator)
    │   ├── Inventory (InventoryStackNavigator)
    │   ├── Requests (RequestStackNavigator)
    │   ├── PurchaseOrders (PurchaseOrderStackNavigator)
    │   └── Sites (SiteStackNavigator) — Admin only
    └── UpdatePasswordScreen (card presentation)
```

### 5.2 Stack Navigators
- **Library:** `@react-navigation/stack` (`createStackNavigator`)
- **Header:** `headerShown: false` — custom `ScreenHeader` used
- **Presentation:** `presentation: 'card'`, `gestureEnabled: true` for detail screens

### 5.3 Tab Navigator
- **Library:** `@react-navigation/bottom-tabs` (`createBottomTabNavigator`)
- **Styling:** `tabBarActiveTintColor: '#1E40AF'`, `tabBarInactiveTintColor: '#64748B'`
- **Tab bar:** `backgroundColor: '#FFFFFF'`, `borderTopColor: '#E2E8F0'`
- **Role-based tabs:** Inventory, Requests, PurchaseOrders, Sites visibility based on Admin/StoreIncharge/SiteManager
- **Badges:** `tabBarBadge` for high-priority requests, pending PO approvals

### 5.4 Modal Presentation
- **Stack modals:** `UpdatePasswordScreen` as separate stack screen with `presentation: 'card'`
- **In-screen modals:** React Native `Modal` with `transparent`, `animationType="slide"` for bottom sheets (CategorySelector, StockEntryModal, etc.)

---

## 6. Loading States & Error Handling UI

### 6.1 Loading Patterns
| Context | Pattern |
|---------|---------|
| **Full screen** | `LoadingScreen`: `ActivityIndicator size="large" color="#1E40AF"` + message |
| **List/data fetch** | Centered `ActivityIndicator` + "Loading..." text in content area |
| **Button submit** | Button disabled, `ActivityIndicator size="small"` + "Please wait…" text |
| **Header action** | `ScreenHeader` rightAction `loading: true` → spinner + "Please wait…" |
| **Selector modal** | `ActivityIndicator` in modal when categories/items loading |

### 6.2 Button Loading
```tsx
<TouchableOpacity
  className={loading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'}
  disabled={loading}
  accessibilityState={{ disabled: loading, busy: loading }}
>
  {loading ? (
    <>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
    </>
  ) : (
    <Text>Submit</Text>
  )}
</TouchableOpacity>
```

### 6.3 Error Handling UI
| Type | Pattern |
|------|---------|
| **Field error** | Red border on input + `text-[13px] text-[#DC2626]` below |
| **Form-level error** | Banner: `bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3` |
| **Subscription/load error** | Inline error view with icon (e.g. `cloud-offline-outline`), retry option |
| **Critical errors** | `Alert.alert('Error', message)` for operations (receive PO, approve, etc.) |

### 6.4 Empty States
- Design system recommends: icon (emoji or Ionicons), title, description, primary CTA
- Example structure: `flex-1 items-center justify-center px-4` with `text-6xl` emoji, `text-[22px] font-semibold`, `text-[15px] text-[#64748B]`, primary button

### 6.5 Accessibility
- `accessibilityLabel`, `accessibilityRole`, `accessibilityState` on interactive elements
- `accessibilityLiveRegion="polite"` for error/success messages
- Loading: `accessibilityLabel` variants like "Saving, please wait", "Loading purchase orders"

---

## 7. Summary: Reusable Patterns Checklist

| Pattern | Location / Usage |
|---------|------------------|
| **FormField** | All text inputs with label, error, optional right icon |
| **StatusBadge** | POStatusBadge, RequestStatusBadge, StockStatusBadge, MaintenanceStatusBadge — same structure |
| **List Card** | ItemCard, POCard, RequestCard, MaintenanceCard, SiteCard — title + badge, key-value grid, footer |
| **Bottom Sheet Modal** | StockEntryModal, CategorySelector, ActivityLogFilterModal — handle bar, `rounded-t-2xl` |
| **Primary/Secondary Buttons** | Consistent `h-[50px]`, `rounded-[10px]`, loading state |
| **ScreenLayout + ScreenHeader** | Standard screen shell |
| **Validation** | Local errors state, validate on submit, clear on change |
| **Loading** | ActivityIndicator `color="#1E40AF"` (or white on primary button) |

---

*Document generated from codebase analysis. For implementation details, refer to the component files listed above.*
