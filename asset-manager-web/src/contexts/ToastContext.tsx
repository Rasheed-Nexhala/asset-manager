import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from '../components/shared/Icon';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = DEFAULT_DURATION) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  const value = useMemo(
    () => ({ showToast, success, error, info }),
    [showToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 md:left-auto md:right-6 md:max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const variantStyles = {
    success: 'bg-green-600/15 border-green-600/30 text-green-700',
    error: 'bg-red-600/15 border-red-600/30 text-red-700',
    info: 'bg-slate-600/15 border-slate-600/30 text-slate-700',
  };

  const iconMap = {
    success: 'check-circle' as const,
    error: 'x-circle' as const,
    info: 'exclamation-circle' as const,
  };

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-[10px] border p-4 shadow-lg ${variantStyles[toast.variant]}`}
    >
      <Icon name={iconMap[toast.variant]} className="h-6 w-6 flex-shrink-0" />
      <p className="flex-1 text-[15px] font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <Icon name="x-mark" className="h-5 w-5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
