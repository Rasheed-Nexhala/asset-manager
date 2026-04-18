import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { printPurchaseOrder } from '../../utils/poPdfUtils';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import {
  approvePO,
  rejectPO,
} from '../../store/thunks/purchaseOrderThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError, setError } from '../../store/slices/purchaseOrderSlice';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdminOrSuperAdmin,
  selectIsSuperAdmin,
  selectCanReceivePurchaseOrder,
} from '../../store/selectors/authSelectors';
import { selectPurchaseOrderError } from '../../store/selectors/purchaseOrderSelectors';
import { PODocumentCard, GrrReceiptsList } from '../../components/purchaseOrder';
import type { PurchaseOrder } from '../../types/purchaseOrder';

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? `₹${n.toLocaleString('en-IN')}` : '—';
const formatGstOrOptional = (pct: number | undefined) =>
  pct != null && pct > 0 ? `${pct}%` : '—';

export function ApprovePOPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const canReceivePO = useAppSelector(selectCanReceivePurchaseOrder);
  const reduxError = useAppSelector(selectPurchaseOrderError);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (!poId) return;
    setLoadError(null);
    getPOById(poId)
      .then((p) => {
        setPo(p);
        if (!p) setLoadError('Purchase order not found');
      })
      .catch((err: unknown) => {
        setPo(null);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setLoading(false));
  }, [poId, retryTrigger]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handlePrint = useCallback(async () => {
    if (!po) return;
    try {
      await printPurchaseOrder(po);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print');
    }
  }, [po, toast]);

  const handleApprove = useCallback(async () => {
    if (!userId || !userName || !poId) return;
    setSaving(true);
    try {
      await dispatch(
        approvePO({
          poId,
          adminId: userId,
          adminName: userName,
          data: { adminComments: adminComments.trim() || undefined },
        })
      ).unwrap();
      toast.success('Purchase order approved.');
      navigate(-1);
    } catch {
      // Thunk dispatches setError
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, adminComments, dispatch, navigate, toast]);

  const handleReject = useCallback(async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      dispatch(setError('Please provide a rejection reason.'));
      return;
    }
    if (!userId || !userName || !poId) return;
    setSaving(true);
    try {
      await dispatch(
        rejectPO({
          poId,
          adminId: userId,
          adminName: userName,
          data: {
            rejectionReason: reason,
            adminComments: adminComments.trim() || undefined,
          },
        })
      ).unwrap();
      toast.success('Purchase order rejected.');
      navigate(-1);
    } catch {
      // Thunk dispatches setError
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, rejectionReason, adminComments, dispatch, navigate, toast]);

  if (loading || !po) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center py-16">
          {loading ? (
            <>
              <LoadingSpinner className="h-10 w-10 text-blue-800" />
              <p className="mt-4 text-[15px] text-slate-500">
                Loading purchase order...
              </p>
            </>
          ) : loadError ? (
            <>
              <Icon name="exclamation-circle" className="h-16 w-16 text-red-600" />
              <h2 className="mt-4 text-[17px] font-semibold text-slate-900">
                Could not load purchase order
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">{loadError}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-[10px] border border-slate-200 px-6 py-3 text-[15px] font-medium text-slate-600"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => setRetryTrigger((t) => t + 1)}
                  className="rounded-[10px] bg-blue-800 px-6 py-3 text-[15px] font-medium text-white"
                >
                  Retry
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (po.status === 'partially_received') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        {(po.grrReceipts?.length ?? 0) > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4">
            <GrrReceiptsList receipts={po.grrReceipts} />
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-4 text-[15px] text-slate-500">
            This PO has been partially received. Record another receipt when more
            goods arrive, or open Receive from the list.
          </p>
          {canReceivePO ? (
            <Link
              to={`/purchase-orders/${poId}/receive`}
              className="inline-flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
            >
              Continue receiving
            </Link>
          ) : (
            <p className="text-[14px] text-slate-500">
              Only Store Incharge or Super Admin can record receipts.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (po.status === 'ordered') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[15px] text-slate-500">
            This PO can be received from the list.
          </p>
        </div>
      </div>
    );
  }

  const canApproveReject = isAdminOrSuperAdmin;
  const isAssignedAdmin =
    isSuperAdmin ||
    (po.assignedToAdminId != null && po.assignedToAdminId.trim() !== ''
      ? po.assignedToAdminId === userId
      : isAdminOrSuperAdmin);
  const showApproveReject =
    po.status === 'pending_approval' && canApproveReject && isAssignedAdmin;
  const isOtherAdminViewing =
    po.status === 'pending_approval' &&
    canApproveReject &&
    !isAssignedAdmin;
  const isReadOnly = ['received', 'rejected'].includes(po.status);
  const hasAnyPrice = (po.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );

  const showPrint = po.status !== 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        {showPrint && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <Icon name="arrow-down-tray" className="h-5 w-5" />
            Print
          </button>
        )}
      </div>

      {reduxError && (
        <div className="flex items-center justify-between rounded-lg border border-red-600/30 bg-red-600/15 px-4 py-3">
          <p className="flex-1 text-[14px] text-red-600">{reduxError}</p>
          <button
            type="button"
            onClick={() => dispatch(clearError())}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-[13px] text-slate-500">Submitted by</p>
          <p className="text-[15px] text-slate-900">
            {po.createdByName} • {formatDate(po.createdAt)}
          </p>
          <p
            className={`mt-1 text-[13px] font-medium ${
              po.status === 'received'
                ? 'text-green-600'
                : po.status === 'rejected'
                  ? 'text-red-600'
                  : po.status === 'approved'
                    ? 'text-blue-800'
                    : 'text-amber-600'
            }`}
          >
            {po.status === 'pending_approval' && canApproveReject
              ? 'PENDING APPROVAL'
              : ''}
            {po.status === 'approved' && 'Approved'}
            {po.status === 'received' && 'Received'}
            {po.status === 'rejected' && 'Rejected'}
          </p>
        </div>

        {po.status === 'received' && (po.grrReceipts?.length ?? 0) > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4">
            <GrrReceiptsList receipts={po.grrReceipts} />
          </div>
        )}

        {isOtherAdminViewing && (po.assignedToAdminId || po.assignedToAdminName) && (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] text-amber-800">
              {po.assignedToAdminName?.trim() ? (
                <>Assigned to: <span className="font-semibold">{po.assignedToAdminName}</span></>
              ) : (
                'Assigned to another admin'
              )}
            </p>
            <p className="mt-1 text-[13px] text-amber-700">
              Only the assigned admin can approve or reject this PO.
            </p>
          </div>
        )}

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">Vendor</h2>
          <p className="text-[15px] font-semibold text-[#0F172A]">{po.vendorName}</p>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-[#64748B]">
            <Icon name="phone" className="h-4 w-4 shrink-0" />
            {po.vendorContact}
          </p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">
            Delivery details
          </h2>
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] text-slate-500">Target site</p>
              <p className="text-[15px] text-[#0F172A]">
                {po.siteName?.trim() ? po.siteName : '—'}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-slate-500">Job number</p>
              <p className="text-[15px] text-[#0F172A]">
                {po.jobNo?.trim() ? po.jobNo : '—'}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <p className="text-[13px] text-slate-500">Expected delivery</p>
            <p className="text-[15px] text-[#0F172A]">
              {formatDate(po.expectedDeliveryDate)}
            </p>
          </div>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">Items</h2>
          <div className="space-y-3">
            {po.items.map((item, i) => {
              const lineTotal =
                item.amount +
                (item.gstAmount ??
                  Math.round((item.amount * (item.gstPercentage ?? 0)) / 100));
              const qtyStr =
                item.orderedQuantity != null && item.orderedUnit
                  ? `${item.orderedQuantity} ${item.orderedUnit}`
                  : `${item.quantity} ${item.unit || 'Pcs'}`;
              return (
                <div
                  key={item.itemId + i}
                  className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <p className="text-[15px] font-semibold text-[#0F172A]">
                    {item.itemName}
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    {qtyStr} · {formatCurrencyOrOptional(item.unitPrice ?? 0)} · GST{' '}
                    {formatGstOrOptional(item.gstPercentage)} ·{' '}
                    <span className="font-medium text-[#0F172A]">
                      {formatCurrencyOrOptional(lineTotal)}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {hasAnyPrice && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[15px] text-slate-500">Subtotal</span>
              <span className="text-[15px] text-slate-900">
                {formatCurrencyOrOptional(po.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[15px] text-slate-500">Total GST</span>
              <span className="text-[15px] text-slate-900">
                {formatCurrencyOrOptional(po.gstAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-[15px] font-semibold text-slate-900">
                Total
              </span>
              <span className="text-[15px] font-semibold text-slate-900">
                {formatCurrencyOrOptional(po.totalAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <p className="text-[13px] text-[#64748B]">Justification</p>
          <p className="mt-1 text-[15px] text-[#0F172A]">
            {po.justification || '—'}
          </p>
        </div>

        {po.status === 'received' && (po.documents?.length ?? 0) > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">
              Documents
            </h2>
            <div className="space-y-3">
              {po.documents!.map((doc, i) => (
                <PODocumentCard
                  key={`${doc.fileUrl}-${i}`}
                  fileName={doc.fileName}
                  fileUrl={doc.fileUrl}
                  type={doc.type}
                />
              ))}
            </div>
          </div>
        )}

        {isReadOnly && po.status === 'rejected' && (po.rejectionReason || po.adminComments) && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">
              Rejection
            </h2>
            {po.rejectionReason && (
              <div className="mb-2">
                <p className="text-[13px] text-[#64748B]">Reason</p>
                <p className="text-[15px] text-red-600">{po.rejectionReason}</p>
              </div>
            )}
            {po.adminComments && (
              <div>
                <p className="text-[13px] text-slate-500">Admin comments</p>
                <p className="text-[15px] text-slate-900">{po.adminComments}</p>
              </div>
            )}
          </div>
        )}

        {showApproveReject && (
          <>
            <div>
              <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
                Comments (Optional)
              </label>
              <textarea
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="e.g. Negotiate for discount"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
            </div>

            {showRejectForm && (
              <div>
                <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Required for rejection"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
                {!rejectionReason.trim() && (
                  <p className="mt-1 text-[14px] text-red-600">
                    Reason is required
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!showRejectForm ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 rounded-[10px] border-[1.5px] border-red-600 py-3 text-[15px] font-semibold text-red-600"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center rounded-[10px] py-3 text-[15px] font-semibold text-white bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
                    ) : (
                      'Approve'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 rounded-[10px] border-[1.5px] border-slate-500 py-3 text-[15px] font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={saving || !rejectionReason.trim()}
                    className="flex flex-1 items-center justify-center rounded-[10px] bg-red-600 py-3 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
                    ) : (
                      'Confirm Reject'
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
