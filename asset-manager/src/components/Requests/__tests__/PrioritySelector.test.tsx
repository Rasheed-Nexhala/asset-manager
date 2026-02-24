import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PrioritySelector } from '../PrioritySelector';

describe('PrioritySelector', () => {
  it('renders all priority options', () => {
    const onChange = jest.fn();
    render(<PrioritySelector value="medium" onChange={onChange} />);

    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('calls onChange when priority is selected', () => {
    const onChange = jest.fn();
    render(<PrioritySelector value="medium" onChange={onChange} />);

    fireEvent.press(screen.getByRole('radio', { name: /Priority: High/i }));
    expect(onChange).toHaveBeenCalledWith('high');

    fireEvent.press(screen.getByRole('radio', { name: /Priority: Low/i }));
    expect(onChange).toHaveBeenCalledWith('low');
  });

  it('shows error message when error prop is provided', () => {
    render(
      <PrioritySelector
        value="high"
        onChange={jest.fn()}
        error="Please select a priority"
      />
    );
    expect(screen.getByText('Please select a priority')).toBeTruthy();
  });
});
