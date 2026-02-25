/**
 * AddVendorScreen — Add/Edit vendor form
 * Tests: empty form (new), loading state, edit with data, validation, create submit, back button.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddVendorScreen } from '../AddVendorScreen';
import type { Vendor } from '../../../types/vendor';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => mockUseRoute(),
  useIsFocused: () => true,
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGetVendorById = jest.fn();
const mockCreateVendor = jest.fn();
const mockUpdateVendor = jest.fn();

jest.mock('../../../services/firebase/vendorService', () => ({
  getVendorById: (...args: unknown[]) => mockGetVendorById(...args),
  createVendor: (...args: unknown[]) => mockCreateVendor(...args),
  updateVendor: (...args: unknown[]) => mockUpdateVendor(...args),
}));

const mockVendor: Vendor = {
  id: 'v1',
  name: 'ABC Suppliers',
  contactPerson: 'John Doe',
  phone: '+91 9876543210',
  email: 'abc@test.com',
  address: '123 Vendor St',
  category: 'other',
  poCount: 0,
  lastPoDate: null,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('AddVendorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: {} });
    jest.spyOn(Alert, 'alert').mockImplementation(
      (_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
        buttons?.find((b) => b.text === 'OK')?.onPress?.();
      }
    );
  });

  it('renders empty form when no vendorId (new vendor)', () => {
    render(<AddVendorScreen />);

    expect(screen.getByText('Add Vendor')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter vendor name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Contact person name')).toBeTruthy();
    expect(screen.getByPlaceholderText('+91-')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('shows loading when vendorId and fetching', () => {
    mockUseRoute.mockReturnValue({ params: { vendorId: 'v1' } });
    mockGetVendorById.mockReturnValue(new Promise(() => {}));

    render(<AddVendorScreen />);

    expect(screen.getByText('Loading vendor...')).toBeTruthy();
    expect(mockGetVendorById).toHaveBeenCalledWith('v1');
  });

  it('renders form with vendor data when editing (mock getVendorById)', async () => {
    mockUseRoute.mockReturnValue({ params: { vendorId: 'v1' } });
    mockGetVendorById.mockResolvedValue(mockVendor);

    render(<AddVendorScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('ABC Suppliers')).toBeTruthy();
      expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
      expect(screen.getByDisplayValue('+91 9876543210')).toBeTruthy();
    });

    expect(screen.getByText('Edit Vendor')).toBeTruthy();
  });

  it('validation: submit without name shows error', () => {
    render(<AddVendorScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Vendor name is required')).toBeTruthy();
    expect(screen.getByText('Phone number is required')).toBeTruthy();
  });

  it('submit create dispatches createVendor and goBack', async () => {
    mockCreateVendor.mockResolvedValue(undefined);

    render(<AddVendorScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter vendor name'), 'New Vendor');
    fireEvent.changeText(screen.getByPlaceholderText('+91-'), '+91 1234567890');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateVendor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Vendor',
          phone: '+91 1234567890',
          category: 'other',
        })
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('back button calls goBack', () => {
    render(<AddVendorScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
