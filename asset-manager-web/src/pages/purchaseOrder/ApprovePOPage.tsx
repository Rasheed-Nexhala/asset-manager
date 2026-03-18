import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { printPurchaseOrder } from '../../utils/poPdfUtils';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { uploadPOSignedDocument } from '../../services/firebase/storageService';
import {
  approvePO,
  rejectPO,
  markPOOrdered,
  recordPODownloadForSigning,
  uploadSignedPO,
  removeSignedPO,
} from '../../store/thunks/purchaseOrderThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError, setError } from '../../store/slices/purchaseOrderSlice';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdmin,
  selectIsStoreIncharge,
} from '../../store/selectors/authSelectors';
import { selectPurchaseOrderError } from '../../store/selectors/purchaseOrderSelectors';
import { PODocumentCard } from '../../components/purchaseOrder';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const reduxError = useAppSelector(selectPurchaseOrderError);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [removingSigned, setRemovingSigned] = useState(false);

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
      if (po.status === 'pending_approval' && isAdmin && userId && userName) {
        await dispatch(
          recordPODownloadForSigning({
            poId: poId!,
            adminId: userId,
            adminName: userName,
          })
        ).unwrap();
        const refreshed = await getPOById(poId!);
        if (refreshed) setPo(refreshed);
        await printPurchaseOrder(refreshed ?? po, userName);
      } else {
        await printPurchaseOrder(po);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print');
    }
  }, [po, poId, isAdmin, userId, userName, dispatch, toast]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !poId) return;

      setUploadingSigned(true);
      try {
        const fileUri = URL.createObjectURL(file);
        const { url } = await uploadPOSignedDocument(
          fileUri,
          poId,
          file.name
        );
        URL.revokeObjectURL(fileUri);
        await dispatch(uploadSignedPO({ poId, signedPdfUrl: url })).unwrap();
        const refreshed = await getPOById(poId);
        if (refreshed) setPo(refreshed);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload signed document'
        );
      } finally {
        setUploadingSigned(false);
        e.target.value = '';
      }
    },
    [poId, dispatch, toast]
  );

  const handleRemoveSignedPO = useCallback(async () => {
    if (!po?.signedPdfUrl?.trim() || !poId) return;
    setRemovingSigned(true);
    try {
      await dispatch(
        removeSignedPO({ poId, signedPdfUrl: po.signedPdfUrl })
      ).unwrap();
      const refreshed = await getPOById(poId);
      if (refreshed) setPo(refreshed);
      toast.success('Signed document removed. You can upload a different one.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove signed document'
      );
    } finally {
      setRemovingSigned(false);
    }
  }, [po, poId, dispatch, toast]);

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

  const handleMarkOrdered = useCallback(async () => {
    if (!poId) return;
    setSaving(true);
    try {
      await dispatch(markPOOrdered({ poId })).unwrap();
      toast.success('Purchase order marked as ordered.');
      navigate(-1);
    } catch {
      // Thunk dispatches setError
    } finally {
      setSaving(false);
    }
  }, [poId, dispatch, navigate, toast]);

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

  if (po.status === 'ordered' || po.status === 'partially_received') {
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
            This PO has been{' '}
            {po.status === 'partially_received'
              ? 'partially received'
              : 'marked as ordered'}
            . You can receive it from the list.
          </p>
        </div>
      </div>
    );
  }

  const canMarkOrdered =
    po.status === 'approved' && (isAdmin || isStoreIncharge);
  const isReadOnly = ['received', 'rejected'].includes(po.status);
  const showApproveReject = po.status === 'pending_approval' && isAdmin;
  const hasAnyPrice = (po.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );

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
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <Icon name="arrow-down-tray" className="h-5 w-5" />
          Print
        </button>
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
            {po.status === 'pending_approval' && isAdmin ? 'PENDING APPROVAL' : ''}
            {po.status === 'approved' && 'Approved'}
            {po.status === 'received' && 'Received'}
            {po.status === 'rejected' && 'Rejected'}
          </p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[17px] font-semibold text-slate-900">VENDOR</h2>
          <p className="text-[15px] text-slate-900">{po.vendorName}</p>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-slate-500">
            <Icon name="phone" className="h-4 w-4" />
            {po.vendorContact}
          </p>
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[17px] font-semibold text-slate-900">ITEMS</h2>
          <div className="space-y-3">
            {po.items.map((item, i) => (
              <div
                key={item.itemId + i}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-slate-500">Item</p>
                  <p className="text-[15px] font-medium text-slate-900 truncate">
                    {item.itemName}
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-[13px] text-slate-500">Qty</p>
                  <p className="text-[15px] text-slate-900">
                    {item.orderedQuantity != null && item.orderedUnit
                      ? `${item.orderedQuantity} ${item.orderedUnit}`
                      : `${item.quantity} ${item.unit || 'Pcs'}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] text-slate-500">Unit Price</p>
                  <p className="text-[15px] text-slate-900">
                    {formatCurrencyOrOptional(item.unitPrice ?? 0)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] text-slate-500">GST %</p>
                  <p className="text-[15px] text-slate-900">
                    {formatGstOrOptional(item.gstPercentage)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] text-slate-500">Total</p>
                  <p className="text-[15px] font-semibold text-slate-900">
                    {formatCurrencyOrOptional(
                      item.amount +
                        (item.gstAmount ??
                          Math.round((item.amount * (item.gstPercentage ?? 0)) / 100))
                    )}
                  </p>
                </div>
              </div>
            ))}
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
          <p className="text-[13px] text-slate-500">Justification</p>
          <p className="mt-1 text-[15px] text-slate-900">
            {po.justification || '—'}
          </p>
        </div>

        {po.status === 'received' && (po.documents?.length ?? 0) > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4">
            <h2 className="mb-1 text-[17px] font-semibold text-slate-900">
              ATTACHED DOCUMENTS
            </h2>
            <p className="mb-3 text-[13px] text-slate-500">
              Invoice and bills attached at receipt
            </p>
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
            <h2 className="mb-3 text-[17px] font-semibold text-slate-900">
              REJECTION DETAILS
            </h2>
            {po.rejectionReason && (
              <div className="mb-2">
                <p className="text-[13px] text-slate-500">Reason</p>
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
            <div className="rounded-[10px] border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-[17px] font-semibold text-slate-900">
                UPLOAD SIGNED PO
              </h2>
              <p className="mb-3 text-[13px] text-slate-500">
                Download the PO above, sign it manually, then upload the signed
                PDF or image here before approving.
              </p>
              {po.signedPdfUrl ? (
                <div className="flex flex-wrap items-center gap-2 py-2">
                  <span className="rounded-full bg-green-600/15 px-2 py-1 text-[12px] font-medium text-green-600">
                    Signed document uploaded
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveSignedPO}
                    disabled={removingSigned}
                    className="rounded-lg border border-red-600 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removingSigned ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingSigned}
                    className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-blue-800 text-[15px] font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {uploadingSigned ? (
                      <LoadingSpinner className="h-5 w-5" />
                    ) : (
                      <>
                        <Icon name="cloud-arrow-up" className="h-6 w-6" />
                        Upload Signed PO (PDF or Image)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

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
                    disabled={saving || !po.signedPdfUrl?.trim()}
                    className={`flex flex-1 items-center justify-center rounded-[10px] py-3 text-[15px] font-semibold text-white ${
                      po.signedPdfUrl?.trim()
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'cursor-not-allowed bg-slate-400'
                    }`}
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
                    ) : po.signedPdfUrl?.trim() ? (
                      'Approve'
                    ) : (
                      'Upload signed PO first'
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

        {canMarkOrdered && (
          <button
            type="button"
            onClick={handleMarkOrdered}
            disabled={saving}
            className="flex w-full items-center justify-center rounded-[10px] bg-blue-800 py-3 text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? (
              <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
            ) : (
              'Mark as Ordered'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
