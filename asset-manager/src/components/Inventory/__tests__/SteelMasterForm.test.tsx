import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SteelMasterForm } from '../SteelMasterForm';

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

const mockSteelMaster = {
  id: 'sm1',
  name: 'Custom Item A',
  weightPerMeter: 7.2,
  defaultLength: 6,
  hsnCode: 'HSN7214',
  isActive: true,
} as import('../../../types/steelMaster').SteelMaster;

describe('SteelMasterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { queryByText } = render(
      <SteelMasterForm
        visible={false}
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(queryByText('Add Custom Item')).toBeNull();
  });

  it('renders create mode title when visible', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getAllByText('Add Custom Item').length).toBeGreaterThan(0);
  });

  it('renders edit mode title when in edit mode', () => {
    render(
      <SteelMasterForm
        visible
        mode="edit"
        initialData={mockSteelMaster}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Edit Custom Item')).toBeTruthy();
  });

  it('prefills form in edit mode', () => {
    render(
      <SteelMasterForm
        visible
        mode="edit"
        initialData={mockSteelMaster}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByDisplayValue('Custom Item A')).toBeTruthy();
    expect(screen.getByDisplayValue('7.2')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
    expect(screen.getByDisplayValue('HSN7214')).toBeTruthy();
  });

  it('calls onCancel when close button pressed', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button pressed', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors when submitting empty form', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: /Add Custom Item/i }));

    expect(screen.getByText('Item name is required')).toBeTruthy();
    expect(screen.getByText('Weight per meter must be a positive number')).toBeTruthy();
    expect(screen.getByText('Default length is required')).toBeTruthy();
    expect(screen.getByText('SKU is required')).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data in create mode', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.changeText(screen.getByLabelText('Custom item name input'), 'Custom Item A');
    fireEvent.changeText(screen.getByLabelText('Default length input'), '6');
    fireEvent.changeText(screen.getByLabelText('Weight per meter input'), '7.2');
    fireEvent.changeText(screen.getByLabelText('SKU input'), 'HSN7214');

    fireEvent.press(screen.getByRole('button', { name: /Add Custom Item/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Custom Item A',
      weightPerMeter: 7.2,
      defaultLength: 6,
      hsnCode: 'HSN7214',
    });
  });

  it('displays error prop when provided', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        error="Failed to save"
      />
    );
    expect(screen.getByText('Failed to save')).toBeTruthy();
  });

  it('disables buttons when loading', () => {
    render(
      <SteelMasterForm
        visible
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading
      />
    );
    expect(screen.getByRole('button', { name: /Saving, please wait/i })).toBeTruthy();
  });
});
