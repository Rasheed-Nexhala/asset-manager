import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SiteForm } from '../SiteForm';

jest.mock('../SiteManagerSelector', () => ({
  SiteManagerSelector: () => null,
}));
jest.mock('../ManagerReassignmentConfirmationModal', () => ({
  ManagerReassignmentConfirmationModal: () => null,
}));
jest.mock('../../../services/firebase/userRoleService', () => ({
  getAllUsers: jest.fn().mockResolvedValue([
    { id: 'manager-1', displayName: 'John Manager', email: 'john@example.com' },
  ]),
}));

describe('SiteForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<SiteForm onSubmit={mockOnSubmit} />);

    expect(screen.getByPlaceholderText('e.g. Site A')).toBeTruthy();
    expect(screen.getByPlaceholderText('Brief project description')).toBeTruthy();
    expect(screen.getByPlaceholderText('Street, city')).toBeTruthy();
    expect(screen.getByPlaceholderText('Phone number')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Inactive')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('displays initial data when provided', () => {
    render(
      <SiteForm
        onSubmit={mockOnSubmit}
        initialData={{
          name: 'Site Alpha',
          address: '123 Main St',
          status: 'active',
        }}
      />
    );

    expect(screen.getByDisplayValue('Site Alpha')).toBeTruthy();
    expect(screen.getByDisplayValue('123 Main St')).toBeTruthy();
  });

  it('calls onSubmit with form data when valid', () => {
    render(<SiteForm onSubmit={mockOnSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Site A'), 'Site Beta');
    fireEvent.changeText(screen.getByPlaceholderText('Street, city'), '456 Oak Ave');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Site Beta',
        address: '456 Oak Ave',
        status: 'active',
      })
    );
  });

  it('shows validation errors for empty required fields', () => {
    render(<SiteForm onSubmit={mockOnSubmit} />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Site name is required')).toBeTruthy();
    expect(screen.getByText('Address is required')).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows error when site name is too short', () => {
    render(<SiteForm onSubmit={mockOnSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Site A'), 'AB');
    fireEvent.changeText(screen.getByPlaceholderText('Street, city'), '123 Main St');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Site name must be at least 3 characters')).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('uses custom submit button label', () => {
    render(<SiteForm onSubmit={mockOnSubmit} submitButtonLabel="Add Site" />);

    expect(screen.getByRole('button', { name: 'Add Site' })).toBeTruthy();
  });

  it('disables submit when isLoading', () => {
    render(<SiteForm onSubmit={mockOnSubmit} isLoading />);

    expect(screen.getByRole('button', { name: 'Saving site, please wait' })).toBeTruthy();
  });

  it('switches to active status when Active button pressed', () => {
    render(
      <SiteForm
        onSubmit={mockOnSubmit}
        initialData={{ name: 'Test Site', address: '123 St', status: 'inactive' }}
      />
    );

    fireEvent.press(screen.getByRole('button', { name: 'Set status to Active' }));

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });
});
