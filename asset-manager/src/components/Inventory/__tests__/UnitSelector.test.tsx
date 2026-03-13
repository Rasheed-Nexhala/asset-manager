/**
 * UnitSelector component tests
 * Covers unit selection, common units, custom item restricted units, and accessibility
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UnitSelector } from '../UnitSelector';

describe('UnitSelector', () => {
  it('renders with placeholder when no unit selected', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} />);

    expect(screen.getByText('Select unit')).toBeTruthy();
  });

  it('renders selected unit when provided', () => {
    const onSelect = jest.fn();
    render(<UnitSelector selectedUnit="Kg" onSelect={onSelect} />);

    expect(screen.getByText('Kg')).toBeTruthy();
  });

  it('opens modal and shows common units when selector is pressed', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} />);

    fireEvent.press(screen.getByRole('button', { name: /Select unit/i }));

    expect(screen.getByText('Select Unit')).toBeTruthy();
    expect(screen.getByText('Pcs')).toBeTruthy();
    expect(screen.getByText('Kg')).toBeTruthy();
    expect(screen.getByText('Ton (MT)')).toBeTruthy();
    expect(screen.getByText('Bag')).toBeTruthy();
    expect(screen.getByText('Box')).toBeTruthy();
  });

  it('calls onSelect when a unit is selected', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} />);

    fireEvent.press(screen.getByRole('button', { name: /Select unit/i }));
    fireEvent.press(screen.getByText('Kg'));

    expect(onSelect).toHaveBeenCalledWith('Kg');
  });

  it('shows custom item units only when steelMasterItem is true', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} steelMasterItem />);

    fireEvent.press(screen.getByRole('button', { name: /Select unit/i }));

    expect(screen.getByText('Pcs')).toBeTruthy();
    expect(screen.getByText('Kg')).toBeTruthy();
    expect(screen.getByText('Ton (MT)')).toBeTruthy();
    expect(screen.queryByText('Bag')).toBeNull();
    expect(screen.queryByText('Meter')).toBeNull();
  });

  it('displays error message when error prop is provided', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} error="Unit is required" />);

    expect(screen.getByText('Unit is required')).toBeTruthy();
  });

  it('shows auto-filled indicator when autoFilled is true', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} autoFilled autoFilledFrom="Custom Item" />);

    expect(screen.getByText(/Auto-filled/)).toBeTruthy();
    expect(screen.getByText(/Custom Item/)).toBeTruthy();
  });

  it('does not open modal when disabled', () => {
    const onSelect = jest.fn();
    render(<UnitSelector onSelect={onSelect} disabled />);

    fireEvent.press(screen.getByRole('button', { name: /Select unit/i }));

    expect(screen.queryByText('Select Unit')).toBeNull();
  });
});
