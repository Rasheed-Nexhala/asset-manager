import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { addToMaintenanceThunk } from '../../store/thunks/maintenanceThunks';
import type { AddToMaintenanceData } from '../../types/maintenance';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface QuickMoveToMaintenanceButtonProps {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  issueDescription: string;
  sourceRequestId: string;
  sourceReturnDate: Date;
  onSuccess?: () => void;
}

export function QuickMoveToMaintenanceButton({
  itemId,
  itemName,
  itemSku,
  quantity,
  issueDescription,
  sourceRequestId,
  sourceReturnDate,
  onSuccess,
}: QuickMoveToMaintenanceButtonProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const [loading, setLoading] = useState(false);

  const handleQuickMove = async () => {
    if (!userId || !userName) {
      window.alert('User information not available');
      return;
    }

    const confirmed = window.confirm(
      `Move ${quantity} ${itemName} to maintenance?\n\nThis will remove the item from available inventory and track it in the maintenance system.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const maintenanceData: AddToMaintenanceData = {
        itemId,
        itemName,
        itemSku,
        quantity,
        issueType: 'physical_damage',
        issueDescription,
        sourceRequestId,
        sourceReturnDate,
      };

      await dispatch(
        addToMaintenanceThunk({
          data: maintenanceData,
          userId,
          userName,
        })
      ).unwrap();

      window.alert('Item moved to maintenance successfully');
      onSuccess?.();
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to move item to maintenance'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleQuickMove}
      disabled={loading}
      className={`rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 text-[14px] font-semibold text-white transition-opacity ${
        loading ? 'bg-amber-600/70 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
      }`}
      aria-label={loading ? 'Moving to maintenance, please wait' : 'Move to maintenance'}
    >
      {loading ? (
        <>
          <LoadingSpinner className="h-4 w-4 text-white" />
          <span>Please wait…</span>
        </>
      ) : (
        <>
          <Icon name="wrench-screwdriver" className="h-4 w-4" />
          <span>Move to Maintenance</span>
        </>
      )}
    </button>
  );
}
