import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanViewRequestQueue,
} from '../../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { requestService } from '../../services/firebase/requestService';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { Request } from '../../types/request';
import type { SiteSupervisor } from '../../types/siteSupervisor';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

type AllocationSuccessSummary = {
  requestNumber: string;
  itemName: string;
  quantity: number;
  supervisorName: string;
};

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-[14px] font-bold text-white">
        {n}
      </div>
      <h2 className="text-[17px] font-semibold text-[#0F172A]">{label}</h2>
    </div>
  );
}

export function AllocateItemsToSupervisorsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);

  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const [requests, setRequests] = useState<Request[]>([]);
  const [supervisors, setSupervisors] = useState<SiteSupervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [allocationSuccess, setAllocationSuccess] = useState<AllocationSuccessSummary | null>(null);

  const clearAllocationSuccess = useCallback(() => setAllocationSuccess(null), []);

  const handleSubscriptionError = useCallback(
    (err: Error) => {
      toast.error(err.message);
    },
    [toast]
  );

  useEffect(() => {
    if (!siteId || !userId) {
      setLoading(false);
      return;
    }
    const unsubReq = requestService.subscribeToRequests(
      { userId, siteId },
      (list) => {
        setRequests(
          list.filter((r) => r.status === 'transferred' || r.status === 'partially_returned')
        );
        setLoading(false);
      },
      handleSubscriptionError
    );
    const unsubSup = siteSupervisorService.subscribeSiteSupervisors(
      siteId,
      setSupervisors,
      handleSubscriptionError
    );
    return () => {
      unsubReq();
      unsubSup();
    };
  }, [siteId, userId, handleSubscriptionError]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const allocatableLines = useMemo(() => {
    if (!selectedRequest) return [];
    return (selectedRequest.items ?? []).filter(
      (i) => i.itemType === 'consumable' || i.itemType === 'non_consumable'
    );
  }, [selectedRequest]);

  const selectedLine = useMemo(
    () => allocatableLines.find((i) => i.itemId === selectedItemId) ?? null,
    [allocatableLines, selectedItemId]
  );

  const availableForLine = useMemo(() => {
    if (!selectedLine) return 0;
    const maxAtSite = selectedLine.quantityApproved - (selectedLine.quantityReturned ?? 0);
    const sup = selectedLine.supervisorOutstandingQty ?? 0;
    return Math.max(0, maxAtSite - sup);
  }, [selectedLine]);

  const selectedSupervisor = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId) ?? null,
    [supervisors, selectedSupervisorId]
  );

  const handleSubmit = useCallback(async () => {
    if (!siteId || !userId || !selectedRequest || !selectedLine || !selectedSupervisor) {
      toast.info('Choose request, item, supervisor, and quantity.');
      return;
    }
    const q = parseInt(qty, 10);
    if (!Number.isInteger(q) || q < 1) {
      toast.info('Enter a whole number of at least 1.');
      return;
    }
    if (q > availableForLine) {
      toast.info(`Only ${availableForLine} unit(s) can still be assigned.`);
      return;
    }
    setSubmitting(true);
    try {
      await siteSupervisorService.createSupervisorAllocation(
        siteId,
        {
          requestId: selectedRequest.id,
          itemId: selectedLine.itemId,
          supervisorId: selectedSupervisor.id,
          quantity: q,
        },
        selectedSupervisor.name,
        { userId, userName: userDisplayName?.trim() || 'Site manager' }
      );
      setAllocationSuccess({
        requestNumber: selectedRequest.requestNumber,
        itemName: selectedLine.itemName,
        quantity: q,
        supervisorName: selectedSupervisor.name,
      });
      toast.success(
        `Assigned ${q} to ${selectedSupervisor.name}. You can split another line or leave when done.`
      );
      setQty('1');
      setSelectedSupervisorId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not allocate');
    } finally {
      setSubmitting(false);
    }
  }, [
    siteId,
    selectedRequest,
    selectedLine,
    selectedSupervisor,
    qty,
    availableForLine,
    toast,
    userDisplayName,
    userId,
  ]);

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
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Split stock</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
            <Icon name="map-pin" className="h-9 w-9 text-[#94A3B8]" />
          </div>
          <h2 className="mb-2 text-[22px] font-semibold text-[#0F172A]">No working site</h2>
          <p className="max-w-md text-[15px] text-[#64748B]">Select your active site from Inventory first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Split stock</h1>
          <p className="text-[13px] text-[#64748B]">Assign transferred lines to supervisors</p>
        </div>
      </header>

      {loading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-4"
          role="status"
          aria-busy="true"
          aria-label="Loading requests and supervisors"
        >
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-[13px] text-[#64748B]">Loading…</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-8">
          <div className="mb-4 flex gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <Icon name="exclamation-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#475569]" />
            <p className="text-[13px] leading-5 text-[#64748B]">
              Consumable and non-consumable lines. Physical stock stays on site; this tracks custody until Store
              Incharge returns to central store.
            </p>
          </div>

          {allocationSuccess && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Allocation saved"
              className="mb-4 rounded-[10px] border border-[#16A34A]/30 bg-[#16A34A]/15 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#0F172A]">Allocation saved</p>
                    <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
                      <span className="font-medium text-[#0F172A]">{allocationSuccess.requestNumber}</span>
                      {' · '}
                      {allocationSuccess.itemName}
                    </p>
                    <p className="mt-1 text-[15px] text-[#0F172A]">
                      <span className="font-semibold">{allocationSuccess.quantity}</span> unit
                      {allocationSuccess.quantity === 1 ? '' : 's'} →{' '}
                      <span className="font-semibold">{allocationSuccess.supervisorName}</span>
                    </p>
                    <p className="mt-2 text-[13px] text-[#64748B]">
                      Choose another supervisor or line to continue, or use Done below when finished.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAllocationSuccess}
                  className="flex h-12 min-w-[48px] shrink-0 items-center justify-center rounded-lg px-3 text-[13px] font-semibold text-[#16A34A] hover:bg-[#16A34A]/10"
                  aria-label="Dismiss success message"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <StepBadge n={1} label="Transferred request" />
          {requests.length === 0 ? (
            <div className="mb-8 flex flex-col items-center rounded-[10px] border border-[#E2E8F0] bg-white p-8">
              <Icon name="cube" className="h-12 w-12 text-[#94A3B8]" />
              <p className="mt-3 text-center text-[15px] leading-6 text-[#64748B]">
                No transferred requests yet. Complete a transfer from the store first.
              </p>
            </div>
          ) : (
            <ul className="mb-8 space-y-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(r.id);
                      setSelectedItemId(null);
                      clearAllocationSuccess();
                    }}
                    className={`flex w-full items-center justify-between rounded-[10px] border p-4 text-left ${
                      selectedRequestId === r.id
                        ? 'border-[#1E40AF] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-[#0F172A]">{r.requestNumber}</p>
                      <p className="text-[13px] capitalize text-[#64748B]">
                        {r.status.replace('_', ' ')}
                      </p>
                    </div>
                    <Icon name="chevron-right" className="h-5 w-5 text-[#94A3B8]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedRequest && (
            <>
              <StepBadge n={2} label="Line item" />
              <ul className="mb-8 space-y-2">
                {allocatableLines.length === 0 ? (
                  <li className="py-4 text-center text-[15px] text-[#64748B]">
                    No lines available to split on this request.
                  </li>
                ) : (
                  allocatableLines.map((line) => {
                    const maxAtSite = line.quantityApproved - (line.quantityReturned ?? 0);
                    const sup = line.supervisorOutstandingQty ?? 0;
                    const avail = Math.max(0, maxAtSite - sup);
                    return (
                      <li key={line.itemId}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemId(line.itemId);
                            clearAllocationSuccess();
                          }}
                          className={`w-full rounded-[10px] border p-4 text-left ${
                            selectedItemId === line.itemId
                              ? 'border-[#1E40AF] bg-[#EFF6FF]'
                              : 'border-[#E2E8F0] bg-white'
                          }`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span className="text-[15px] font-semibold text-[#0F172A]">{line.itemName}</span>
                            <span className="shrink-0 rounded-full bg-[#475569]/15 px-2 py-0.5 text-[12px] font-medium text-[#475569]">
                              {avail} left
                            </span>
                          </div>
                          <div className="flex gap-8 text-[13px] text-[#64748B]">
                            <span>
                              At site:{' '}
                              <span className="font-medium text-[#0F172A]">{maxAtSite}</span>
                            </span>
                            <span>
                              Split:{' '}
                              <span className="font-medium text-[#0F172A]">{sup}</span>
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}

          <StepBadge n={3} label="Supervisor" />
          {supervisors.length === 0 ? (
            <div className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
              <p className="mb-1 text-center text-[15px] font-medium text-[#0F172A]">Add people to your team first</p>
              <p className="mb-4 text-center text-[13px] text-[#64748B]">
                You need at least one supervisor before splitting stock.
              </p>
              <Link
                to="/inventory/site-supervisors"
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border-2 border-[#B45309] text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
              >
                <Icon name="users" className="h-5 w-5" />
                Open team list
              </Link>
            </div>
          ) : (
            <ul className="mb-8 space-y-2">
              {supervisors.map((s) => {
                const initial = (s.name.trim()[0] ?? '?').toUpperCase();
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSupervisorId(s.id)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border p-4 text-left ${
                        selectedSupervisorId === s.id
                          ? 'border-[#B45309] bg-[#B45309]/10'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B45309]/15 text-[15px] font-bold text-[#B45309]">
                        {initial}
                      </div>
                      <span className="flex-1 text-[15px] font-semibold text-[#0F172A]">{s.name}</span>
                      {selectedSupervisorId === s.id && (
                        <Icon name="check-circle" className="h-6 w-6 shrink-0 text-[#B45309]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <StepBadge n={4} label="Quantity" />
          <label className="mb-1 block text-[15px] text-[#0F172A]">Units for this supervisor</label>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mb-2 h-12 w-full rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A]"
          />
          {selectedLine && (
            <p className="mb-6 text-[13px] text-[#64748B]">
              You can assign up to{' '}
              <span className="font-semibold text-[#0F172A]">{availableForLine}</span> more on this line.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || supervisors.length === 0}
            aria-busy={submitting}
            aria-label={
              submitting ? 'Saving allocation, please wait' : 'Save allocation to supervisor'
            }
            className={`flex min-h-[50px] w-full flex-row items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-40 ${
              submitting ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
            }`}
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                <span>Please wait…</span>
              </>
            ) : (
              'Save allocation'
            )}
          </button>

          <div className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[13px] font-medium text-[#64748B]">Done splitting?</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF] px-4 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/5"
              >
                Back to inventory
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(canViewRequestQueue ? '/requests/queue' : '/requests/my-requests')
                }
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF] px-4 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/5"
              >
                Back to requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
