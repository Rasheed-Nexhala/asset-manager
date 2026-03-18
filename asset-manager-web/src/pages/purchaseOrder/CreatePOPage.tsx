import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/auth/FormField';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ItemSelectorModal } from '../../components/shared/ItemSelectorModal';
import { VendorSelector, POItemCard } from '../../components/purchaseOrder';
import { printPurchaseOrder, buildDraftPOForPrint } from '../../utils/poPdfUtils';
import {
  createPO,
  updatePO,
  deletePO,
} from '../../store/thunks/purchaseOrderThunks';
import {
  subscribeToVendors,
  createVendor,
  deleteVendor,
} from '../../services/firebase/vendorService';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { getItemById } from '../../services/firebase/inventoryService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setVendors,
  clearError,
  setError,
} from '../../store/slices/purchaseOrderSlice';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdmin,
  selectIsStoreIncharge,
} from '../../store/selectors/authSelectors';
import {
  selectVendors,
  selectPOById,
  selectPurchaseOrderError,
} from '../../store/selectors/purchaseOrderSelectors';
import type {
  CreatePurchaseOrderData,
  PurchaseOrder,
  PurchaseOrderItem,
} from '../../types/purchaseOrder';
import type { Vendor } from '../../types/vendor';
import type { Item } from '../../types/inventory';

const DEFAULT_GST_PERCENTAGE = 18;

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? formatCurrency(n) : '—';

