import { useState, useEffect, useCallback } from 'react';
import { FormField } from '../auth/FormField';
import { SiteManagerSelector } from './SiteManagerSelector';
import { ManagerReassignmentConfirmationModal } from './ManagerReassignmentConfirmationModal';
import { getAllUsers } from '../../services/firebase/userRoleService';
import type { SiteFormData, SiteStatus } from '../../types/sites';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export interface SiteFormProps {
  initialData?: Partial<SiteFormData>;
  onSubmit: (data: SiteFormData) => void;
  isLoading?: boolean;
  submitButtonLabel?: string;
  siteId?: string;
  /** When editing, only SuperAdmin should pass true so the site name field is editable. */
  canEditSiteName?: boolean;
}

interface FormErrors {
  name?: string;
  address?: string;
  contactNumber?: string;
}

const validatePhoneNumber = (phone: string): boolean => {
  if (!phone.trim()) return true;
  const phoneRegex =
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.trim());
};

export function SiteForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonLabel = 'Save',
  siteId,
  canEditSiteName = false,
}: SiteFormProps) {
  const nameFieldLocked = Boolean(siteId) && !canEditSiteName;
  const [formData, setFormData] = useState<SiteFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    contactNumber: initialData?.contactNumber || '',
    managerId: initialData?.managerId || null,
    status: initialData?.status || 'active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showInactiveConfirmation, setShowInactiveConfirmation] =
    useState(false);
  const [pendingStatus, setPendingStatus] = useState<SiteStatus | null>(null);
  const [managerName, setManagerName] = useState<string>('the assigned manager');
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        address: initialData.address || '',
        contactNumber: initialData.contactNumber || '',
        managerId: initialData.managerId || null,
        status: initialData.status || 'active',
      });
    }
  }, [
    initialData?.name,
    initialData?.description,
    initialData?.address,
    initialData?.contactNumber,
    initialData?.managerId,
    initialData?.status,
  ]);

  const handleFieldChange = useCallback(
    (field: keyof SiteFormData, value: string | null) => {
      const normalizedValue =
        field === 'managerId' ? value : (value ?? '');
      setFormData((prev) => ({ ...prev, [field]: normalizedValue }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleStatusChange = useCallback(
    async (status: SiteStatus) => {
      if (status === 'inactive' && formData.managerId) {
        try {
          setStatusChangeLoading(true);
          const users = await getAllUsers();
          const manager = users.find((user) => user.id === formData.managerId);
          setManagerName(
            manager?.displayName || manager?.email || 'the assigned manager'
          );
          setPendingStatus(status);
          setShowInactiveConfirmation(true);
        } catch (err) {
          console.error('Error fetching manager name:', err);
          setManagerName('the assigned manager');
          setPendingStatus(status);
          setShowInactiveConfirmation(true);
        } finally {
          setStatusChangeLoading(false);
        }
      } else {
        setFormData((prev) => ({ ...prev, status }));
      }
    },
    [formData.managerId]
  );

  const handleConfirmInactive = useCallback(() => {
    if (pendingStatus === 'inactive') {
      setFormData((prev) => ({
        ...prev,
        status: 'inactive',
        managerId: null,
      }));
    }
    setShowInactiveConfirmation(false);
    setPendingStatus(null);
  }, [pendingStatus]);

  const handleCancelInactive = useCallback(() => {
    setFormData((prev) => ({ ...prev, status: 'active' }));
    setShowInactiveConfirmation(false);
    setPendingStatus(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Site name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Site name must be less than 100 characters';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length > 200) {
      newErrors.address = 'Address must be less than 200 characters';
    }
    if (
      formData.contactNumber &&
      !validatePhoneNumber(formData.contactNumber)
    ) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (validateForm()) onSubmit(formData);
  }, [formData, validateForm, onSubmit]);

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-slate-200 bg-white p-4">
        <div className="space-y-4">
          <FormField
            label={nameFieldLocked ? 'Site Name (cannot be changed)' : 'Site Name'}
            required
            value={formData.name}
            onChange={(text) => handleFieldChange('name', text)}
            placeholder="e.g. Site A"
            error={errors.name}
            disabled={nameFieldLocked}
          />
          <FormField
            label="Project Description (Optional)"
            value={formData.description ?? ''}
            onChange={(text) => handleFieldChange('description', text)}
            placeholder="Brief project description"
            multiline
            rows={3}
          />
          <FormField
            label="Location/Address"
            required
            value={formData.address}
            onChange={(text) => handleFieldChange('address', text)}
            placeholder="Street, city"
            error={errors.address}
          />
          <FormField
            label="Contact Number (Optional)"
            value={formData.contactNumber ?? ''}
            onChange={(text) => handleFieldChange('contactNumber', text)}
            placeholder="Phone number"
            type="text"
            error={errors.contactNumber}
          />
          <SiteManagerSelector
            value={formData.managerId}
            onChange={(managerId) => handleFieldChange('managerId', managerId)}
            excludeSiteId={siteId}
          />
          <div className="space-y-1.5">
            <span className="block text-[15px] font-medium text-slate-900">
              Status
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleStatusChange('active')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] h-[50px] ${
                  formData.status === 'active'
                    ? 'border-green-600 bg-green-600/15'
                    : 'border-slate-200 bg-white'
                }`}
                aria-pressed={formData.status === 'active'}
              >
                <Icon
                  name="check-circle"
                  className={`h-6 w-6 ${
                    formData.status === 'active' ? 'text-green-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-[15px] font-semibold ${
                    formData.status === 'active'
                      ? 'text-green-600'
                      : 'text-slate-500'
                  }`}
                >
                  Active
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('inactive')}
                disabled={statusChangeLoading}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] h-[50px] ${
                  formData.status === 'inactive'
                    ? 'border-red-600 bg-red-600/15'
                    : 'border-slate-200 bg-white'
                } ${statusChangeLoading ? 'opacity-70' : ''}`}
                aria-pressed={formData.status === 'inactive'}
              >
                {statusChangeLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Icon
                      name="x-circle"
                      className={`h-6 w-6 ${
                        formData.status === 'inactive'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    />
                    <span
                      className={`text-[15px] font-semibold ${
                        formData.status === 'inactive'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    >
                      Inactive
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] ${
          isLoading ? 'bg-blue-800/70' : 'bg-blue-800'
        } font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-70`}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Icon name="check-circle" className="h-5 w-5" />
            {submitButtonLabel}
          </>
        )}
      </button>

      <ManagerReassignmentConfirmationModal
        visible={showInactiveConfirmation}
        managerName={managerName}
        siteName={formData.name || 'this site'}
        onConfirm={handleConfirmInactive}
        onCancel={handleCancelInactive}
        title="Unassign Manager?"
        message={
          <>
            Setting{' '}
            <span className="font-semibold text-slate-900">
              {formData.name || 'this site'}
            </span>
            {' to inactive will unassign '}
            <span className="font-semibold text-slate-900">{managerName}</span>
            {'. Do you want to continue?'}
          </>
        }
        confirmButtonLabel="Unassign & Set Inactive"
        cancelButtonLabel="Cancel"
      />
    </div>
  );
}
