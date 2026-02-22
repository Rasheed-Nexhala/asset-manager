import React from 'react';
import { ItemSelectorModal } from '../Requests/ItemSelectorModal';
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
  return <ItemSelectorModal {...props} />;
};
