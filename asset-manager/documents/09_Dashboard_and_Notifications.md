# CIAMS - Dashboard & Notifications
## Module 8: Role-Based Dashboards and Push Notifications

---

## Feature Description

Role-specific dashboards showing relevant metrics, alerts, and quick actions. Real-time push notifications for critical events.

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-8.1 | As an **Admin**, I want a dashboard showing system-wide metrics | High |
| US-8.2 | As a **Store Incharge**, I want alerts for pending requests and low stock | High |
| US-8.3 | As a **Site Manager**, I want to see my inventory and request status | High |
| US-8.4 | As a **User**, I want push notifications for relevant events | High |

---

## Dashboard Designs

### Admin Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Admin                 │
│ Jan 20, 2025                   │
├─────────────────────────────────┤
│ QUICK STATS                    │
│ ┌───────┐ ┌───────┐ ┌───────┐  │
│ │  📦   │ │  📋   │ │  🏗️   │  │
│ │  156  │ │   3   │ │   5   │  │
│ │ Items │ │Pending│ │ Sites │  │
│ │       │ │  POs  │ │       │  │
│ └───────┘ └───────┘ └───────┘  │
├─────────────────────────────────┤
│ ⚠️ NEEDS ATTENTION              │
│ • 3 POs awaiting approval      │
│ • 8 items in maintenance       │
│ • 8 low stock alerts           │
├─────────────────────────────────┤
│ RECENT ACTIVITY                │
│ • PO-0018 submitted            │
│ • REQ-0045 created             │
│ [View All →]                   │
├─────────────────────────────────┤
│ [Users] [Sites] [POs] [Logs]   │
└─────────────────────────────────┘
```

### Store Incharge Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Rajesh                │
│ Jan 20, 2025                   │
├─────────────────────────────────┤
│ ⚡ ACTION REQUIRED              │
│ • 5 Pending Requests (2 High)  │
│ • 1 PO Approved - Ready to order│
│ • 1 PO Awaiting Delivery       │
├─────────────────────────────────┤
│ 📦 INVENTORY ALERTS             │
│ • 8 Low Stock Items            │
│ • 5 Items in Maintenance       │
├─────────────────────────────────┤
│ TODAY'S SUMMARY                │
│ Requests Processed: 3          │
│ Items Transferred: 15          │
│ POs Created: 1                 │
├─────────────────────────────────┤
│ [Requests] [Inventory]         │
│ [New PO] [Maintenance]         │
└─────────────────────────────────┘
```

### Site Manager Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Amit                  │
│ Site A - Greenfield            │
├─────────────────────────────────┤
│ 📦 MY INVENTORY                 │
│ Total: 45 items                │
│ Non-Consumables: 12            │
│ Consumables: 33                │
│ [View Inventory →]             │
├─────────────────────────────────┤
│ 📋 MY REQUESTS                  │
│ Pending: 2                     │
│ • REQ-0045 - Awaiting          │
│ • REQ-0046 - Awaiting          │
│ Recent Approved: REQ-0043      │
├─────────────────────────────────┤
│ 🔔 UPDATES                      │
│ • REQ-0045 edited by Store     │
│   "Cement qty reduced to 20"   │
├─────────────────────────────────┤
│ [New Request] [Return Items]   │
│ [View Other Sites]             │
└─────────────────────────────────┘
```

---

## Push Notifications

### Notification Events Matrix

| Event | Recipient | Priority | Message Template |
|-------|-----------|----------|------------------|
| **Requests** |
| New Request (High) | Store Incharge | High | "🔴 High priority: {siteName} - {itemCount} items" |
| New Request (Med/Low) | Store Incharge | Normal | "📋 New request: {siteName} - {itemCount} items" |
| Request Edited | Site Manager | Normal | "✏️ {requestNumber} modified by Store" |
| Request Approved | Site Manager | High | "✅ {requestNumber} approved!" |
| Request Rejected | Site Manager | High | "❌ {requestNumber} rejected - {reason}" |
| Request Ready | Site Manager | High | "📦 {requestNumber} ready for pickup" |
| **Purchase Orders** |
| PO Submitted | Admin | High | "📋 PO pending: ₹{amount}" |
| PO Approved | Store Incharge | Normal | "✅ {poNumber} approved" |
| PO Rejected | Store Incharge | Normal | "❌ {poNumber} rejected - {reason}" |
| PO Delivered | Store Incharge | Normal | "🚚 {poNumber} delivery expected today" |
| **Inventory** |
| Low Stock | Store Incharge | High | "⚠️ {itemName} below minimum ({quantity} left)" |
| Stock Critical | Store Incharge, Admin | Critical | "🚨 {itemName} critically low ({quantity} left)" |
| **Maintenance** |
| Item Returned | Store Incharge | Normal | "🔧 {itemName} returned from maintenance" |
| **System** |
| New User Created | User | Normal | "👤 Your CIAMS account is ready" |

---

## Notification Settings

### User Notification Preferences

```
┌─────────────────────────────────┐
│ ← Notification Settings        │
├─────────────────────────────────┤
│ PUSH NOTIFICATIONS             │
│ ☑️ Enable push notifications    │
│                                │
│ REQUESTS                       │
│ ☑️ New requests                 │
│ ☑️ Request status changes       │
│ ☑️ Request edits                │
│                                │
│ PURCHASE ORDERS                │
│ ☑️ PO approvals                 │
│ ☑️ PO status updates            │
│                                │
│ INVENTORY                      │
│ ☑️ Low stock alerts             │
│ ☑️ Critical stock alerts        │
│                                │
│ QUIET HOURS                    │
│ ☑️ Enable quiet hours           │
│ From: [22:00] To: [08:00]      │
│                                │
└─────────────────────────────────┘
```

---

## Dashboard Widgets

### Low Stock Alert Widget

```
┌─────────────────────────────────┐
│ ⚠️ LOW STOCK ALERTS (8)         │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Cement Bags (50kg)          │ │
│ │ 30 / Min: 50  [Create PO]   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Steel Rods (12mm)           │ │
│ │ 45 / Min: 100 [Create PO]   │ │
│ └─────────────────────────────┘ │
│ [View All Alerts →]            │
└─────────────────────────────────┘
```

### Pending Requests Widget

```
┌─────────────────────────────────┐
│ 📋 PENDING REQUESTS (5)         │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🔴 REQ-0045 - Site A         │ │
│ │ 3 items | 1 insufficient    │ │
│ │ 2 hours ago           [View]│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🔴 REQ-0046 - Site B         │ │
│ │ 5 items | All available     │ │
│ │ 4 hours ago        [Approve]│ │
│ └─────────────────────────────┘ │
│ [View All Requests →]          │
└─────────────────────────────────┘
```

### Maintenance Items Widget

```
┌─────────────────────────────────┐
│ 🔧 IN MAINTENANCE (5)           │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Power Drill - Under Repair  │ │
│ │ 6 days                      │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Mixer - Ready to Return     │ │
│ │ 3 days              [Return]│ │
│ └─────────────────────────────┘ │
│ [View All →]                   │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-8.1: Dashboard Load
- Dashboard loads within 2 seconds
- Shows real-time data (updated on load)
- Cached for offline viewing

