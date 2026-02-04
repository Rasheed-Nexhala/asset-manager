# CIAMS - Authentication & User Management
## Module 1: User Access and Account Management

---

## Feature Description

Secure authentication with role-based access. **Only Admin can create users** - no self-registration. Admin sets temporary password and communicates it to users manually (phone/in-person). Users can change password after first login.

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-1.1 | As an **Admin**, I want to create user accounts with temporary passwords so that I can onboard employees | High |
| US-1.2 | As an **Admin**, I want to assign roles and sites to users so that they have appropriate access | High |
| US-1.3 | As a **User**, I want to log in with email and password so that I can access the system | High |
| US-1.4 | As a **User**, I want to change my password so that I can set a secure personal password | High |
| US-1.5 | As an **Admin**, I want to enable/disable user accounts so that I can control access | High |

---

## Screen Designs

### Login Screen

```
┌─────────────────────────────────┐
│                                 │
│         🏗️ CIAMS                │
│   Construction Inventory        │
│      Management System          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Email                     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Password            👁️    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │        LOGIN              │  │
│  └───────────────────────────┘  │
│                                 │
│       Forgot Password?          │
│                                 │
│  Version 1.0.0                  │
└─────────────────────────────────┘
```

### User Management Screen (Admin Only)

```
┌─────────────────────────────────┐
│ ← User Management         [+]  │
├─────────────────────────────────┤
│ 🔍 Search users...              │
├─────────────────────────────────┤
│ Filter: [All Roles ▼] [Status ▼]│
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 👤 Rajesh Kumar             │ │
│ │ Store Incharge              │ │
│ │ 🟢 Active                   │ │
│ │ Last login: Today, 9:00 AM  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 👤 Amit Singh               │ │
│ │ Site Manager • Site A       │ │
│ │ 🟢 Active                   │ │
│ │ Last login: Yesterday       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 👤 Priya Sharma             │ │
│ │ Site Manager • Site B       │ │
│ │ 🔴 Disabled                 │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Total: 12 | Active: 10         │
└─────────────────────────────────┘
```

### Add/Edit User Screen

```
┌─────────────────────────────────┐
│ ← Add New User          [Save] │
├─────────────────────────────────┤
│                                 │
│ Full Name *                     │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ Email *                         │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ Phone Number *                  │
│ ┌───────────────────────────┐   │
│ │ +91                       │   │
│ └───────────────────────────┘   │
│                                 │
│ Temporary Password *            │
│ ┌───────────────────────────┐   │
│ │ ••••••••            👁️    │   │
│ └───────────────────────────┘   │
│ ℹ️ Share this with the user     │
│                                 │
│ Role *                          │
│ ○ Store Incharge                │
│ ○ Site Manager                  │
│                                 │
│ Assign to Site * (if Site Mgr)  │
│ ┌───────────────────────────┐   │
│ │ Select Site            ▼  │   │
│ └───────────────────────────┘   │
│                                 │
│ Status                          │
│ [🟢 Active] [🔴 Disabled]       │
│                                 │
│ ┌───────────────────────────┐   │
│ │      CREATE USER          │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1.1: User Creation
- Admin can create users with unique email
- Temporary password minimum 8 characters
- Role selection mandatory
- Site assignment mandatory for Site Manager role
- System validates email format and uniqueness

### AC-1.2: User Login
- Users login with email and password
- Failed login shows generic error (security)
- Account locks after 5 failed attempts for 15 minutes
- Session persists until logout or 30 days

### AC-1.3: Password Change
- All users can change their own password
- Current password verification required
- New password minimum 8 characters

### AC-1.4: User Disable
- Disabled users cannot log in
- Existing sessions invalidated
- User data preserved
- Can be re-enabled anytime

---

## Data Model

### users Collection

```javascript
{
  id: "user_abc123",
  email: "amit@company.com",
  fullName: "Amit Singh",
  phone: "+91-9876543210",
  role: "site_manager",        // admin|store_incharge|site_manager
  assignedSiteId: "site_001",  // null for admin/store_incharge
  status: "active",            // active|disabled
  mustChangePassword: true,
  createdAt: Timestamp,
  createdBy: "admin_id",
  lastLoginAt: Timestamp,
  fcmTokens: ["token1"]
}
```

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| changePassword | POST | All | Change own password |
| createUser | POST | Admin | Create new user |
| updateUser | PUT | Admin | Update user/disable |
| listUsers | GET | Admin | List all users |

---

## Use Cases

### Use Case 1: Admin Creates New Site Manager
1. Admin navigates to User Management
2. Clicks "Add User" button
3. Fills in: Name, Email, Phone, Temporary Password
4. Selects "Site Manager" role
5. Assigns to specific site
6. Saves user
7. System creates Firebase Auth account
8. Admin communicates temp password to user manually
9. User logs in and is prompted to change password

### Use Case 2: User Changes Password
1. User logs in with temporary password
2. System detects `mustChangePassword: true`
3. Shows password change screen (mandatory)
4. User enters current password and new password
5. System validates and updates
6. Sets `mustChangePassword: false`
7. User proceeds to app

### Use Case 3: Admin Disables User
1. Admin selects user from list
2. Toggles status to "Disabled"
3. System updates user status
4. Invalidates all active sessions
5. User cannot log in until re-enabled

---

## Security Considerations

- Passwords hashed by Firebase Auth
- Temp passwords communicated manually (not via email)
- Session tokens expire after 30 days
- Failed login attempts tracked
- Account lockout after 5 failed attempts
- Role-based access enforced at API level
