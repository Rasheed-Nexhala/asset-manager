# Complete Component Specifications (Web)

Detailed specifications for all CIAMS Web components with exact HTML structures and Tailwind classes.

---

## Layout Components

### Sidebar Navigation (Desktop)

**Implementation Pattern:**
```tsx
<aside className="hidden md:flex flex-col w-64 bg-slate-900 h-screen fixed inset-y-0 text-white">
  {/* Logo Area */}
  <div className="h-16 flex items-center px-6 border-b border-slate-800">
    <span className="text-xl font-bold tracking-tight">CIAMS</span>
  </div>

  {/* Navigation Links */}
  <nav className="flex-1 overflow-y-auto py-4">
    <ul className="space-y-1 px-3">
      <li>
        {/* Active Link */}
        <a href="/dashboard" className="flex items-center px-3 py-2.5 bg-blue-600 rounded-lg text-sm font-medium">
          <Icon name="chart-bar" className="mr-3 w-5 h-5" /> Dashboard
        </a>
      </li>
      <li>
        {/* Inactive Link */}
        <a href="/inventory" className="flex items-center px-3 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
          <Icon name="archive-box" className="mr-3 w-5 h-5" /> Inventory
        </a>
      </li>
    </ul>
  </nav>

  {/* User Profile Area */}
  <div className="p-4 border-t border-slate-800">
    <div className="flex items-center">
      <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold">JD</div>
      <div className="ml-3">
        <p className="text-sm font-medium">John Doe</p>
        <p className="text-xs text-slate-400">Store Incharge</p>
      </div>
    </div>
  </div>
</aside>
```

### Top Navbar / Mobile Header

**Dimensions:**
- Height: 64px (h-16)
- Z-Index: 30

```tsx
<header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
  <div className="flex items-center">
    {/* Mobile Menu Toggle (hidden on md) */}
    <button className="md:hidden w-10 h-10 flex items-center justify-center mr-2 text-slate-500 hover:bg-slate-50 rounded-md">
      <Icon name="bars-3" className="w-6 h-6" />
    </button>
    
    <h1 className="text-[22px] font-semibold text-slate-900">
      Inventory
    </h1>
  </div>
  
  <div className="flex items-center gap-2">
    <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
      <Icon name="magnifying-glass" className="w-5 h-5" />
    </button>
    <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative">
      <Icon name="bell" className="w-5 h-5" />
      {/* Notification badge dot usually goes here */}
    </button>
  </div>
</header>
```

---

## Content Components

### Desktop Data Table (List Replacement)

On desktop, lists of items become dense data tables for rapid scanning.

```tsx
<div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden hidden md:block shadow-sm">
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200 text-[13px] font-medium text-slate-500">
        <th className="py-3 px-4 font-medium">Item Name</th>
        <th className="py-3 px-4 font-medium">Category</th>
        <th className="py-3 px-4 font-medium text-right">Quantity</th>
        <th className="py-3 px-4 font-medium">Location</th>
        <th className="py-3 px-4 font-medium">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-200 text-[15px] text-slate-900">
      <tr className="hover:bg-slate-50 transition-colors group cursor-pointer">
        <td className="py-3 px-4 font-semibold">Portland Cement OPC 53 Grade</td>
        <td className="py-3 px-4 text-slate-500">Cement</td>
        <td className="py-3 px-4 text-right">450 bags</td>
        <td className="py-3 px-4 text-slate-500">Sector 12</td>
        <td className="py-3 px-4">
          <span className="px-2 py-1 rounded-full bg-green-600/15 text-[12px] font-medium text-green-600 inline-block">
            In Stock
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Mobile Card (Data Table Fallback)

On mobile, standard cards ensure minimum 48px touch targets.

```tsx
<div className="md:hidden flex flex-col gap-3">
  <article className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
    {/* Top Row */}
    <div className="flex justify-between items-start gap-3 mb-3">
      <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">
        Portland Cement OPC 53 Grade
      </h3>
      <span className="px-2 py-1 rounded-full bg-green-600/15 text-[12px] font-medium text-green-600 whitespace-nowrap">
        In Stock
      </span>
    </div>

    {/* Middle Grid */}
    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
      <div>
        <p className="text-[13px] text-slate-500 mb-0.5">Quantity</p>
        <p className="text-[15px] text-slate-900">450 bags</p>
      </div>
      <div>
        <p className="text-[13px] text-slate-500 mb-0.5">Location</p>
        <p className="text-[15px] text-slate-900">Sector 12</p>
      </div>
    </div>

    {/* Bottom Row */}
    <footer className="border-t border-slate-200 pt-3 flex justify-between items-center text-[13px] text-slate-500">
      <span>Updated 2h ago</span>
      <Icon name="chevron-right" className="w-4 h-4" />
    </footer>
  </article>
</div>
```

### KPI Dashboard Card

```tsx
<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
  <Icon name="archive-box" className="w-8 h-8 text-blue-800 mb-3" />
  <h2 className="text-[32px] font-bold text-slate-900 leading-none mb-1">342</h2>
  <p className="text-[13px] text-slate-500 font-medium tracking-wide">ITEMS IN STOCK</p>
  
  {/* Trend */}
  <div className="flex items-center gap-1 mt-3">
    <span className="text-[13px] font-medium text-green-600 flex items-center">
      <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      12%
    </span>
    <span className="text-[12px] text-slate-400">vs last month</span>
  </div>
</div>
```

---

## Form Components

### Input Field Structure

```tsx
<div className="flex flex-col gap-1.5 w-full">
  <label htmlFor="email" className="text-[15px] font-medium text-slate-900 flex justify-between">
    Email Address <span className="text-red-600" aria-hidden="true">*</span>
  </label>
  
  <div className="relative">
    <input
      id="email"
      type="email"
      required
      placeholder="Enter email address"
      className="border border-slate-200 rounded-lg h-12 px-4 bg-white focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 w-full transition-shadow text-[15px] text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
    />
  </div>
  
  {/* Helper/Error Text */}
  <p className="text-[13px] text-slate-500 mt-0.5" id="email-description">
    We'll never share your email.
  </p>
</div>
```

### File Upload (Replacing expo-image-picker)

```tsx
<div className="flex flex-col gap-1.5 w-full">
  <label className="text-[15px] font-medium text-slate-900">Upload Image</label>
  
  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group relative">
    <input 
      type="file" 
      accept="image/*" 
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
    <Icon name="camera" className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
    <p className="text-[15px] font-medium text-blue-800">Click to upload or drag and drop</p>
    <p className="text-[13px] text-slate-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
  </div>
</div>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 px-4 w-full h-full">
  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5">
    <Icon name="document-text" className="w-10 h-10 text-slate-400" />
  </div>
  
  <h3 className="text-[22px] font-semibold text-slate-900 text-center mb-2">
    No Purchase Orders Yet
  </h3>
  
  <p className="text-[15px] text-slate-500 text-center max-w-sm mb-8">
    Create your first PO to start tracking procurement and manage supplier orders efficiently.
  </p>
  
  <button className="bg-blue-800 hover:bg-blue-900 transition-colors rounded-[10px] h-[50px] inline-flex items-center justify-center text-[15px] font-semibold text-white px-8">
    Create Purchase Order
  </button>
</div>
```
