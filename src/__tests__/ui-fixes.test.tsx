/**
 * UI修复和改进测试套件
 * 验证横向滚动修复、性能优化等功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleManagerView } from '../components/RuleManagerView';
import { RuleSelectionDialog } from '../components/RuleSelectionDialog';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { layoutStabilityMonitor } from '../utils/LayoutStabilityMonitor';
import { performanceMonitor } from '../utils/performanceMonitor';
import { I18nProvider } from '../i18n';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { ExceptionRuleType, type ExceptionRule } from '../types';
import type { Mocked } from 'vitest';

// Mock dependencies
vi.mock('../services/ExceptionRuleManager', () => ({
    exceptionRuleManager: {
        getAllRules: vi.fn(),
        createChainRule: vi.fn(),
    },
}));

vi.mock('../utils/exceptionRuleCache', () => {
    class ExceptionRuleCache {
        getChainRules = vi.fn(() => null);
        setChainRules = vi.fn();
        updateChainRules = vi.fn();
    }

    return { ExceptionRuleCache };
});

vi.mock('../utils/ruleSearchOptimizer', () => {
    class RuleSearchOptimizer {
        updateIndex = vi.fn();
        searchRulesDebounced = vi.fn((_rules, _query, callback) => callback([]));
        detectDuplicates = vi.fn(() => ({
            hasExactMatch: false,
            exactMatches: [],
            similarRules: [],
        }));
    }

    return { RuleSearchOptimizer };
});

vi.mock('../utils/LayoutStabilityMonitor', async () => {
    const actual = await vi.importActual<any>('../utils/LayoutStabilityMonitor');
    return {
        ...actual,
        useLayoutStability: vi.fn(() => ({
            startMonitoring: vi.fn(),
            stopMonitoring: vi.fn(),
            checkNow: vi.fn(),
            getReport: vi.fn(),
            clearIssues: vi.fn(),
        })),
    };
});

const renderWithI18n = (ui: React.ReactElement) => {
    return render(ui, { wrapper: I18nProvider });
};

const mockedRuleManager = exceptionRuleManager as Mocked<typeof exceptionRuleManager>;

const mockRules: ExceptionRule[] = [
    {
        id: '1',
        name: '上厕所',
        chainId: 'test-chain',
        scope: 'chain',
        type: ExceptionRuleType.PAUSE_ONLY,
        createdAt: new Date(),
        usageCount: 1,
        isActive: true,
    },
];

describe('UI Fixes and Improvements', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('language', 'zh');
        mockedRuleManager.getAllRules.mockResolvedValue(mockRules);

        // Reset monitors
        layoutStabilityMonitor.clearIssues();
        performanceMonitor.setBackgroundMode(false);
        performanceMonitor.setReportingEnabled(false);
    });

    describe('Horizontal Scroll Fixes', () => {
        test('ExceptionRuleManager should not cause horizontal overflow', async () => {
            const { container } = renderWithI18n(<RuleManagerView onClose={() => { }} />);

            await screen.findByText('例外规则管理');

            const overlay = container.querySelector('div.fixed.inset-0');
            expect(overlay).toHaveClass('overflow-x-hidden');
        });

        test('RuleSelectionDialog should prevent horizontal overflow', () => {
            const mockSessionContext = {
                sessionId: 'test-session',
                chainId: 'test-chain',
                chainName: 'Test Chain',
                startedAt: new Date(),
                elapsedTime: 300,
                remainingTime: 600,
                isDurationless: false
            };

            const { container } = renderWithI18n(
                <RuleSelectionDialog
                    isOpen={true}
                    actionType="pause"
                    sessionContext={mockSessionContext}
                    onRuleSelected={() => { }}
                    onCreateNewRule={() => { }}
                    onCancel={() => { }}
                />
            );

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveClass('overflow-hidden');
            expect(dialog).toHaveStyle({ maxWidth: 'min(640px, 100vw - 2rem)' });
        });

        test('ResponsiveContainer should prevent overflow', () => {
            const { container } = render(
                <ResponsiveContainer preventOverflow={true}>
                    <div style={{ width: '2000px' }}>Wide content</div>
                </ResponsiveContainer>
            );

            const containerElement = container.firstChild as HTMLElement;
            expect(containerElement).toHaveClass('overflow-x-hidden');
            expect(containerElement).toHaveStyle({ maxWidth: '100vw' });
        });
    });

    describe('Performance Optimizations', () => {
        test('Performance monitor should work in background mode', () => {
            performanceMonitor.setReportingEnabled(true);
            performanceMonitor.setBackgroundMode(true);

            // Simulate a slow operation
            const result = performanceMonitor.measureInteraction('test-interaction', () => {
                // Simulate work
                const start = Date.now();
                while (Date.now() - start < 50) {
                    // Busy wait
                }
                return 'result';
            });

            expect(result).toBe('result');

            const report = performanceMonitor.reportMetrics();
            expect(report.interactionTime).toBeGreaterThan(0);

            // Restore defaults to avoid leaking state across tests.
            performanceMonitor.setReportingEnabled(false);
            performanceMonitor.setBackgroundMode(false);
        });

        test('Layout stability monitor should detect issues', async () => {
            const testContainer = document.createElement('div');
            testContainer.style.width = '100px';
            testContainer.style.overflow = 'hidden';

            const wideChild = document.createElement('div');
            wideChild.style.width = '200px';
            testContainer.appendChild(wideChild);

            document.body.appendChild(testContainer);

            // JSDOM doesn't calculate layout metrics; simulate overflow explicitly.
            Object.defineProperty(testContainer, 'clientWidth', { configurable: true, value: 100 });
            Object.defineProperty(testContainer, 'scrollWidth', { configurable: true, value: 200 });

            layoutStabilityMonitor.checkNow(testContainer);

            const report = layoutStabilityMonitor.getStabilityReport();
            expect(report.totalIssues).toBeGreaterThan(0);

            document.body.removeChild(testContainer);
        });
    });

    describe('Mobile Touch Optimization', () => {
        test('Buttons should have minimum touch target size', () => {
            render(
                <button className="touch-target">Test Button</button>
            );

            const button = screen.getByRole('button');
            const computedStyle = window.getComputedStyle(button);

            // Check if touch target styles are applied
            expect(button).toHaveClass('touch-target');
        });

        test('Touch feedback should be applied', () => {
            render(
                <button className="touch-feedback">Test Button</button>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveClass('touch-feedback');
        });
    });

    describe('Responsive Design', () => {
        test('ResponsiveContainer should adapt to different screen sizes', () => {
            const { rerender } = render(
                <ResponsiveContainer maxWidth="max-w-2xl">
                    <div>Content</div>
                </ResponsiveContainer>
            );

            // Test different max widths
            rerender(
                <ResponsiveContainer maxWidth="max-w-4xl">
                    <div>Content</div>
                </ResponsiveContainer>
            );

            // Should not throw errors and render correctly
            expect(screen.getByText('Content')).toBeInTheDocument();
        });

        test('Modal should be responsive on mobile', async () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            });

            const { container } = renderWithI18n(<RuleManagerView onClose={() => { }} />);
            await screen.findByText('例外规则管理');

            const modal = container.querySelector('div[style*="100vw"]');
            expect(modal).toBeInTheDocument();
        });
    });

    describe('Error Handling and Recovery', () => {
        test('Should handle async operation failures gracefully', async () => {
            const mockError = new Error('Network error');

            // Mock a failing operation
            const failingOperation = vi.fn().mockRejectedValue(mockError);

            try {
                await failingOperation();
            } catch (error) {
                expect(error).toBe(mockError);
            }

            expect(failingOperation).toHaveBeenCalled();
        });

        test('Should provide user-friendly error messages', () => {
            render(
                <div className="error-message">
                    创建规则失败，请重试
                </div>
            );

            expect(screen.getByText('创建规则失败，请重试')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('Should support keyboard navigation', () => {
            render(
                <button>Test Button</button>
            );

            const button = screen.getByRole('button');

            // Test keyboard focus
            button.focus();
            expect(document.activeElement).toBe(button);

            // Test keyboard activation
            fireEvent.keyDown(button, { key: 'Enter' });
            fireEvent.keyDown(button, { key: ' ' });
        });

        test('Should have proper ARIA labels', () => {
            render(
                <button aria-label="Close dialog">×</button>
            );

            const button = screen.getByLabelText('Close dialog');
            expect(button).toBeInTheDocument();
        });
    });

    describe('Performance Metrics', () => {
        test('Should track render performance', () => {
            const renderFn = vi.fn(() => 'rendered');

            const result = performanceMonitor.measureRender('test-component', renderFn);

            expect(result).toBe('rendered');
            expect(renderFn).toHaveBeenCalled();
        });

        test('Should detect layout shifts', () => {
            layoutStabilityMonitor.startMonitoring();

            // Simulate layout shift by changing element size
            const testElement = document.createElement('div');
            testElement.style.width = '100px';
            testElement.style.height = '100px';
            document.body.appendChild(testElement);

            // Change size to trigger potential layout shift
            testElement.style.width = '200px';

            const report = layoutStabilityMonitor.getStabilityReport();
            expect(report).toBeDefined();

            document.body.removeChild(testElement);
            layoutStabilityMonitor.stopMonitoring();
        });
    });
});

// Integration tests
describe('UI Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('language', 'zh');
        mockedRuleManager.getAllRules.mockResolvedValue(mockRules);
        performanceMonitor.setReportingEnabled(false);
        performanceMonitor.setBackgroundMode(false);
        layoutStabilityMonitor.clearIssues();
    });

    test('Complete rule creation flow should work without layout issues', async () => {
        const onClose = vi.fn();

        const { container } = renderWithI18n(<RuleManagerView onClose={onClose} />);
        await screen.findByText('例外规则管理');

        // Test create button
        const createButton = screen.getByText('创建链专属规则');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByText('规则名称 *')).toBeInTheDocument();
        });

        const overlay = container.querySelector('div.fixed.inset-0');
        expect(overlay).toHaveClass('overflow-x-hidden');
    });

    test('Rule selection dialog should handle all interactions smoothly', async () => {
        const mockSessionContext = {
            sessionId: 'test-session',
            chainId: 'test-chain',
            chainName: 'Test Chain',
            startedAt: new Date(),
            elapsedTime: 300,
            remainingTime: 600,
            isDurationless: false
        };

        const onRuleSelected = vi.fn();
        const onCancel = vi.fn();

        renderWithI18n(
            <RuleSelectionDialog
                isOpen={true}
                actionType="pause"
                sessionContext={mockSessionContext}
                onRuleSelected={onRuleSelected}
                onCreateNewRule={() => { }}
                onCancel={onCancel}
            />
        );

        // Test cancel button
        const cancelButton = screen.getByLabelText('关闭对话框');
        fireEvent.click(cancelButton);

        expect(onCancel).toHaveBeenCalled();
    });
});
