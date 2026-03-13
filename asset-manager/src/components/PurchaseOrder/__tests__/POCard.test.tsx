import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { POCard } from '../POCard';

const mockPO = {
  id: 'po1',
  poNumber: 'PO-2024-001',
  status: 'pending_approval' as const,
  vendorId: 'v1',
  vendorName: 'Steel Suppliers Ltd',
  items: [{ itemId: 'i1', itemName: 'Steel Bar', quantity: 10, unitPrice: 5000 }],
  totalAmount: 50000,
  createdAt: '2024-02-15T10:00:00.000Z',
  createdByName: 'Admin User',
} as import('../../../types/purchaseOrder').PurchaseOrder;

describe('POCard', () => {
  it('renders PO number and vendor name', () => {
    const onPress = jest.fn();
    render(<POCard po={mockPO} onPress={onPress} />);

    expect(screen.getByText('PO-2024-001')).toBeTruthy();
    expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
  });

  it('renders item count', () => {
    render(<POCard po={mockPO} onPress={jest.fn()} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<POCard po={mockPO} onPress={jest.fn()} />);
    expect(screen.getByText('Pending Approval')).toBeTruthy();
  });

  it('renders formatted total amount', () => {
    render(<POCard po={mockPO} onPress={jest.fn()} />);
    expect(screen.getByText('₹50,000')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<POCard po={mockPO} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: /Purchase order PO-2024-001/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('handles empty items array', () => {
    const poWithNoItems = { ...mockPO, items: [] };
    render(<POCard po={poWithNoItems} onPress={jest.fn()} />);
    expect(screen.getByText('0')).toBeTruthy();
  });
});
