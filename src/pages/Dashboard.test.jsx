import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { useStore } from '../store/useStore';

// Mock recharts to avoid rendering issues in jsdom
vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts');
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 800, height: 800 }}>{children}</div>
    ),
  };
});

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton when loading', () => {
    useStore.mockImplementation((selector) => {
      // simulate isLoading = true
      return selector({
        transactions: [],
        dateFilter: { type: 'month', date: new Date() },
        isLoading: true
      });
    });

    const { container } = render(<Dashboard />);
    // Skeleton uses animate-pulse class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders summary correctly with mock data', () => {
    useStore.mockImplementation((selector) => {
      return selector({
        transactions: [
          { id: 1, amount: 5000, type: 'income', category: 'cat1', date: new Date().toISOString() },
          { id: 2, amount: 2000, type: 'expense', category: 'cat2', date: new Date().toISOString() },
        ],
        dateFilter: { type: 'month', date: new Date() },
        isLoading: false
      });
    });

    render(<Dashboard />);
    
    // total income = 5000, total expense = 2000, balance = 3000
    // Check if these amounts are in the document
    expect(screen.getAllByText(/5,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/2,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/\+3,000/)[0]).toBeInTheDocument(); // Balance
    
    // Check insights
    expect(screen.getByText(/ได้กำไร/)).toBeInTheDocument();
  });

  it('renders bar chart when dateFilter is all', () => {
    useStore.mockImplementation((selector) => {
      return selector({
        transactions: [
          { id: 1, amount: 5000, type: 'income', category: 'cat1', date: new Date().toISOString() },
        ],
        dateFilter: { type: 'all' },
        isLoading: false
      });
    });

    render(<Dashboard />);
    expect(screen.getByText('📊 เปรียบเทียบรายรับ - รายจ่าย รายเดือน')).toBeInTheDocument();
  });
});
