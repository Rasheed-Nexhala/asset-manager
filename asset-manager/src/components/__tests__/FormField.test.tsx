import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders label and value', () => {
    render(
      <FormField
        label="Email"
        value="test@example.com"
        onChangeText={jest.fn()}
      />
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('shows required asterisk when required', () => {
    render(
      <FormField
        label="Password"
        value=""
        onChangeText={jest.fn()}
        required
      />
    );
    expect(screen.getByText(/Password/)).toBeTruthy();
    expect(screen.getByText(' *')).toBeTruthy();
  });

  it('shows error message when error is set', () => {
    render(
      <FormField
        label="Email"
        value=""
        onChangeText={jest.fn()}
        error="Email is required"
      />
    );
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(
      <FormField
        label="Email"
        value=""
        onChangeText={onChangeText}
        placeholder="Enter email"
      />
    );

    const input = screen.getByPlaceholderText('Enter email');
    fireEvent.changeText(input, 'new@email.com');
    expect(onChangeText).toHaveBeenCalledWith('new@email.com');
  });

  it('uses accessibilityLabel for input', () => {
    render(
      <FormField
        label="Email"
        value=""
        onChangeText={jest.fn()}
        accessibilityLabel="Email input"
      />
    );
    expect(screen.getByLabelText('Email input')).toBeTruthy();
  });
});
