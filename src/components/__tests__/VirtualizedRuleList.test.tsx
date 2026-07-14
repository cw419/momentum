import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtualizedRuleList } from '../VirtualizedRuleList';
import { ExceptionRule, ExceptionRuleType } from '../../types';
import { SearchResult } from '../../utils/ruleSearchOptimizer';
import { I18nProvider } from '../../i18n';

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const renderWithI18n = (ui: React.ReactElement) => {
  return render(ui, { wrapper: I18nProvider });
};

describe('VirtualizedRuleList', () => {
  const mockRules: ExceptionRule[] = Array.from({ length: 100 }, (_, i) => ({
    id: `rule-${i}`,
    name: `规则 ${i}`,
    chainId: 'test-chain',
    scope: 'chain',
    type: ExceptionRuleType.PAUSE_ONLY,
    createdAt: new Date(),
    usageCount: Math.floor(Math.random() * 10),
    isActive: true,
    lastUsedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }));

  const mockSearchResults: SearchResult[] = mockRules.map((rule) => ({
    rule,
    score: 100,
    matchType: 'exact',
    highlightRanges: [],
  }));

  const defaultProps = {
    rules: mockSearchResults.slice(0, 10), // Start with 10 rules
    onSelect: vi.fn(),
    itemHeight: 60,
    containerHeight: 400,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('language', 'zh');
  });

  describe('rendering', () => {
    it('should render rule list', () => {
      renderWithI18n(<VirtualizedRuleList {...defaultProps} />);

      expect(screen.getByText('规则 0')).toBeInTheDocument();
      expect(screen.getByText('规则 1')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} isLoading={true} />,
      );

      expect(screen.getByText('加载规则中...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should render empty state when no rules', () => {
      renderWithI18n(<VirtualizedRuleList {...defaultProps} rules={[]} />);

      expect(screen.getByText('暂无可用规则')).toBeInTheDocument();
    });

    it('should render empty state with search query', () => {
      renderWithI18n(
        <VirtualizedRuleList
          {...defaultProps}
          rules={[]}
          searchQuery="nonexistent"
          onCreateNew={vi.fn()}
        />,
      );

      expect(screen.getByText('创建新规则: "nonexistent"')).toBeInTheDocument();
      expect(screen.getByText('为当前任务链创建专属规则')).toBeInTheDocument();
    });
  });

  describe('virtualization', () => {
    it('should only render visible items', () => {
      const largeRuleSet = mockSearchResults; // 100 rules
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={largeRuleSet} />,
      );

      // Should render first few items
      expect(screen.getByText('规则 0')).toBeInTheDocument();
      expect(screen.getByText('规则 1')).toBeInTheDocument();

      // Should not render items far down the list
      expect(screen.queryByText('规则 50')).not.toBeInTheDocument();
      expect(screen.queryByText('规则 99')).not.toBeInTheDocument();
    });

    it('should handle scrolling', async () => {
      const largeRuleSet = mockSearchResults;
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={largeRuleSet} />,
      );

      const scrollContainer = document.querySelector(
        '.overflow-auto',
      ) as HTMLElement | null;
      expect(scrollContainer).not.toBeNull();

      // Simulate scrolling down
      scrollContainer!.scrollTop = 1000;
      fireEvent.scroll(scrollContainer!);

      await waitFor(() => {
        // Should render items further down the list
        expect(screen.queryByText('规则 0')).not.toBeInTheDocument();
      });
    });

    it('should maintain correct total height', () => {
      const largeRuleSet = mockSearchResults;
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={largeRuleSet} />,
      );

      const virtualContainer = document.querySelector(
        '.overflow-auto > .relative',
      );
      expect(virtualContainer).toHaveStyle(`height: ${100 * 60}px`); // 100 items * 60px height
    });
  });

  describe('create new rule functionality', () => {
    it('should show create new rule option when provided', () => {
      renderWithI18n(
        <VirtualizedRuleList
          {...defaultProps}
          searchQuery="新规则"
          onCreateNew={vi.fn()}
        />,
      );

      expect(screen.getByText('创建新规则: "新规则"')).toBeInTheDocument();
    });

    it('should call onCreateNew when create button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCreateNew = vi.fn();

      renderWithI18n(
        <VirtualizedRuleList
          {...defaultProps}
          searchQuery="新规则"
          onCreateNew={mockOnCreateNew}
        />,
      );

      const createButton = screen.getByText('创建新规则: "新规则"');
      await user.click(createButton);

      expect(mockOnCreateNew).toHaveBeenCalledWith('新规则');
    });

    it('should not show create option without search query', () => {
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} onCreateNew={vi.fn()} />,
      );

      expect(screen.queryByText(/创建新规则/)).not.toBeInTheDocument();
    });
  });

  describe('rule selection', () => {
    it('should call onSelect when rule is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} onSelect={mockOnSelect} />,
      );

      const ruleButton = screen.getByText('规则 0').closest('button');
      await user.click(ruleButton!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockRules[0]);
    });

    it('should show rule usage information', () => {
      renderWithI18n(<VirtualizedRuleList {...defaultProps} />);

      expect(screen.getAllByText(/使用过 \d+ 次/).length).toBeGreaterThan(0);
    });

    it('should show last used information when available', () => {
      const rulesWithLastUsed = mockSearchResults.map((result) => ({
        ...result,
        rule: {
          ...result.rule,
          lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      }));

      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={rulesWithLastUsed} />,
      );

      expect(screen.getAllByText(/2小时前/).length).toBeGreaterThan(0);
    });
  });

  describe('search highlighting', () => {
    it('should highlight search matches', () => {
      const searchResults: SearchResult[] = [
        {
          rule: mockRules[0],
          score: 100,
          matchType: 'contains',
          highlightRanges: [{ start: 0, end: 2 }],
        },
      ];

      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={searchResults} />,
      );

      const highlightedText = screen.getByText('规则').closest('mark');
      expect(highlightedText).toBeInTheDocument();
      expect(highlightedText).toHaveClass('bg-yellow-200');
    });

    it('should show match type labels', () => {
      const searchResults: SearchResult[] = [
        {
          rule: mockRules[0],
          score: 100,
          matchType: 'fuzzy',
          highlightRanges: [],
        },
      ];

      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={searchResults} />,
      );

      expect(screen.getByText('模糊匹配')).toBeInTheDocument();
    });
  });

  describe('usage visualization', () => {
    it('should show usage frequency bars', () => {
      const highUsageRule = {
        ...mockRules[0],
        usageCount: 10,
      };

      const searchResults: SearchResult[] = [
        {
          rule: highUsageRule,
          score: 100,
          matchType: 'exact',
          highlightRanges: [],
        },
      ];

      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={searchResults} />,
      );

      // Should have usage frequency visualization bars
      const usageBars = document.querySelectorAll('.w-1.h-4.rounded-full');
      expect(usageBars.length).toBe(5); // 5 bars total

      // Some bars should be active (primary color)
      const activeBars = document.querySelectorAll('.bg-primary-500');
      expect(activeBars.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', () => {
      renderWithI18n(
        <VirtualizedRuleList {...defaultProps} rules={mockSearchResults} />,
      );

      // Virtualization: should not render the whole dataset at once.
      const ruleButtons = screen.getAllByRole('button');
      expect(ruleButtons.length).toBeLessThan(50);
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles', () => {
      renderWithI18n(<VirtualizedRuleList {...defaultProps} />);

      const ruleButtons = screen.getAllByRole('button');
      expect(ruleButtons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithI18n(<VirtualizedRuleList {...defaultProps} />);

      // Tab should focus on first rule button
      await user.tab();
      const firstButton = screen.getByText('规则 0').closest('button');
      expect(firstButton).toHaveFocus();
    });
  });

  describe('responsive behavior', () => {
    it('should adapt to container size changes', () => {
      const { rerender } = renderWithI18n(
        <VirtualizedRuleList {...defaultProps} />,
      );

      // Change container height
      rerender(<VirtualizedRuleList {...defaultProps} containerHeight={600} />);

      const container = document.querySelector('[style*="height: 600px"]');
      expect(container).toBeInTheDocument();
    });

    it('should handle different item heights', () => {
      renderWithI18n(<VirtualizedRuleList {...defaultProps} itemHeight={80} />);

      const virtualContainer = document.querySelector(
        '.overflow-auto > .relative',
      );
      expect(virtualContainer).toHaveStyle(`height: ${10 * 80}px`); // 10 items * 80px height
    });
  });
});
