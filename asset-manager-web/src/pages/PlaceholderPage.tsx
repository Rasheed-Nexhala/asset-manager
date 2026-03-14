interface PlaceholderPageProps {
  title: string;
}

/**
 * Placeholder for routes not yet implemented.
 * Used during Phase 4 routing setup.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Coming soon</p>
    </div>
  );
}
