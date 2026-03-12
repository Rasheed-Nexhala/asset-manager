import React from 'react';
import { useSelector } from 'react-redux';
import { ItemSelectorModal } from '../Requests/ItemSelectorModal';
import { selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import type { Item } from '../../types/inventory';

interface POItemSelectorModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (items: Item[]) => void;
  excludeItemIds?: string[];
}

/**
 * Wrapper around ItemSelectorModal for PO context.
 * Selects items from central store to add to a purchase order.
 */
export const POItemSelectorModal: React.FC<POItemSelectorModalProps> = (
  props
) => {
  const isStoreIncharge = useSelector(selectIsStoreIncharge);
  return <ItemSelectorModal {...props} restrictToLowStock={isStoreIncharge} />;
};
