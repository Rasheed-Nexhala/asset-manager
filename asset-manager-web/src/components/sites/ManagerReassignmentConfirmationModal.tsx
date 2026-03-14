import type { ReactNode } from 'react';
import { Icon } from '../shared/Icon';

export interface ManagerReassignmentConfirmationModalProps {
  visible: boolean;
  managerName: string;
  siteName: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: ReactNode;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  accessibilityLabel?: string;
}

export function ManagerReassignmentConfirmationModal({
  visible,
  managerName,
  siteName,
  onConfirm,
  onCancel,
  title = 'Manager Already Assigned',
  message,
  confirmButtonLabel = 'Move Manager',
  cancelButtonLabel = 'Cancel',
  accessibilityLabel = 'Confirm manager reassignment',
}: ManagerReassignmentConfirmationModalProps) {
  const defaultMessage = (
    <>
      <span className="font-semibold text-slate-900">{managerName}</span>
      {' is already assigned to '}
      <span className="font-semibold text-slate-900">{siteName}</span>
      {'. Do you want to move them to this site?'}
    </>
  );

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="alertdialog"
      aria-label={accessibilityLabel}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex justify-center">
          <Icon name="exclamation-circle" className="h-16 w-16 text-amber-600" />
        </div>

        <h2 className="mb-3 text-center text-[20px] font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mb-6 text-center text-[15px] leading-6 text-slate-500">
          {message ?? defaultMessage}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onConfirm}
            className="h-[50px] w-full rounded-[10px] bg-blue-800 font-semibold text-white transition-colors hover:bg-blue-900"
            aria-label={confirmButtonLabel}
          >
            {confirmButtonLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-[50px] w-full rounded-[10px] border-[1.5px] border-slate-500 font-semibold text-slate-500 transition-colors hover:bg-slate-50"
            aria-label={cancelButtonLabel}
          >
            {cancelButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
