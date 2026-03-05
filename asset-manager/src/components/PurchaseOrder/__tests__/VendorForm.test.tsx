import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VendorForm } from '../VendorForm';

const initialData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
};

describe('VendorForm', () => {
  it('renders all form fields', () => {
    const onChange = jest.fn();
    render(<VendorForm data={initialData} onChange={onChange} />);

    expect(screen.getByPlaceholderText('Enter vendor name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Contact person name')).toBeTruthy();
    expect(screen.getByPlaceholderText('+91-')).toBeTruthy();
    expect(screen.getByPlaceholderText('email@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Full address')).toBeTruthy();
  });

  it('calls onChange when vendor name changes', () => {
    const onChange = jest.fn();
    render(<VendorForm data={initialData} onChange={onChange} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter vendor name'), 'Acme Corp');
    expect(onChange).toHaveBeenCalledWith({ ...initialData, name: 'Acme Corp' });
  });

  it('calls onChange when phone changes', () => {
    const onChange = jest.fn();
    render(<VendorForm data={initialData} onChange={onChange} />);

    fireEvent.changeText(screen.getByPlaceholderText('+91-'), '9876543210');
    expect(onChange).toHaveBeenCalledWith({ ...initialData, phone: '9876543210' });
  });

  it('displays initial values', () => {
    const data = {
      ...initialData,
      name: 'Steel Suppliers',
      contactPerson: 'John Doe',
      phone: '1234567890',
    };
    render(<VendorForm data={data} onChange={jest.fn()} />);

    expect(screen.getByDisplayValue('Steel Suppliers')).toBeTruthy();
    expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    expect(screen.getByDisplayValue('1234567890')).toBeTruthy();
  });

  it('displays error messages', () => {
    render(
      <VendorForm
        data={initialData}
        onChange={jest.fn()}
        errors={{ name: 'Name is required', phone: 'Phone is required' }}
      />
    );

    expect(screen.getByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Phone is required')).toBeTruthy();
  });
});
