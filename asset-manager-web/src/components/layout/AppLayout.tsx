import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

/**
 * Main layout for authenticated screens.
 * - Desktop: Sidebar (left) + content area with TopHeader
 * - Mobile: TopHeader (hamburger + profile) + content area
 */
export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pb-8 md:p-6 md:pb-10 lg:p-8 lg:pb-12">
            <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
