import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { SiteSupervisor, SiteSupervisorInput } from '../../types/siteSupervisor';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useConfirm } from '../../hooks';
import { useToast } from '../../contexts/ToastContext';

export function SiteSupervisorsPage() {
  const navigate = useNavigate();
  const { confirm, confirmationModal } = useConfirm();
  const toast = useToast();
  const userId = useAppSelector(selectUserId);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const [rows, setRows] = useState<SiteSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteSupervisor | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = useCallback((item: SiteSupervisor | null) => {
    if (item) {
      setEditing(item);
      setName(item.name);
      setPhone(item.phone ?? '');
    } else {
      setEditing(null);
      setName('');
      setPhone('');
    }
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    const unsub = siteSupervisorService.subscribeSiteSupervisors(siteId, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [siteId]);

  const handleSave = useCallback(async () => {
    if (!siteId || !userId) return;
    const input: SiteSupervisorInput = { name: name.trim(), phone: phone.trim() || undefined };
    if (!input.name) {
      toast.info('Enter a supervisor name.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await siteSupervisorService.updateSiteSupervisor(siteId, editing.id, input);
      } else {
        await siteSupervisorService.addSiteSupervisor(siteId, input, userId);
      }
      setModalOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }, [siteId, userId, name, phone, editing, toast]);

  const handleDelete = useCallback(
    async (s: SiteSupervisor) => {
      if (!siteId) return;
      const ok = await confirm({
        title: 'Remove supervisor?',
        message: `Remove ${s.name}? They must have no outstanding materials.`,
        confirmLabel: 'Remove',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await siteSupervisorService.deleteSiteSupervisor(siteId, s.id);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Could not remove');
      }
    },
    [siteId, confirm, toast]
  );

  if (!siteId) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Site team</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
            <Icon name="map-pin" className="h-9 w-9 text-[#94A3B8]" />
          </div>
          <h2 className="mb-2 text-[22px] font-semibold text-[#0F172A]">No working site</h2>
          <p className="max-w-md text-[15px] leading-6 text-[#64748B]">
            Open Inventory and select which site you are acting for, then return here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-[#E2E8F0] pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Go back"
            >
              <Icon name="arrow-left" className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-[#0F172A]">Site team</h1>
              <p className="mt-0.5 text-[13px] leading-5 text-[#64748B]">
                Field contacts for splitting stock — not separate logins
              </p>
            </div>
          </div>
          {!loading && rows.length > 0 && (
            <button
              type="button"
              onClick={() => openModal(null)}
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#1E40AF] px-5 text-[15px] font-semibold text-white hover:bg-[#1E3A8A] sm:mt-0.5 sm:w-auto sm:min-w-[160px]"
            >
              <Icon name="plus" className="h-5 w-5" />
              Add supervisor
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-4"
          role="status"
          aria-busy="true"
          aria-label="Loading site team"
        >
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-[13px] text-[#64748B]">Loading team…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#B45309]/15">
            <Icon name="users" className="h-9 w-9 text-[#B45309]" />
          </div>
          <h2 className="mb-2 text-center text-[22px] font-semibold text-[#0F172A]">No supervisors yet</h2>
          <p className="mb-8 max-w-md text-center text-[15px] leading-6 text-[#64748B]">
            Add foremen or leads so you can assign transferred materials by person.
          </p>
          <button
            type="button"
            onClick={() => openModal(null)}
            className="inline-flex min-h-[50px] w-full max-w-sm items-center justify-center gap-2 rounded-[10px] bg-[#1E40AF] px-8 text-[15px] font-semibold text-white hover:bg-[#1E3A8A]"
          >
            <Icon name="plus" className="h-5 w-5" />
            Add supervisor
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <p className="mb-4 text-[13px] leading-5 text-[#64748B]">
            <span className="mr-2 inline-block rounded-full bg-[#B45309]/15 px-2 py-0.5 text-[12px] font-medium text-[#B45309]">
              Site Manager
            </span>
            Use <strong className="font-semibold text-[#0F172A]">Split stock</strong> from My Inventory to allocate quantities after transfer.
          </p>
          <ul className="space-y-3 pb-6">
            {rows.map((item) => {
              const initial = (item.name.trim()[0] ?? '?').toUpperCase();
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white p-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B45309]/15 text-[17px] font-bold text-[#B45309]">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#0F172A]">{item.name}</p>
                    <p className="truncate text-[13px] text-[#64748B]">
                      {item.phone ?? 'No phone'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#1E40AF] hover:bg-[#EFF6FF]"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Icon name="pencil-square" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#DC2626] hover:bg-red-50"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Icon name="trash" className="h-5 w-5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl border border-[#E2E8F0] bg-white p-4 pb-8 sm:rounded-[10px]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#CBD5E1] sm:hidden" />
            <h2 className="mb-4 text-[17px] font-semibold text-[#0F172A]">
              {editing ? 'Edit supervisor' : 'New supervisor'}
            </h2>
            <label className="mb-1 block text-[15px] text-[#0F172A]">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 h-12 w-full rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A]"
            />
            <label className="mb-1 block text-[15px] text-[#0F172A]">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mb-6 h-12 w-full rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-[50px] flex-1 items-center justify-center rounded-[10px] border-2 border-[#64748B] text-[15px] font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
                aria-label={saving ? 'Saving supervisor, please wait' : 'Save supervisor'}
                className={`flex h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white ${
                  saving ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                } disabled:opacity-60`}
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                    <span>Please wait…</span>
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmationModal}
    </div>
  );
}
