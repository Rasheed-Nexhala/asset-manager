import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { SupervisorItemAllocation } from '../../types/siteSupervisor';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

type Props = {
  siteId: string;
  requestId: string;
};

export function SupervisorAllocationsSection({ siteId, requestId }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const [rows, setRows] = useState<SupervisorItemAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAlloc, setModalAlloc] = useState<SupervisorItemAllocation | null>(null);
  const [returnQty, setReturnQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const maxReturnForModal = modalAlloc
    ? modalAlloc.quantityAllocated - modalAlloc.quantityReturnedToManager
    : 0;

  useEffect(() => {
    const unsub = siteSupervisorService.subscribeRequestAllocations(
      siteId,
      requestId,
      (list) => {
        setRows(list);
        setLoading(false);
      }
    );
    return unsub;
  }, [siteId, requestId]);

  const handleRecordReturn = useCallback(async () => {
    if (!modalAlloc) return;
    const q = parseInt(returnQty, 10);
    if (!Number.isInteger(q) || q < 1) {
      toast.info('Enter a whole number of at least 1.');
      return;
    }
    if (q > maxReturnForModal) {
      toast.info(`At most ${maxReturnForModal} can be returned for this line.`);
      return;
    }
    setSubmitting(true);
    try {
      await siteSupervisorService.recordReturnFromSupervisor(siteId, modalAlloc.id, q, {
        userId: userId ?? '',
        userName: userDisplayName?.trim() || 'Site manager',
      });
      setModalAlloc(null);
      setReturnQty('1');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not record return');
    } finally {
      setSubmitting(false);
    }
  }, [modalAlloc, returnQty, siteId, maxReturnForModal, toast, userId, userDisplayName]);

  if (loading) {
    return (
      <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div
          className="flex min-h-[120px] flex-col items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white p-8"
          role="status"
          aria-busy="true"
          aria-label="Loading supervisor splits"
        >
          <LoadingSpinner size="md" className="border-slate-200 border-t-[#1E40AF]" />
          <p className="mt-3 text-[13px] text-[#64748B]">Loading splits…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#B45309]/15 px-2 py-1 text-[12px] font-medium text-[#B45309]">
              Site team
            </span>
            <h3 className="text-[17px] font-semibold text-[#0F172A]">Who has materials</h3>
          </div>

          <div className="mb-4 flex gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <Icon name="exclamation-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#64748B]" />
            <p className="text-[13px] leading-5 text-[#64748B]">
              Custody only — stock stays on site until supervisors return it to you; Store Incharge returns to central store.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-2 py-8">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
                <Icon name="cube" className="h-9 w-9 text-[#94A3B8]" />
              </div>
              <p className="mb-2 text-center text-[22px] font-semibold text-[#0F172A]">No splits on this request</p>
              <p className="mb-6 max-w-md text-center text-[15px] leading-6 text-[#64748B]">
                Add people under Team list, then use Split stock to assign quantities from transferred lines.
              </p>
              <div className="flex w-full max-w-md gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/inventory/site-supervisors')}
                  className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#B45309] px-2 text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
                >
                  Team list
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/divide-to-supervisors?returnTo=requests')}
                  className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#1E40AF] px-2 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF]"
                >
                  Split stock
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const out = row.quantityAllocated - row.quantityReturnedToManager;
                const withSup = out > 0;
                return (
                  <li
                    key={row.id}
                    className="rounded-[10px] border border-[#E2E8F0] bg-white p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="flex-1 text-[15px] font-semibold text-[#0F172A]">{row.itemName}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[12px] font-medium ${
                          withSup ? 'bg-[#D97706]/15 text-[#D97706]' : 'bg-[#16A34A]/15 text-[#16A34A]'
                        }`}
                      >
                        {withSup ? `${out} out` : 'All back'}
                      </span>
                    </div>
                    <div className="mb-3 flex gap-6 border-b border-[#E2E8F0] pb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[#64748B]">Supervisor</p>
                        <p className="truncate text-[15px] font-medium text-[#0F172A]">{row.supervisorName}</p>
                      </div>
                      <div>
                        <p className="text-[13px] text-[#64748B]">Allocated / returned</p>
                        <p className="text-[15px] text-[#0F172A]">
                          {row.quantityAllocated} / {row.quantityReturnedToManager}
                        </p>
                      </div>
                    </div>
                    {withSup && (
                      <button
                        type="button"
                        onClick={() => {
                          setModalAlloc(row);
                          setReturnQty(String(Math.min(out, 1)));
                        }}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#B45309] px-2 text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
                      >
                        <Icon name="arrow-path" className="h-5 w-5" />
                        Record return from supervisor
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="mt-4 flex gap-3 border-t border-[#E2E8F0] pt-4">
              <button
                type="button"
                onClick={() => navigate('/inventory/site-supervisors')}
                className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#B45309] px-2 text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
              >
                Team list
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/divide-to-supervisors?returnTo=requests')}
                className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#1E40AF] px-2 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF]"
              >
                Split stock
              </button>
            </div>
          )}
        </div>
      </div>

      {modalAlloc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[10px] border border-[#E2E8F0] bg-white p-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#B45309]/15">
              <Icon name="arrow-path" className="h-7 w-7 text-[#B45309]" />
            </div>
            <h4 className="mb-1 text-center text-[17px] font-semibold text-[#0F172A]">Return from supervisor</h4>
            <p className="mb-1 text-center text-[13px] text-[#64748B]">
              How many units did{' '}
              <span className="font-medium text-[#0F172A]">{modalAlloc.supervisorName}</span> hand back to you?
            </p>
            <p className="mb-4 text-center text-[12px] text-[#64748B]">Max {maxReturnForModal} for this line</p>
            <input
              type="number"
              min={1}
              max={maxReturnForModal}
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
              className="mb-4 h-12 w-full rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalAlloc(null)}
                className="flex h-12 flex-1 items-center justify-center rounded-[10px] border-2 border-[#64748B] text-[15px] font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordReturn}
                disabled={submitting}
                aria-busy={submitting}
                aria-label={submitting ? 'Recording return, please wait' : 'Confirm return from supervisor'}
                className={`flex h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white ${
                  submitting ? 'bg-[#B45309]/70' : 'bg-[#B45309]'
                } disabled:opacity-60`}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                    <span>Please wait…</span>
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
