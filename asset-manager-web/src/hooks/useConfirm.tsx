import { useCallback, useState } from 'react';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

/**
 * Hook that provides a confirmation modal.
 * Returns { confirm, ConfirmationModal } - render ConfirmationModal and call confirm() to show it.
 *
 * @example
 * const { confirm, ConfirmationModal } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: 'Delete Item?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     variant: 'danger',
 *   });
 *   if (ok) { ... }
 * };
 */
export function useConfirm() {
  const [state, setState] = useState<{
    visible: boolean;
    resolve: (value: boolean) => void;
    options: ConfirmOptions;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        visible: true,
        resolve,
        options,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const confirmationModal = state ? (
    <ConfirmationModal
      visible={state.visible}
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, confirmationModal };
}
