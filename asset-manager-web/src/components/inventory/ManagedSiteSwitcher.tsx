import { useState, useCallback } from 'react';
import type { Site } from '../../types/sites';
import { Icon } from '../shared/Icon';

export interface ManagedSiteSwitcherProps {
  managedSites: Site[];
  activeSiteId: string | null;
  onSiteChange: (siteId: string) => void;
}

/**
 * Site Manager context: shows current site; switcher only when managing 2+ active sites (CIAMS).
 */
export function ManagedSiteSwitcher({
  managedSites,
  activeSiteId,
  onSiteChange,
}: ManagedSiteSwitcherProps) {
  const [open, setOpen] = useState(false);

  const active =
    managedSites.find((s) => s.id === activeSiteId) ?? managedSites[0] ?? null;
  /** When Redux is still catching up, treat first site as selected so the list matches the header. */
  const effectiveActiveId = activeSiteId ?? managedSites[0]?.id ?? null;

  const handlePick = useCallback(
    (siteId: string) => {
      onSiteChange(siteId);
      setOpen(false);
    },
    [onSiteChange]
  );

  if (managedSites.length === 0 || !active) {
    return null;
  }

  if (managedSites.length === 1) {
    return (
      <div className="mb-3 flex flex-row items-center">
        <span className="max-w-full rounded-full bg-amber-700/15 px-3 py-1.5 text-[12px] font-medium text-amber-800">
          {active.name?.trim() || 'Site'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[48px] w-full items-center justify-between rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Working site ${active.name?.trim() || 'Site'}. Open to switch site.`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[13px] text-slate-500">Working site</p>
          <p className="truncate text-[15px] font-semibold text-slate-900">
            {active.name?.trim() || 'Site'}
          </p>
        </div>
        <span className="rounded-full bg-amber-700/15 px-2 py-1 text-[12px] font-medium text-amber-800">
          Switch
        </span>
        <Icon name="chevron-down" className="ml-1 h-5 w-5 shrink-0 text-slate-500" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40"
            aria-label="Close site menu"
            onClick={() => setOpen(false)}
          />
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg"
            role="listbox"
            aria-label="Select working site"
          >
            {managedSites.map((site) => {
              const selected = effectiveActiveId != null && site.id === effectiveActiveId;
              return (
                <li key={site.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handlePick(site.id)}
                    className={`flex min-h-[48px] w-full items-start gap-2 px-4 py-3 text-left ${
                      selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-[15px] font-medium ${
                          selected ? 'text-blue-800' : 'text-slate-900'
                        }`}
                      >
                        {site.name?.trim() || 'Site'}
                      </span>
                      {site.address ? (
                        <span className="mt-0.5 block truncate text-[13px] text-slate-500">
                          {site.address}
                        </span>
                      ) : null}
                    </div>
                    {selected ? (
                      <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
