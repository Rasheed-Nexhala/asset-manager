import { FormField } from '../auth/FormField';
import type { CreateVendorData } from '../../types/vendor';

interface VendorFormProps {
  data: CreateVendorData;
  onChange: (data: CreateVendorData) => void;
  errors?: Partial<Record<keyof CreateVendorData, string>>;
}

export function VendorForm({
  data,
  onChange,
  errors = {},
}: VendorFormProps) {
  const handleChange = (field: keyof CreateVendorData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Vendor Name"
        value={data.name}
        onChange={(v) => handleChange('name', v)}
        placeholder="Enter vendor name"
        error={errors.name}
        required
      />
      <FormField
        label="Contact Person"
        value={data.contactPerson}
        onChange={(v) => handleChange('contactPerson', v)}
        placeholder="Contact person name"
        error={errors.contactPerson}
      />
      <FormField
        label="Phone Number"
        value={data.phone}
        onChange={(v) => handleChange('phone', v)}
        placeholder="+91-"
        error={errors.phone}
        required
      />
      <FormField
        label="Email"
        value={data.email ?? ''}
        onChange={(v) => handleChange('email', v)}
        placeholder="email@example.com"
        type="email"
        error={errors.email}
      />
      <div>
        <label className="mb-1.5 block text-[15px] font-medium text-slate-900">
          Address
        </label>
        <textarea
          value={data.address ?? ''}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Full address"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
        />
      </div>
      <FormField
        label="GSTIN"
        value={data.gstin ?? ''}
        onChange={(v) => handleChange('gstin', v)}
        placeholder="e.g. 29AJWPD4844N1ZC"
        error={errors.gstin}
      />
    </div>
  );
}
