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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