export function CreatePOPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const poId = searchParams.get('poId');

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const vendors = useAppSelector(selectVendors);
  const poFromStore = useAppSelector((state) =>
    poId ? selectPOById(poId)(state) : null
  );
  const reduxError = useAppSelector(selectPurchaseOrderError);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [location, setLocation] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [justification, setJustification] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [loadPOError, setLoadPOError] = useState<string | null>(null);
  const [loadPORetryTrigger, setLoadPORetryTrigger] = useState(0);
  const [editingPOStatus, setEditingPOStatus] = useState<'draft' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [inventoryItemsMap, setInventoryItemsMap] = useState<Record<string, Item>>({});

  useEffect(() => {
    const unsub = subscribeToVendors((v) => dispatch(setVendors(v)));
    return unsub;
  }, [dispatch]);

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
    const ids = items.map((i) => i.itemId);
    if (ids.length > 0) fetchInventoryDetails(ids);
  }, [items, fetchInventoryDetails]);

  useEffect(() => {
    if (selectedVendorId) {
      const v = vendors.find((x) => x.id === selectedVendorId);
      if (v) {
        setVendorName(v.name);
        setVendorContact(v.phone);
        setVendorEmail(v.email ?? '');
        setVendorAddress(v.address ?? '');
        setVendorGstin(v.gstin ?? '');
      }
    }
  }, [selectedVendorId, vendors]);

  useEffect(() => {
    if (!poId) {
      setEditingPOStatus(null);
      return;
    }

    const loadPO = (po: PurchaseOrder) => {
      if (po.status !== 'draft') {
        navigate(`/purchase-orders/${po.id}/approve`);
        return;
      }
      setSelectedVendorId(po.vendorId);
      setVendorName(po.vendorName);
      setVendorContact(po.vendorContact);
      setVendorEmail(po.vendorEmail ?? '');
      setVendorAddress(po.vendorAddress ?? '');
      setVendorGstin(po.vendorGstin ?? '');
      setLocation(po.location ?? '');
      setJobNo(po.jobNo ?? '');
      setPoNumber(po.poNumber ?? '');
      setItems(po.items);
      setJustification(po.justification);
      setExpectedDeliveryDate(
        po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null
      );
      setEditingPOStatus('draft');
    };

    if (poFromStore) {
      loadPO(poFromStore);
      return;
    }

    setIsLoadingPO(true);
    setLoadPOError(null);
    getPOById(poId)
      .then((po) => {
        if (po) {
          loadPO(po);
          setLoadPOError(null);
        } else {
          setLoadPOError('Purchase order not found');
        }
      })
      .catch((err: unknown) => {
        setLoadPOError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setIsLoadingPO(false));
  }, [poId, poFromStore?.id, loadPORetryTrigger, navigate]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!poNumber.trim()) e.poNumber = 'P.O. No. is required';
    if (!vendorName.trim()) e.vendorName = 'Vendor name is required';
    if (!vendorContact.trim()) e.vendorContact = 'Contact number is required';
    if (items.length === 0) e.items = 'At least one item is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [poNumber, vendorName, vendorContact, items.length]);

  const handleItemSelect = useCallback((selected: Item[]) => {
    const newItems: PurchaseOrderItem[] = selected.map((item) => {
      const unitPrice = item.standardUnitPrice ?? 0;
      const gstPercentage =
        item.standardGstPercentage ?? (unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : undefined);
      const amount = unitPrice > 0 ? 1 * unitPrice : 0;
      return {
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        unit: item.unit,
        isExistingItem: true,
        quantity: 1,
        unitPrice,
        amount,
        gstPercentage,
        receivedQuantity: null,
        orderedUnit: item.unit,
        orderedQuantity: 1,
        remarks: undefined,
      };
    });
    setItems((prev) => {
      const byId = new Map(prev.map((p) => [p.itemId, p]));
      newItems.forEach((n) => {
        if (!byId.has(n.itemId)) byId.set(n.itemId, n);
      });
      return Array.from(byId.values());
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      return next;
    });
    setItemSelectorOpen(false);
  }, []);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const gstAmount = items.reduce((sum, i) => {
    const gstPct =
      i.gstPercentage ?? (i.unitPrice && i.unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : 0);
    return sum + Math.round((i.amount * gstPct) / 100);
  }, 0);
  const totalAmount = subtotal + gstAmount;
  const hasAnyPrice = items.some((i) => (i.unitPrice ?? 0) > 0);

  const handleQuantityChange = useCallback(
    (itemId: string, quantity: number, orderedUnit?: string, orderedQuantity?: number) => {
      setItems((prev) =>
        prev.map((p) => {
          if (p.itemId !== itemId) return p;
          const q = Math.max(0, quantity);
          const orderQty = orderedQuantity ?? q;
          return { ...p, quantity: q, orderedUnit, orderedQuantity, amount: orderQty * p.unitPrice };
        })
      );
    },
    []
  );

  const handleUnitPriceChange = useCallback((itemId: string, price: number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.itemId !== itemId) return p;
        const orderQty = p.orderedQuantity ?? p.quantity;
        return { ...p, unitPrice: price, amount: orderQty * price };
      })
    );
  }, []);

  const handleGstPercentageChange = useCallback((itemId: string, percentage: number) => {
    setItems((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, gstPercentage: percentage } : p))
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((p) => p.itemId !== itemId));
  }, []);

  const handleRemarksChange = useCallback((itemId: string, remarks: string) => {
    setItems((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, remarks } : p))
    );
  }, []);

  const handleSubmit = useCallback(
    async (asDraft: boolean) => {
      if (!asDraft && !validate()) return;
      if (!userId || !userName) {
        alert('User information is missing');
        return;
      }

      let vendorId = selectedVendorId ?? '';
      const vName = vendorName.trim();
      const vContact = vendorContact.trim();
      if (!vName || !vContact) {
        alert('Vendor name and contact are required');
        return;
      }

      if (items.length === 0) {
        alert('At least one item is required');
        return;
      }

      const invalidItem = items.find((i) => {
        if (i.quantity <= 0) return true;
        if (
          i.orderedUnit &&
          (i.orderedUnit === 'Kg' || i.orderedUnit === 'Ton') &&
          !Number.isInteger(i.quantity)
        ) {
          return true;
        }
        return false;
      });
      if (invalidItem) {
        alert(
          `Please review ${invalidItem.itemName}. Quantity must be positive and steel conversions must resolve to whole pieces.`
        );
        return;
      }

      setIsSubmitting(true);
      setIsDraft(asDraft);

      let vendorCreatedThisAttempt = false;

      try {
        if (!vendorId) {
          vendorId = await createVendor({
            name: vName,
            contactPerson: vName,
            phone: vContact,
            email: vendorEmail.trim() || undefined,
            address: vendorAddress.trim() || undefined,
            gstin: vendorGstin.trim() || undefined,
          });
          vendorCreatedThisAttempt = true;
        }

        const data: CreatePurchaseOrderData = {
          poNumber: poNumber.trim(),
          vendorId,
          vendorName: vName,
          vendorContact: vContact,
          vendorEmail: vendorEmail.trim() || undefined,
          vendorAddress: vendorAddress.trim() || undefined,
          vendorGstin: vendorGstin.trim() || undefined,
          location: location.trim() || undefined,
          jobNo: jobNo.trim() || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            itemSku: i.itemSku,
            unit: i.unit,
            isExistingItem: i.isExistingItem,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            gstPercentage: i.gstPercentage,
            orderedUnit: i.orderedUnit,
            orderedQuantity: i.orderedQuantity,
            remarks: i.remarks?.trim() || undefined,
          })),
          justification: justification.trim(),
          expectedDeliveryDate: expectedDeliveryDate
            ? expectedDeliveryDate.toISOString()
            : null,
        };

        let savedPoId: string;
        let savedPO: PurchaseOrder | null = null;

        if (poId && editingPOStatus === 'draft') {
          const updated = await dispatch(
            updatePO({ poId, data, isDraft: asDraft })
          ).unwrap();
          savedPoId = poId;
          savedPO = updated ?? null;
        } else {
          savedPoId = await dispatch(
            createPO({ data, userId, userName, isDraft: asDraft })
          ).unwrap();
        }

        const poForPrint = savedPO ?? (await getPOById(savedPoId));
        const successMsg = asDraft
          ? 'Draft saved.'
          : poForPrint?.status === 'approved'
            ? 'Purchase order approved.'
            : 'Purchase order submitted for approval.';

        if (confirm(`${successMsg} Print?`)) {
          try {
            const toPrint = poForPrint ?? (await getPOById(savedPoId));
            if (toPrint) await printPurchaseOrder(toPrint);
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to print');
          }
        }
        navigate('/purchase-orders');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save';
        if (vendorCreatedThisAttempt) {
          try {
            await deleteVendor(vendorId);
            setSelectedVendorId(null);
          } catch {
            console.error('Failed to clean up orphaned vendor');
          }
          dispatch(
            setError(
              `Failed to create purchase order. Vendor creation rolled back. ${msg}`
            )
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate,
      userId,
      userName,
      selectedVendorId,
      vendorName,
      vendorContact,
      vendorEmail,
      vendorAddress,
      vendorGstin,
      location,
      jobNo,
      poNumber,
      items,
      justification,
      expectedDeliveryDate,
      poId,
      editingPOStatus,
      dispatch,
      navigate,
    ]
  );

  const handleDeleteDraft = useCallback(() => {
    if (!poId || editingPOStatus !== 'draft' || !userId) return;
    if (!confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;

    setIsDeleting(true);
    dispatch(deletePO({ poId, userId }))
      .unwrap()
      .then(() => {
        alert('Draft deleted');
        navigate('/purchase-orders');
      })
      .catch((err: unknown) => {
        alert(err instanceof Error ? err.message : 'Failed to delete draft');
      })
      .finally(() => setIsDeleting(false));
  }, [poId, editingPOStatus, userId, dispatch, navigate]);

  const handlePrintDraft = useCallback(async () => {
    if (!poNumber.trim()) {
      alert('P.O. No. is required to print.');
      return;
    }
    if (!vendorName.trim() || !vendorContact.trim()) {
      alert('Vendor name and contact are required to print.');
      return;
    }
    if (items.length === 0) {
      alert('Add at least one item to print.');
      return;
    }
    try {
      const draftPO = buildDraftPOForPrint(
        {
          vendorName: vendorName.trim(),
          vendorContact: vendorContact.trim(),
          vendorEmail: vendorEmail.trim() || undefined,
          vendorAddress: vendorAddress.trim() || undefined,
          vendorGstin: vendorGstin.trim() || undefined,
          location: location.trim() || undefined,
          jobNo: jobNo.trim() || undefined,
          items,
          justification: justification.trim(),
          expectedDeliveryDate,
          userName: userName ?? '—',
        },
        poNumber.trim()
      );
      await printPurchaseOrder(draftPO);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to print');
    }
  }, [
    vendorName,
    vendorContact,
    vendorEmail,
    vendorAddress,
    vendorGstin,
    location,
    jobNo,
    items,
    justification,
    expectedDeliveryDate,
    userName,
    poNumber,
  ]);

  const currentHash = JSON.stringify({
    selectedVendorId,
    vendorName: vendorName.trim(),
    vendorContact: vendorContact.trim(),
    poNumber: poNumber.trim(),
    items: items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      gstPercentage: i.gstPercentage,
      orderedUnit: i.orderedUnit,
      orderedQuantity: i.orderedQuantity,
      remarks: i.remarks ?? '',
    })),
    justification: justification.trim(),
    expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString() : null,
  });

  const initialStateHash =
    poId && editingPOStatus === 'draft' && poFromStore
      ? JSON.stringify({
          selectedVendorId: poFromStore.vendorId,
          vendorName: (poFromStore.vendorName ?? '').trim(),
          vendorContact: (poFromStore.vendorContact ?? '').trim(),
          poNumber: (poFromStore.poNumber ?? '').trim(),
          items: (poFromStore.items ?? []).map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            gstPercentage: i.gstPercentage,
            orderedUnit: i.orderedUnit,
            orderedQuantity: i.orderedQuantity,
            remarks: i.remarks ?? '',
          })),
          justification: (poFromStore.justification ?? '').trim(),
          expectedDeliveryDate: poFromStore.expectedDeliveryDate
            ? new Date(poFromStore.expectedDeliveryDate).toISOString()
            : null,
        })
      : null;
  const isDirty =
    poId && editingPOStatus === 'draft'
      ? initialStateHash !== null && currentHash !== initialStateHash
      : items.length > 0 || vendorName.trim() || vendorContact.trim() || poNumber.trim();

  if (poId && (isLoadingPO || loadPOError)) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center py-16">
          {isLoadingPO ? (
            <>
              <LoadingSpinner className="h-10 w-10 text-blue-800" />
              <p className="mt-4 text-[15px] text-slate-500">
                Loading purchase order...
              </p>
            </>
          ) : (
            <>
              <Icon name="exclamation-circle" className="h-16 w-16 text-red-600" />
              <h2 className="mt-4 text-[17px] font-semibold text-slate-900">
                Could not load purchase order
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">{loadPOError}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-[10px] border border-slate-200 px-6 py-3 text-[15px] font-medium text-slate-600"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => setLoadPORetryTrigger((t) => t + 1)}
                  className="rounded-[10px] bg-blue-800 px-6 py-3 text-[15px] font-medium text-white"
                >
                  Retry
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"
      >
        <Icon name="arrow-left" className="h-5 w-5" />
        Back
      </button>

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

      <div className="space-y-6">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <FormField
            label="P.O. No."
            value={poNumber}
            onChange={setPoNumber}
            placeholder="e.g. PO-2025-0001"
            error={errors.poNumber}
            required
          />
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <h2 className="mb-4 text-[17px] font-semibold text-slate-900">VENDOR</h2>
          <VendorSelector
            vendors={vendors}
            selectedVendorId={selectedVendorId}
            onSelect={(v: Vendor | null) => setSelectedVendorId(v?.id ?? null)}
            placeholder="Select Saved Vendor"
          />
          <div className="mt-4 flex gap-3">
            <Link
              to="/vendors?add=1"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-3 text-[15px] font-medium text-blue-800 hover:bg-slate-100 min-h-[48px]"
            >
              <Icon name="plus" className="h-5 w-5" />
              Add New
            </Link>
            <Link
              to="/vendors"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-3 text-[15px] font-medium text-blue-800 hover:bg-slate-100 min-h-[48px]"
            >
              <Icon name="document-text" className="h-5 w-5" />
              Manage
            </Link>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="mb-3 text-[13px] text-slate-500">
              Or enter vendor details manually
            </p>
            <div className="space-y-4">
              <FormField
                label="Vendor Name"
                value={vendorName}
                onChange={setVendorName}
                placeholder="e.g. ABC Building Supplies"
                error={errors.vendorName}
                required
              />
              <FormField
                label="Contact Number"
                value={vendorContact}
                onChange={setVendorContact}
                placeholder="+91-"
                error={errors.vendorContact}
              />
              <FormField
                label="GSTIN"
                value={vendorGstin}
                onChange={setVendorGstin}
                placeholder="e.g. 29AJWPD4844N1ZC"
                error={errors.vendorGstin}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-slate-900">ITEMS</h2>
            <button
              type="button"
              onClick={() => setItemSelectorOpen(true)}
              className="flex items-center gap-2 text-[15px] font-semibold text-blue-800"
            >
              <Icon name="plus" className="h-5 w-5" />
              Add
            </button>
          </div>
          {errors.items && (
            <p className="mb-2 text-[13px] text-red-600">{errors.items}</p>
          )}
          {items.map((item) => (
            <POItemCard
              key={item.itemId}
              item={item}
              inventoryItem={inventoryItemsMap[item.itemId]}
              editable
              onRemove={() => handleRemoveItem(item.itemId)}
              onQuantityChange={(q, u, o) =>
                handleQuantityChange(item.itemId, q, u, o)
              }
              onUnitPriceChange={(p) => handleUnitPriceChange(item.itemId, p)}
              onGstPercentageChange={(p) =>
                handleGstPercentageChange(item.itemId, p)
              }
              onRemarksChange={(r) => handleRemarksChange(item.itemId, r)}
            />
          ))}
        </div>

        {hasAnyPrice && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
            <h2 className="mb-3 text-[17px] font-semibold text-slate-900">
              SUMMARY
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[15px] text-slate-500">Subtotal</span>
                <span className="text-[15px] text-slate-900">
                  {formatCurrencyOrOptional(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[15px] text-slate-500">Total GST</span>
                <span className="text-[15px] text-slate-900">
                  {formatCurrencyOrOptional(gstAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-[15px] font-semibold text-slate-900">
                  Total
                </span>
                <span className="text-[15px] font-semibold text-slate-900">
                  {formatCurrencyOrOptional(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
            Justification
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g. Cement stock below minimum"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
            Expected Delivery
          </label>
          <input
            type="date"
            value={
              expectedDeliveryDate
                ? expectedDeliveryDate.toISOString().split('T')[0]
                : ''
            }
            onChange={(e) =>
              setExpectedDeliveryDate(
                e.target.value ? new Date(e.target.value) : null
              )
            }
            className="h-12 w-full rounded-lg border border-slate-200 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Location/Work"
            value={location}
            onChange={setLocation}
            placeholder="e.g. FO"
            error={errors.location}
          />
          <FormField
            label="Job No."
            value={jobNo}
            onChange={setJobNo}
            placeholder="e.g. 2513"
            error={errors.jobNo}
          />
        </div>

        <button
          type="button"
          onClick={handlePrintDraft}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-slate-500 py-3 text-[15px] font-semibold text-slate-600"
        >
          <Icon name="document-text" className="h-5 w-5" />
          Print Preview
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || isDeleting || !isDirty}
            className={`flex flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-blue-800 py-3 text-[15px] font-semibold text-blue-800 transition-colors hover:bg-blue-50 disabled:opacity-50 ${
              !isDirty ? 'opacity-50' : ''
            }`}
          >
            {isSubmitting && isDraft ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Save Draft'
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || isDeleting}
            className="flex flex-1 items-center justify-center rounded-[10px] bg-blue-800 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
          >
            {isSubmitting && !isDraft ? (
              <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
            ) : isAdmin ? (
              'Submit PO'
            ) : (
              'Submit for Approval'
            )}
          </button>
        </div>

        {poId && editingPOStatus === 'draft' && (
          <button
            type="button"
            onClick={handleDeleteDraft}
            disabled={isDeleting}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-200 pt-3 text-[15px] font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            {isDeleting ? (
              <LoadingSpinner className="h-5 w-5" />
            ) : (
              <Icon name="trash" className="h-5 w-5" />
            )}
            Delete Draft
          </button>
        )}
      </div>

      <ItemSelectorModal
        isOpen={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        onSelect={handleItemSelect}
        excludeItemIds={items.map((i) => i.itemId)}
        restrictToLowStock={isStoreIncharge}
      />
    </div>
  );
}
