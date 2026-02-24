import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RequestCard } from '../RequestCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const mockRequest = {
  id: 'req1',
  requestNumber: 'R-001',
  status: 'pending',
  priority: 'high',
  siteId: 'site1',
  siteName: 'Site Alpha',
  items: [{ itemId: 'i1', itemName: 'Steel Bar', quantityRequested: 5 }],
  createdAt: '2025-02-24T10:00:00.000Z',
} as unknown as import('../../../types/request').Request;

describe('RequestCard', () => {
  it('renders request number and site name', () => {
    const onPress = jest.fn();
    render(<RequestCard request={mockRequest} onPress={onPress} />);

    expect(screen.getByText('R-001')).toBeTruthy();
    expect(screen.getByText('Site Alpha')).toBeTruthy();
  });

  it('renders item count', () => {
    render(<RequestCard request={mockRequest} onPress={jest.fn()} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<RequestCard request={mockRequest} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: /Request R-001/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows availability indicator when showAvailability is true and sufficient', () => {
    render(
      <RequestCard
        request={mockRequest}
        onPress={jest.fn()}
        showAvailability
        isAllSufficient
      />
    );
    expect(screen.getByText('All items available')).toBeTruthy();
  });

  it('shows insufficient stock when showAvailability is true and not sufficient', () => {
    render(
      <RequestCard
        request={mockRequest}
        onPress={jest.fn()}
        showAvailability
        isAllSufficient={false}
      />
    );
    expect(screen.getByText('Insufficient stock')).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<RequestCard request={mockRequest} onPress={jest.fn()} />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });
});
