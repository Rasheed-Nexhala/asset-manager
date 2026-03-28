/**
 * POItemSelectorModal — passes restrictToLowStock from role selectors
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { POItemSelectorModal } from '../POItemSelectorModal';
import { ItemSelectorModal } from '../../Requests/ItemSelectorModal';
import {
  selectIsStoreIncharge,
  selectIsSuperAdmin,
} from '../../../store/selectors/authSelectors';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../Requests/ItemSelectorModal', () => ({
  ItemSelectorModal: jest.fn(() => null),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const MockItemSelectorModal = ItemSelectorModal as jest.MockedFunction<
  typeof ItemSelectorModal
>;

describe('POItemSelectorModal', () => {
  const onClose = jest.fn();
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes restrictToLowStock=true when StoreIncharge and not SuperAdmin', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsStoreIncharge) return true;
      if (selector === selectIsSuperAdmin) return false;
      return undefined;
    });

    render(
      <POItemSelectorModal isVisible onClose={onClose} onSelect={onSelect} />
    );

    const passedProps = MockItemSelectorModal.mock.calls[0][0];
    expect(passedProps).toEqual(
      expect.objectContaining({
        isVisible: true,
        onClose,
        onSelect,
        restrictToLowStock: true,
      })
    );
  });

  it('passes restrictToLowStock=false when StoreIncharge and SuperAdmin', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsStoreIncharge) return true;
      if (selector === selectIsSuperAdmin) return true;
      return undefined;
    });

    render(
      <POItemSelectorModal isVisible onClose={onClose} onSelect={onSelect} />
    );

    expect(MockItemSelectorModal.mock.calls[0][0]).toEqual(
      expect.objectContaining({ restrictToLowStock: false })
    );
  });

  it('passes restrictToLowStock=false when not StoreIncharge', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsStoreIncharge) return false;
      if (selector === selectIsSuperAdmin) return false;
      return undefined;
    });

    render(
      <POItemSelectorModal isVisible onClose={onClose} onSelect={onSelect} />
    );

    expect(MockItemSelectorModal.mock.calls[0][0]).toEqual(
      expect.objectContaining({ restrictToLowStock: false })
    );
  });
});
