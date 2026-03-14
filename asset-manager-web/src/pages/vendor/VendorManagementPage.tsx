import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { VendorForm } from '../../components/purchaseOrder/VendorForm';
import { useAppSelector } from '../../store/hooks';
import { selectIsAdmin } from '../../store/selectors/authSelectors';
import { subscribeToVendors } from '../../services/firebase/vendorService';
import {
  createVendor,
  updateVendor,
  deleteVendor,
} from '../../services/firebase/vendorService';
import { useAppDispatch } from '../../store/hooks';
import { setVendors } from '../../store/slices/purchaseOrderSlice';
import { selectVendors } from '../../store/selectors/purchaseOrderSelectors';
import type { Vendor } from '../../types/vendor';
import type { CreateVendorData } from '../../types/vendor';

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export function VendorManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const vendors = useAppSelector(selectVendors);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateVendorData>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateVendorData, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToVendors((v) => dispatch(setVendors(v)));
    return unsub;
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setModalOpen('add');
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contactPerson ?? '').toLowerCase().includes(q) ||
      (v.phone ?? '').toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q)
    );
  });

  const validate = useCallback((): boolean => {
    const e: Partial<Record<keyof CreateVendorData, string>> = {};
    if (!formData.name.trim()) e.name = 'Vendor name is required';
    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData.name, formData.phone]);

  const handleOpenAdd = useCallback(() => {
    setModalOpen('add');
    setEditingVendorId(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
    });
    setErrors({});
  }, []);

  const handleOpenEdit = useCallback((vendor: Vendor) => {
    setModalOpen('edit');
    setEditingVendorId(vendor.id);
    setFormData({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email ?? '',
      address: vendor.address ?? '',
      gstin: vendor.gstin ?? '',
    });
    setErrors({});
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(null);
    setEditingVendorId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingVendorId) {
        await updateVendor(editingVendorId, {
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          gstin: formData.gstin?.trim() || undefined,
        });
        alert('Vendor updated.');
      } else {
        await createVendor({
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          gstin: formData.gstin?.trim() || undefined,
        });
        alert('Vendor added.');
      }
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }, [
    editingVendorId,
    formData,
    validate,
    handleCloseModal,
  ]);

  const handleDelete = useCallback(
    async (vendor: Vendor) => {
      if (!confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`))
        return;
      try {
        await deleteVendor(vendor.id);
        alert('Vendor deleted.');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete vendor');
      }
    },
    []
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="lock-closed" className="h-16 w-16 text-slate-400" />
        <h2 className="mt-4 text-[17px] font-semibold text-slate-900">
          Admin Only
        </h2>
        <p className="mt-2 text-[15px] text-slate-500">
          Vendor management is restricted to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/purchase-orders"
            className="flex items-center gap-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
            Back
          </Link>
        </div>
        <h1 className="text-[22px] font-semibold text-slate-900">
          Saved Vendors
        </h1>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
        >
          <Icon name="plus" className="h-5 w-5" />
          Add
        </button>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3">
          <Icon name="magnifying-glass" className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, contact, phone, or email..."
            className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
            >
              <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon name="building-office-2" className="h-20 w-20 text-slate-400" />
          <h2 className="mt-4 text-[22px] font-semibold text-slate-900">
            No Vendors
          </h2>
          <p className="mt-2 text-[15px] text-slate-500">
            {searchQuery
              ? 'No vendors match your search.'
              : 'Add vendors to reuse them in purchase orders.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-6 flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
            >
              Add Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="flex items-center justify-between rounded-[10px] border border-slate-200 bg-white p-4"
            >
              <button
                type="button"
                onClick={() => handleOpenEdit(vendor)}
                className="flex-1 text-left"
              >
                <p className="text-[15px] font-semibold text-slate-900">
                  {vendor.name}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[13px] text-slate-500">
                  <Icon name="phone" className="h-4 w-4" />
                  {vendor.phone}
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[13px] text-slate-500">
                  POs: {vendor.poCount} | Last: {formatDate(vendor.lastPoDate)}
                </p>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(vendor)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Edit vendor"
                >
                  <Icon name="pencil-square" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(vendor)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete vendor"
                >
                  <Icon name="trash" className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredVendors.length > 0 && (
        <p className="text-center text-[13px] text-slate-500">
          Total Vendors: {filteredVendors.length}
        </p>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-[22px] font-semibold text-slate-900">
                {modalOpen === 'edit' ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
              >
                <Icon name="x-mark" className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <VendorForm
                data={formData}
                onChange={setFormData}
                errors={errors}
              />
            </div>
            <div className="flex gap-3 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 rounded-[10px] border border-slate-200 py-3 text-[15px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-[10px] bg-blue-800 py-3 text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