### AC-8.2: Push Notifications
- Delivered within 30 seconds of event
- Tapping notification opens relevant screen
- Badge count updates on app icon
- Respects quiet hours setting

### AC-8.3: Dashboard Refresh
- Pull-to-refresh updates all widgets
- Auto-refresh when app comes to foreground
- Loading states shown during refresh

### AC-8.4: Quick Actions
- Dashboard provides shortcuts to common tasks
- One-tap access to critical functions
- Context-aware based on role

---

## Dashboard Metrics

### Admin Metrics
- Total items in system
- Active sites count
- Pending POs requiring approval
- Low stock items count
- Items in maintenance
- Active users count
- Today's request count
- This week's PO value

### Store Incharge Metrics
- Pending requests count (by priority)
- Low stock items count
- Items in maintenance
- Pending PO deliveries
- Today's transfers count
- This week's PO count

### Site Manager Metrics
- Total items at site
- Consumable vs non-consumable split
- Pending requests count
- Approved requests count
- Recent request updates
- Items due for return

---

## Real-Time Updates

### Events Triggering Dashboard Updates

1. **Request Created** → Store Incharge dashboard updates pending count
2. **Request Approved** → Site Manager dashboard shows in approved section
3. **Stock Falls Below Minimum** → Store Incharge sees new low stock alert
4. **PO Submitted** → Admin dashboard shows pending PO
5. **Item Transferred** → Both dashboards update inventory counts
6. **Maintenance Item Fixed** → Store Incharge sees ready-to-return item

---

## Notification Delivery

### Firebase Cloud Messaging (FCM)

```javascript
// Notification Payload Structure
{
  notification: {
    title: "Request Approved",
    body: "REQ-0045 has been approved!",
    icon: "notification_icon",
    sound: "default"
  },
  data: {
    type: "request_approved",
    requestId: "req_2025_0045",
    requestNumber: "REQ-2025-0045",
    targetScreen: "RequestDetail"
  }
}
```

### Notification Handling

1. User receives notification
2. Taps notification
3. App opens to relevant screen
4. Notification marked as read
5. Badge count decremented

---

## Business Rules

- Notifications sent only to relevant users based on role
- High-priority items highlighted in red
- Quick actions context-sensitive to user role
- Dashboard data refreshed on app foreground
- Quiet hours respected (22:00 - 08:00 default)
- Badge count shows unread notification count
- Notifications stored for 30 days
- Users can customize notification preferences

---

## Use Cases

### Use Case 1: Store Incharge Morning Routine
1. Opens app
2. Dashboard loads showing pending requests
3. Sees 2 high-priority requests
4. Sees 3 low stock alerts
5. Taps "Pending Requests"
6. Reviews and processes high-priority first

### Use Case 2: Site Manager Receives Approval
1. Receives push notification
2. "✅ REQ-0045 approved!"
3. Taps notification
4. App opens to request detail
5. Sees approved status
6. Coordinates pickup with team

### Use Case 3: Admin Reviews System Health
1. Opens dashboard
2. Reviews quick stats
3. Sees 3 POs awaiting approval
4. Taps "POs"
5. Reviews each PO
6. Approves/rejects based on discretion
