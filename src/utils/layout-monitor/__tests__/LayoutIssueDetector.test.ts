import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoggerMock = {
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

async function loadDetector(isDev: boolean) {
  vi.resetModules();

  const logger: LoggerMock = {
    warn: vi.fn(),
    debug: vi.fn(),
  };

  vi.doMock('../../env', () => ({ isDev }));
  vi.doMock('../../logger', () => ({ logger }));

  const module = await import('../LayoutIssueDetector');
  return {
    LayoutIssueDetector: module.LayoutIssueDetector,
    logger,
  };
}

function setDimensions(
  el: HTMLElement,
  clientWidth: number,
  scrollWidth: number,
) {
  Object.defineProperty(el, 'clientWidth', {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(el, 'scrollWidth', {
    configurable: true,
    value: scrollWidth,
  });
}

describe('LayoutIssueDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('records layout shifts and applies auto-fix for horizontal overflow', async () => {
    const { LayoutIssueDetector, logger } = await loadDetector(true);
    const detector = new LayoutIssueDetector(true);

    detector.handleLayoutShift({
      hadRecentInput: true,
      value: 0.5,
    } as LayoutShift);
    expect(detector.getStabilityReport().totalIssues).toBe(0);

    detector.handleLayoutShift({
      hadRecentInput: false,
      value: 0.3,
    } as LayoutShift);

    const report = detector.getStabilityReport();
    expect(report.totalIssues).toBe(1);
    expect(report.cumulativeLayoutShift).toBeCloseTo(0.3);
    expect(report.issuesBySeverity.high).toBe(1);
    expect(document.body.style.overflowX).toBe('');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('detects overflow and unstable widths during initial check', async () => {
    const { LayoutIssueDetector } = await loadDetector(false);
    const detector = new LayoutIssueDetector(false);

    const container = document.createElement('div');
    const child = document.createElement('div');
    container.appendChild(child);
    document.body.appendChild(container);

    setDimensions(container, 200, 260);
    setDimensions(child, 100, 140);

    const styleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(() => {
        return {
          width: 'auto',
          flexGrow: '1',
          position: 'static',
        } as CSSStyleDeclaration;
      });

    detector.performInitialCheck(container);
    const report = detector.getStabilityReport();

    expect(report.totalIssues).toBeGreaterThanOrEqual(1);
    expect(report.issuesByType['horizontal-overflow']).toBeGreaterThan(0);

    styleSpy.mockRestore();
  });

  it('applies stability fixes to common containers', async () => {
    const { LayoutIssueDetector } = await loadDetector(false);
    const detector = new LayoutIssueDetector();

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rule-item"></div>
      <div class="rule-list"></div>
      <div class="tooltip"></div>
      <div data-scroll-container="true"></div>
      <div data-popover="true"></div>
      <div data-dynamic-content="true"></div>
    `;

    document.body.appendChild(container);

    const styleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(() => {
        return {
          position: 'static',
          width: 'auto',
          flexGrow: '0',
        } as CSSStyleDeclaration;
      });

    detector.applyStabilityFixes(container);

    const ruleItem = container.querySelector('.rule-item') as HTMLElement;
    const ruleList = container.querySelector('.rule-list') as HTMLElement;
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    const scrollContainer = container.querySelector(
      '[data-scroll-container]',
    ) as HTMLElement;
    const dynamicContainer = container.querySelector(
      '[data-dynamic-content]',
    ) as HTMLElement;

    expect(ruleItem.style.minHeight).toBe('60px');
    expect(ruleList.style.maxHeight).toBe('400px');
    expect(tooltip.style.position).toBe('absolute');
    expect(scrollContainer.style.overflowY).toBe('auto');
    expect(dynamicContainer.style.contain).toBe('layout style');

    styleSpy.mockRestore();
  });

  it('logs empty/non-empty issue reports', async () => {
    const { LayoutIssueDetector, logger } = await loadDetector(true);
    const detector = new LayoutIssueDetector(false);

    detector.reportIssues();
    expect(logger.debug).toHaveBeenCalledTimes(1);

    const container = document.createElement('div');
    setDimensions(container, 100, 140);
    detector.checkHorizontalOverflow(container);

    detector.reportIssues();
    expect(logger.debug).toHaveBeenCalledTimes(2);
  });
});
