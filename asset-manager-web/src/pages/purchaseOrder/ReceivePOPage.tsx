import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { printPurchaseOrder } from '../../utils/poPdfUtils';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { getItemById } from '../../services/firebase/inventoryService';
import { uploadPOInvoice } from '../../services/firebase/storageService';
import { receivePO } from '../../store/thunks/purchaseOrderThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { Item } from '../../types/inventory';

export function ReceivePOPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [receivedNotes, setReceivedNotes] = useState('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});
  const [inventoryItemsMap, setInventoryItemsMap] = useState<Record<string, Item>>({});

  const fetchInventoryDetails = useCallback(async (itemIds: string[]) => {
    const missingIds = itemIds.filter((id) => !inventoryItemsMap[id]);
    if (missingIds.length === 0) return;
    try {
      const results = await Promise.all(missingIds.map((id) => getItemById(id)));
      const updates: Record<string, Item> = {};
      results.forEach((item, index) => {
        if (item) updates[missingIds[index]] = item;
      });
      setInventoryItemsMap((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error fetching inventory details:', err);
    }
  }, [inventoryItemsMap]);

  useEffect(() => {
    if (po) {
      fetchInventoryDetails(po.items.map((i) => i.itemId));
    }
  }, [po, fetchInventoryDetails]);

  useEffect(() => {
    if (!poId) return;
    setLoadError(null);
    getPOById(poId)
      .then((p) => {
        if (p) {
          setPo(p);
          const initial: Record<string, string> = {};
          p.items.forEach((item) => {
            const received = item.receivedQuantity ?? 0;
            const remaining = Math.max(0, item.quantity - received);
            initial[item.itemId] = remaining > 0 ? String(remaining) : '0';
          });
          setReceivedQtys(initial);
          setLoadError(null);
        } else {
          setLoadError('Purchase order not found');
        }
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
      alert(err instanceof Error ? err.message : 'Failed to print');
    }
  }, [po]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !poId) return;

      setUploadingInvoice(true);
      try {
        const fileUri = URL.createObjectURL(file);
        const { url, fileName } = await uploadPOInvoice(
          fileUri,
          poId,
          file.name
        );
        URL.revokeObjectURL(fileUri);
        setInvoiceFile({ fileName, fileUrl: url });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploadingInvoice(false);
        e.target.value = '';
      }
    },
    [poId]
  );

  const handleConfirm = useCallback(async () => {
    if (!po || !userId || !userName || !poId) return;

    for (const item of po.items) {
      const raw = receivedQtys[item.itemId] ?? '';
      const qty = parseInt(raw, 10);
      if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
        alert(
          `Enter a valid quantity (0 or more) for "${item.itemName}".`
        );
        return;
      }
    }

    const atLeastOne = po.items.some((item) => {
      const qty = parseInt(receivedQtys[item.itemId] ?? '0', 10);
      return qty > 0;
    });
    if (!atLeastOne) {
      alert(
        'At least one item must have a received quantity greater than zero.'
      );
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        receivePO({
          poId,
          receiveData: {
            receivedQuantities: po.items.map((item) => ({
              itemId: item.itemId,
              receivedQuantity: parseInt(
                receivedQtys[item.itemId] ?? '0',
                10
              ),
            })),
            documents: invoiceFile
              ? [
                  {
                    type: 'invoice' as const,
                    fileName: invoiceFile.fileName,
                    fileUrl: invoiceFile.fileUrl,
                  },
                ]
              : [],
            receivedDate: receivedDate.toISOString(),
            receivedNotes: receivedNotes.trim() || undefined,
          },
          userId,
          userName,
        })
      ).unwrap();
      alert('Purchase order received. Inventory updated.');
      navigate(-1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to receive PO');
    } finally {
      setSaving(false);
    }
  }, [
    po,
    poId,
    userId,
    userName,
    receivedQtys,
    invoiceFile,
    receivedDate,
    receivedNotes,
    dispatch,
    navigate,
  ]);

  const inventoryUpdates = po
    ? po.items.map((item) => {
        const invItem = inventoryItemsMap[item.itemId];
        const current = invItem?.centralStoreQuantity ?? 0;
        const receivedQty =
          parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
        return {
          itemName: item.itemName,
          orderedQty: item.quantity,
          remainingQty: Math.max(
            0,
            item.quantity - (item.receivedQuantity ?? 0)
          ),
          currentQty: current,
          receivedQty,
          newQty: current + receivedQty,
        };
      })
    : [];

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

  if (
    po.status !== 'approved' &&
    po.status !== 'ordered' &&
    po.status !== 'partially_received'
  ) {
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
            Only approved, ordered, or partially received POs can be received.
            Current status: {po.status}.
          </p>
        </div>
      </div>
    );
  }

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

      <div>
        <p className="text-[13px] text-slate-500">Vendor</p>
        <p className="text-[15px] font-medium text-slate-900">
          {po.vendorName}
        </p>
      </div>

      <div>
        <h2 className="mb-1 text-[17px] font-semibold text-slate-900">
          ITEMS TO RECEIVE
        </h2>
        <p className="mb-3 text-[13px] text-slate-500">
          Enter the actual quantity received. Partial or excess delivery is
          allowed.
        </p>
        <div className="space-y-3">
          {po.items.map((item) => {
            const raw = receivedQtys[item.itemId] ?? '';
            const receivedQty = parseInt(raw, 10);
            const orderedQty = item.quantity;
            const alreadyReceived = item.receivedQuantity ?? 0;
            const remainingQty = Math.max(
              0,
              orderedQty - alreadyReceived
            );
            const orderedLabel =
              item.orderedQuantity && item.orderedUnit
                ? `${item.orderedQuantity} ${item.orderedUnit}`
                : `${orderedQty} ${item.unit || 'Pcs'}`;

            const isPartial =
              !isNaN(receivedQty) &&
              receivedQty > 0 &&
              receivedQty < remainingQty;
            const isExcess =
              !isNaN(receivedQty) && receivedQty > remainingQty;
            const isExact =
              !isNaN(receivedQty) &&
              receivedQty > 0 &&
              receivedQty === remainingQty;

            return (
              <div
                key={item.itemId}
                className="rounded-[10px] border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[15px] font-medium text-slate-900 line-clamp-2">
                      {item.itemName}
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      Ordered: {orderedLabel}
                      {alreadyReceived > 0
                        ? ` • Received: ${alreadyReceived} ${item.unit || 'Pcs'}`
                        : ''}
                    </p>
                  </div>
                  {isExact && (
                    <span className="shrink-0 rounded-full bg-green-600/15 px-2 py-1 text-[12px] font-medium text-green-600">
                      Exact
                    </span>
                  )}
                  {isPartial && (
                    <span className="shrink-0 rounded-full bg-amber-600/15 px-2 py-1 text-[12px] font-medium text-amber-600">
                      Partial
                    </span>
                  )}
                  {isExcess && (
                    <span className="shrink-0 rounded-full bg-purple-600/15 px-2 py-1 text-[12px] font-medium text-purple-600">
                      Excess
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex-1 text-[14px] text-slate-500">
                    Received qty ({item.unit || 'Pcs'})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current =
                          parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
                        if (current > 0) {
                          setReceivedQtys((prev) => ({
                            ...prev,
                            [item.itemId]: String(current - 1),
                          }));
                        }
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                    >
                      <Icon name="minus" className="h-4 w-4 text-slate-500" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={raw}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        setReceivedQtys((prev) => ({
                          ...prev,
                          [item.itemId]: cleaned,
                        }));
                      }}
                      className="h-12 w-16 rounded-lg border border-slate-200 bg-white text-center text-[15px] font-semibold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current =
                          parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
                        setReceivedQtys((prev) => ({
                          ...prev,
                          [item.itemId]: String(current + 1),
                        }));
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                    >
                      <Icon name="plus" className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
          Invoice/Bill (Optional)
        </label>
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
          disabled={uploadingInvoice}
          className={`flex w-full items-center gap-3 rounded-lg border p-4 transition-colors ${
            invoiceFile
              ? 'border-slate-200 bg-white'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-800/15">
            <Icon name="document-plus" className="h-6 w-6 text-blue-800" />
          </div>
          <div className="flex-1 text-left">
            {invoiceFile ? (
              <>
                <p className="text-[15px] font-medium text-slate-900">
                  {invoiceFile.fileName}
                </p>
                <p className="flex items-center gap-1 text-[13px] text-green-600">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Uploaded
                </p>
              </>
            ) : (
              <p className="text-[15px] text-slate-400">
                {uploadingInvoice ? 'Uploading...' : '+ Upload Invoice'}
              </p>
            )}
          </div>
          {invoiceFile && (
            <button
              type="button"
              onClick={() => setInvoiceFile(null)}
              className="p-2 text-red-600 hover:bg-red-50"
            >
              <Icon name="x-mark" className="h-6 w-6" />
            </button>
          )}
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
          Received Date
        </label>
        <input
          type="date"
          value={receivedDate.toISOString().split('T')[0]}
          onChange={(e) =>
            setReceivedDate(e.target.value ? new Date(e.target.value) : new Date())
          }
          className="h-12 w-full rounded-lg border border-slate-200 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
          Notes (Optional)
        </label>
        <textarea
          value={receivedNotes}
          onChange={(e) => setReceivedNotes(e.target.value)}
          placeholder="Additional notes"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
        />
      </div>

      {inventoryUpdates.filter((u) => u.receivedQty > 0).length > 0 && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-600/15 p-4">
          <p className="mb-3 text-[15px] font-semibold text-amber-600">
            Inventory will be updated:
          </p>
          {inventoryUpdates
            .filter((u) => u.receivedQty > 0)
            .map((u, i) => (
              <div key={i} className="mb-2">
                <p className="text-[14px] text-slate-900">
                  • {u.itemName} — {u.currentQty} → {u.newQty} (+{u.receivedQty}{' '}
                  of {u.remainingQty ?? u.orderedQty} expected)
                </p>
              </div>
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={saving}
        className={`h-[50px] w-full rounded-[10px] text-[15px] font-semibold text-white transition-colors ${
          saving ? 'cursor-not-allowed bg-slate-400' : 'bg-blue-800 hover:bg-blue-900'
        }`}
      >
        {saving ? (
          <LoadingSpinner className="mx-auto h-5 w-5" />
        ) : (
          'CONFIRM & UPDATE INVENTORY'
        )}
      </button>
    </div>
  );
}
