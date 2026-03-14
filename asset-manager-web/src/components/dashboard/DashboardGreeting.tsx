export interface DashboardGreetingProps {
  displayName: string;
  role: string;
  siteName?: string;
}

/**
 * Dashboard greeting component showing personalized welcome message.
 * Always shows the user's display name (not role).
 * For Site Manager: shows site name as subtitle.
 * For other roles: shows formatted date as subtitle.
 */
export function DashboardGreeting({
  displayName,
  role,
  siteName,
}: DashboardGreetingProps) {
  const greetingName = displayName || 'there';
  const subtitle =
    role === 'Site Manager' && siteName
      ? siteName
      : new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  return (
    <section>
      <h1 className="text-[22px] font-semibold text-slate-900" role="heading">
        Hello, {greetingName}
      </h1>
      <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
    </section>
  );
}
