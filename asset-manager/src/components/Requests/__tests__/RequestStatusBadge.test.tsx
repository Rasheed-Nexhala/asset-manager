import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RequestStatusBadge } from '../RequestStatusBadge';

describe('RequestStatusBadge', () => {
  it('renders Draft for draft status', () => {
    render(<RequestStatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('renders Pending for pending status', () => {
    render(<RequestStatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('renders Approved for approved status', () => {
    render(<RequestStatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('renders Rejected for rejected status', () => {
    render(<RequestStatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeTruthy();
  });

  it('renders Transferred for transferred status', () => {
    render(<RequestStatusBadge status="transferred" />);
    expect(screen.getByText('Transferred')).toBeTruthy();
  });

  it('renders Partially Returned for partially_returned status', () => {
    render(<RequestStatusBadge status="partially_returned" />);
    expect(screen.getByText('Partially Returned')).toBeTruthy();
  });

  it('renders Returned for returned status', () => {
    render(<RequestStatusBadge status="returned" />);
    expect(screen.getByText('Returned')).toBeTruthy();
  });

  it('renders Cancelled for cancelled status', () => {
    render(<RequestStatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('renders unknown status as raw value when status is not in config', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<RequestStatusBadge status={'unknown' as never} />);
    expect(screen.getByText('unknown')).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
