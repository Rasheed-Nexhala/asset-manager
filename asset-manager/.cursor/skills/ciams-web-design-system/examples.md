# Code Examples - Complex Patterns (Web)

Complete, copy-paste-ready React DOM + Tailwind implementations of complex CIAMS web UI patterns.

---

## Example 1: App Layout Shell (Desktop Sidebar + Mobile Navbar)

```tsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: <Icon name="chart-bar" className="w-5 h-5" /> },
    { name: 'Inventory', href: '/inventory', icon: <Icon name="archive-box" className="w-5 h-5" /> },
    { name: 'Orders', href: '/orders', icon: <Icon name="document-text" className="w-5 h-5" /> },
    { name: 'Requests', href: '/requests', icon: <Icon name="clipboard-document-list" className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 flex-shrink-0 text-white">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold tracking-tight">CIAMS</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.href}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                  `}
                >
                  <span className="mr-3 flex items-center justify-center">{item.icon}</span>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User Card */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold shadow-inner">JD</div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-slate-400 truncate">Store Incharge</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 flex-shrink-0 z-30 md:hidden">
          <div className="flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-500 hover:bg-slate-50 rounded-md"
            >
              ☰
            </button>
            <span className="text-xl font-bold tracking-tight text-slate-900 ml-2">CIAMS</span>
          </div>
        </header>

        {/* Desktop Top Bar (Optional, for notifications/search) */}
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-6 flex-shrink-0 z-30">
          <div className="flex-1">
            {/* Search can go here */}
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-900 transition-colors relative">
              <Icon name="bell" className="w-6 h-6" />
              {/* Notification dot */}
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Main Content Router Outlet */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden flex flex-col shadow-xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <span className="text-xl font-bold tracking-tight text-slate-900">Menu</span>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-md"
          >
            ✕
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center px-3 py-3 rounded-lg text-[15px] font-medium
                    ${isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}
                  `}
                >
                  <span className="mr-3 flex items-center justify-center">{item.icon}</span>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
```

---

## Example 2: Inventory Dashboard Page (Responsive Grid)

```tsx
import React from 'react';

const DashboardPage = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-[13px] md:text-sm text-slate-500 mt-1">Overview of your inventory across all sites.</p>
        </div>
        <button className="bg-blue-800 hover:bg-blue-900 transition-colors text-white px-5 py-2.5 rounded-lg text-[15px] font-semibold flex items-center justify-center w-full md:w-auto shadow-sm">
          <Icon name="plus" className="w-5 h-5 mr-2" /> <span>Create PO</span>
        </button>
      </div>

      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard value="₹12.5L" label="Total Value" icon={<Icon name="currency-rupee" className="w-8 h-8 text-blue-800" />} trend="+5.2%" trendUp={true} />
        <KPICard value="8" label="Pending POs" icon={<Icon name="clock" className="w-8 h-8 text-amber-600" />} highlighted={true} />
        <KPICard value="24" label="Active Sites" icon={<Icon name="building-office-2" className="w-8 h-8 text-blue-800" />} />
        <KPICard value="3" label="Critical Low" icon={<Icon name="exclamation-triangle" className="w-8 h-8 text-red-600" />} trend="-1.2%" trendUp={false} isError={true} />
      </section>

      {/* Quick Actions & Recent Activity (Grid Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions (Takes 1 column out of 3 on desktop) */}
        <section className="lg:col-span-1 space-y-4">
          <h2 className="text-[17px] font-semibold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction title="Manage Users" icon={<Icon name="users" className="w-8 h-8 text-slate-700" />} />
            <QuickAction title="View All POs" icon={<Icon name="document-text" className="w-8 h-8 text-slate-700" />} />
            <QuickAction title="Activity Log" icon={<Icon name="chart-bar" className="w-8 h-8 text-slate-700" />} />
            <QuickAction title="Reports" icon={<Icon name="arrow-trending-up" className="w-8 h-8 text-slate-700" />} />
          </div>
        </section>

        {/* Needs Attention (Takes 2 columns out of 3 on desktop) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[17px] font-semibold text-slate-900">Needs Attention</h2>
            <button className="text-[15px] font-medium text-blue-600 hover:text-blue-800">View All</button>
          </div>
          
          <div className="space-y-3">
            <AttentionAlert 
              type="warning" 
              title="PO #1042 awaiting approval" 
              description="₹45,000 • Submitted by Store Incharge" 
              time="2h ago" 
            />
            <AttentionAlert 
              type="error" 
              title="Critical: 3 items out of stock" 
              description="Portland Cement, Steel Bars, Wire Mesh" 
              time="5h ago" 
            />
          </div>
        </section>
      </div>
    </div>
  );
};

// Subcomponents

const KPICard = ({ value, label, icon, trend, trendUp, highlighted, isError }) => (
  <div className={`
    bg-white rounded-xl p-5 shadow-sm border 
    ${highlighted ? 'border-amber-500 shadow-amber-500/10' : isError ? 'border-red-500 shadow-red-500/10' : 'border-slate-200'}
    flex flex-col relative overflow-hidden
  `}>
    <div className="mb-3">{icon}</div>
    <h3 className="text-[32px] font-bold text-slate-900 leading-tight mb-1">{value}</h3>
    <p className="text-[13px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
    
    {trend && (
      <div className="flex items-center gap-1 mt-3">
        <span className={`text-[13px] font-medium flex items-center ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
        <span className="text-[12px] text-slate-400">vs last month</span>
      </div>
    )}
  </div>
);

const QuickAction = ({ title, icon }) => (
  <button className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm focus:ring-2 focus:ring-blue-800 focus:outline-none transition-all aspect-square sm:aspect-auto sm:h-32 group">
    <div className="group-hover:text-blue-600 transition-colors">{icon}</div>
    <span className="text-[14px] font-semibold text-slate-900 text-center leading-tight">{title}</span>
  </button>
);

const AttentionAlert = ({ type, title, description, time }) => {
  const isError = type === 'error';
  return (
    <div className={`
      flex items-start md:items-center p-4 rounded-xl border gap-4 flex-col md:flex-row
      ${isError ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'}
    `}>
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isError ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
        <Icon name={isError ? "exclamation-triangle" : "clock"} className="w-5 h-5" />
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
        <p className="text-[13px] text-slate-600 mt-0.5">{description}</p>
      </div>
      
      {/* Actions */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-3 md:gap-1">
        <span className="text-[13px] text-slate-500 shrink-0">{time}</span>
        <button className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[13px] font-semibold py-1.5 px-4 rounded-lg transition-colors whitespace-nowrap">
          Review
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
```
