import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
  accessibilityLabel?: string;
}

/**
 * Generic confirmation modal following CIAMS design system.
 * Use for yes/no dialogs (e.g. delete confirmations).
 */
export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  accessibilityLabel = 'Confirm action',
}: ConfirmationModalProps) {
  if (!visible) return null;

  const iconName = variant === 'danger' ? 'exclamation-triangle' : 'question-mark-circle';
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-amber-600';
  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-800 hover:bg-blue-900 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-desc"
      aria-label={accessibilityLabel}
    >
      <div className="w-full max-w-sm rounded-[10px] border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex justify-center">
          <Icon name={iconName} className={`h-16 w-16 ${iconColor}`} />
        </div>

        <h2
          id="confirmation-modal-title"
          className="mb-3 text-center text-[20px] font-semibold text-slate-900"
        >
          {title}
        </h2>

        <p id="confirmation-modal-desc" className="mb-6 text-center text-[15px] leading-6 text-slate-600">
          {message}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-[50px] flex-1 rounded-[10px] border-[1.5px] border-slate-300 font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-initial sm:min-w-[100px]"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-[50px] flex-1 rounded-[10px] font-semibold transition-colors sm:flex-initial sm:min-w-[100px] ${confirmButtonClass}`}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
