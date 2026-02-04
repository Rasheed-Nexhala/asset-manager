# CIAMS - Site Management
## Module 2: Construction Site Management

---

## Feature Description

Admin creates and manages construction sites. Sites must exist before Site Managers can be assigned. Each site has its own inventory (populated via fulfilled requests).

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-2.1 | As an **Admin**, I want to create sites before assigning managers | High |
| US-2.2 | As an **Admin**, I want to edit site details as projects evolve | Medium |
| US-2.3 | As an **Admin**, I want to mark sites inactive when projects complete | Medium |

---

## Screen Designs

### Site Management Screen

```
┌─────────────────────────────────┐
│ ← Site Management         [+]  │
├─────────────────────────────────┤
│ 🔍 Search sites...              │
├─────────────────────────────────┤
│ ACTIVE SITES (5)               │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site A - Greenfield      │ │
│ │ Manager: Amit Singh         │ │
│ │ Location: MG Road, Bangalore│ │
│ │ Items: 45                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site B - Highway Project │ │
│ │ Manager: Vikram Patel       │ │
│ │ Location: NH44, Hyderabad   │ │
│ │ Items: 32                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site C - Metro Station   │ │
│ │ Manager: Not Assigned       │ │
│ │ Location: Whitefield        │ │
│ │ Items: 0                    │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ INACTIVE SITES (2)         [>] │
└─────────────────────────────────┘
```

### Add/Edit Site Screen

```
┌─────────────────────────────────┐
│ ← Add New Site          [Save] │
├─────────────────────────────────┤
│                                 │
│ Site Name *                     │
│ ┌───────────────────────────┐   │
│ │ Site A - Greenfield       │   │
│ └───────────────────────────┘   │
│                                 │
│ Project Description             │
│ ┌───────────────────────────┐   │
│ │ Residential complex       │   │
│ │ construction - Phase 1    │   │
│ └───────────────────────────┘   │
│                                 │
│ Location/Address *              │
│ ┌───────────────────────────┐   │
│ │ 123 MG Road, Bangalore    │   │
│ └───────────────────────────┘   │
│                                 │
│ Contact Number                  │
│ ┌───────────────────────────┐   │
│ │ +91-9876543210            │   │
│ └───────────────────────────┘   │
│                                 │
│ Site Manager (Optional)         │
│ ┌───────────────────────────┐   │
│ │ Select Manager         ▼  │   │
│ └───────────────────────────┘   │
│ ℹ️ Can be assigned later        │
│                                 │
│ Status                          │
│ [🟢 Active] [🔴 Inactive]       │
│                                 │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-2.1: Site Creation
- Site name and location mandatory
- Site name must be unique
- Site can be created without manager
- New sites start with empty inventory

### AC-2.2: Site Assignment
- Site Manager can only be assigned to one site
- When reassigning, removed from previous site

### AC-2.3: Site Status
- Inactive sites don't appear in request dropdowns
- Inventory preserved when inactive
- Can be reactivated

---

## Data Model

### sites Collection

```javascript
{
  id: "site_001",
  name: "Site A - Greenfield",
  description: "Residential complex",
  address: "123 MG Road, Bangalore",
  contactNumber: "+91-9876543210",
  managerId: "user_abc123",
  managerName: "Amit Singh",      // Denormalized
  status: "active",
  itemCount: 45,                  // Denormalized
  createdAt: Timestamp
}
```

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| createSite | POST | Admin | Create site |
| updateSite | PUT | Admin | Update site |
| listSites | GET | All | List sites |

---

## Use Cases

### Use Case 1: Admin Creates New Site
1. Admin navigates to Site Management
2. Clicks "Add Site" button
3. Fills in site name, description, location, contact
4. Optionally assigns a Site Manager
5. Saves site
6. System creates site with empty inventory
7. Site appears in active sites list

### Use Case 2: Admin Assigns Manager to Site
1. Admin edits existing site
2. Selects Site Manager from dropdown
3. System checks if manager already assigned elsewhere
4. If yes, removes from previous site
5. Assigns to new site
6. Updates user record with new site assignment

### Use Case 3: Admin Marks Site Inactive
1. Admin selects completed project site
2. Changes status to "Inactive"
3. System preserves all inventory data
4. Site removed from request dropdowns
5. Site moved to inactive section
6. Can be reactivated if needed

---

## Business Rules

- Site name must be unique across all sites
- One Site Manager per site maximum
- Sites can exist without managers
- Inventory is site-specific and preserved even when inactive
- Active status determines visibility in requests
- Item count is denormalized for performance

---

## Validation Rules

### Site Name
- Required field
- Minimum 3 characters
- Maximum 100 characters
- Must be unique

### Address
- Required field
- Maximum 200 characters

### Contact Number
- Optional field
- Valid phone format if provided

### Site Manager
- Optional during creation
- Must be valid user with "site_manager" role
- Cannot be assigned to multiple sites simultaneously
