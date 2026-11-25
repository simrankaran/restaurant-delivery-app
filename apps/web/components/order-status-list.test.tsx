import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderStatusList } from './order-status-list';

describe('OrderStatusList', () => {
  it('renders every shared order status with its label and next steps', () => {
    render(<OrderStatusList />);
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
    expect(screen.getByText('Out for delivery')).toBeTruthy();
    expect(screen.getByText('→ delivered, not_delivered')).toBeTruthy();
  });
});
