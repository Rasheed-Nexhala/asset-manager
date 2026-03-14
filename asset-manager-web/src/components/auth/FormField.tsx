import { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  onRightElementClick?: () => void;
  id?: string;
  /** When true, renders a textarea instead of input */
  multiline?: boolean;
  /** Number of visible rows for textarea */
  rows?: number;
}

const baseInputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:bg-slate-50 disabled:text-slate-500';

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      required,
      value,
      onChange,
      placeholder,
      error,
      type = 'text',
      autoComplete,
      disabled,
      rightElement,
      onRightElementClick,
      id,
      multiline,
      rows = 4,
    },
    ref
  ) => {
    const inputId = id ?? `field-${label.replace(/\s/g, '-').toLowerCase()}`;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[15px] font-medium text-slate-900"
        >
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        <div className="relative">
          {multiline ? (
            <textarea
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              className={clsx(
                baseInputClasses,
                'min-h-[100px] resize-y',
                error && 'border-red-600 focus:border-red-600 focus:ring-red-600'
              )}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
          ) : (
            <input
              ref={ref}
              id={inputId}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              className={clsx(
                baseInputClasses,
                rightElement && 'pr-12',
                error && 'border-red-600 focus:border-red-600 focus:ring-red-600'
              )}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
          )}
          {rightElement && onRightElementClick && (
            <button
              type="button"
              onClick={onRightElementClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              tabIndex={-1}
              aria-label={type === 'password' ? 'Toggle password visibility' : undefined}
            >
              {rightElement}
            </button>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[14px] text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
