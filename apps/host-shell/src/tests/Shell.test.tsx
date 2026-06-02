/**
 * Host Shell Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Shell } from '@/shell/Shell';

describe('Shell Component', () => {
  it('renders shell layout', () => {
    render(
      <Shell>
        <div>Test Content</div>
      </Shell>,
    );

    expect(screen.getByText('Host Shell')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header with navigation', () => {
    render(
      <Shell>
        <div>Test Content</div>
      </Shell>,
    );

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
