import { useEffect, useCallback, useState } from 'react';
import { useAutoClearError } from '../hooks/useAutoClearError';
import { SiteCard, SiteForm } from '../components/sites';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSites,
  createSite,
  updateSite,
  setSearchQuery,
  setSites,
  clearError,
} from '../store/slices/sitesSlice';
import {
  selectFilteredActiveSites,
  selectFilteredInactiveSites,
  selectSitesLoading,
  selectSitesError,
  selectSearchQuery,
} from '../store/selectors/sitesSelectors';
import { subscribeToSites } from '../services/firebase/siteService';
import type { Site } from '../types/sites';
import type { SiteFormData } from '../types/sites';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function SitesPage() {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);

  const activeSites = useAppSelector(selectFilteredActiveSites);
  const inactiveSites = useAppSelector(selectFilteredInactiveSites);
  const isLoading = useAppSelector(selectSitesLoading);
  const error = useAppSelector(selectSitesError);
  const searchQuery = useAppSelector(selectSearchQuery);

  useEffect(() => {
    dispatch(fetchSites());
    const unsubscribe = subscribeToSites((sites: Site[]) => {
      dispatch(setSites(sites));
    });
    return () => unsubscribe();
  }, [dispatch]);

  useAutoClearError(error, () => dispatch(clearError()));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSites()).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleAddSite = useCallback(() => {
    setEditingSite(null);
    setModalOpen('add');
  }, []);

  const handleEditSite = useCallback((site: Site) => {
    setEditingSite(site);
    setModalOpen('edit');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(null);
    setEditingSite(null);
  }, []);

  const handleSubmit = useCallback(
    async (formData: SiteFormData) => {
      setSaving(true);
      try {
        if (editingSite) {
          await dispatch(
            updateSite({ siteId: editingSite.id, formData })
          ).unwrap();
        } else {
          await dispatch(createSite(formData)).unwrap();
        }
        handleCloseModal();
      } catch {
        // Error is handled by slice
      } finally {
        setSaving(false);
      }
    },
    [dispatch, editingSite, handleCloseModal]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setSearchQuery(e.target.value));
    },
    [dispatch]
  );

  const hasNoSites =
    activeSites.length === 0 &&
    inactiveSites.length === 0 &&
    !isLoading;

  const renderSection = (title: string, sites: Site[]) => {
    if (sites.length === 0) return null;
    return (
      <section className="mb-6">
        <h2 className="mb-3 text-[17px] font-semibold text-slate-900">
          {title} ({sites.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onPress={() => handleEditSite(site)}
            />
          ))}
        </div>
      </section>
    );
  };

  if (isLoading && activeSites.length === 0 && inactiveSites.length === 0) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <h1 className="text-[22px] font-semibold text-slate-900">
            Site Management
          </h1>
          <button
            type="button"
            onClick={handleAddSite}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Add new site"
          >
            <Icon name="plus-circle" className="h-6 w-6" />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[15px] text-slate-500">Loading sites...</p>
        </div>
      </div>
    );
  }

  if (error && activeSites.length === 0 && inactiveSites.length === 0) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <h1 className="text-[22px] font-semibold text-slate-900">
            Site Management
          </h1>
          <button
            type="button"
            onClick={handleAddSite}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Add new site"
          >
            <Icon name="plus-circle" className="h-6 w-6" />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <Icon name="exclamation-circle" className="h-20 w-20 text-red-600" />
          <h2 className="mt-4 text-[22px] font-semibold text-slate-900">Error</h2>
          <p className="mb-4 text-center text-[15px] text-red-600">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-[10px] bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-blue-900"
          >
            <Icon name="arrow-path" className="h-5 w-5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <h1 className="text-[22px] font-semibold text-slate-900">
          Site Management
        </h1>
        <button
          type="button"
          onClick={handleAddSite}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Add new site"
        >
          <Icon name="plus-circle" className="h-6 w-6" />
        </button>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 md:px-6 py-3">
        <div className="relative">
          <Icon
            name="magnifying-glass"
            className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search sites..."
            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            aria-label="Search sites"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-amber-600/15 px-4 py-2">
          <Icon name="exclamation-triangle" className="h-6 w-6 text-amber-600" />
          <p className="flex-1 text-[13px] text-amber-600">{error}</p>
        </div>
      )}

      {hasNoSites ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <Icon name="building-office-2" className="h-20 w-20 text-slate-500" />
          <h2 className="mt-4 text-center text-[22px] font-semibold text-slate-900">
            No Sites Found
          </h2>
          <p className="mb-6 text-center text-[15px] text-slate-500">
            {searchQuery
              ? 'No sites match your search. Try a different search term.'
              : 'Get started by creating your first site.'}
          </p>
          <button
            type="button"
            onClick={handleAddSite}
            className="flex items-center gap-2 rounded-[10px] bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-blue-900"
          >
            <Icon name="plus-circle" className="h-5 w-5" />
            Add Site
          </button>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeSites.length === 0 && inactiveSites.length === 0 ? (
            <p className="py-12 text-center text-[15px] text-slate-500">
              {searchQuery ? 'No sites match your search' : 'No sites found'}
            </p>
          ) : (
            <>
              {renderSection('ACTIVE SITES', activeSites)}
              {renderSection('INACTIVE SITES', inactiveSites)}
            </>
          )}
        </main>
      )}

      {/* Add/Edit Site Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center"
          aria-modal
          aria-labelledby="site-form-modal-title"
        >
          <div className="w-full max-w-lg overflow-y-auto rounded-t-2xl bg-slate-50 p-4 shadow-xl md:max-h-[90vh] md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="site-form-modal-title"
                className="text-[22px] font-semibold text-slate-900"
              >
                {editingSite ? 'Edit Site' : 'Add Site'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200"
                aria-label="Close"
              >
                <Icon name="x-mark" className="h-6 w-6" />
              </button>
            </div>
            <SiteForm
              initialData={editingSite ?? undefined}
              onSubmit={handleSubmit}
              isLoading={saving}
              submitButtonLabel={editingSite ? 'Save' : 'Add Site'}
              siteId={editingSite?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
