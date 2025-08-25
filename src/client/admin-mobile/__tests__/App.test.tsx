import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the components
vi.mock('../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));
vi.mock('../components/TopNav', () => ({
  default: () => <div data-testid="topnav">TopNav</div>,
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topnav')).toBeInTheDocument();
  });
});
