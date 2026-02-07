import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFocusTrap } from '../useFocusTrap';

function FocusTrapFixture({ active }: { active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div>
      <button type="button" data-testid="outside">
        outside
      </button>
      <div ref={ref}>
        <button type="button" data-testid="first">
          first
        </button>
        <button type="button" data-testid="last">
          last
        </button>
      </div>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus into the trap and loops tab navigation', () => {
    const { getByTestId } = render(<FocusTrapFixture active={true} />);
    const first = getByTestId('first');
    const last = getByTestId('last');

    expect(first).toHaveFocus();

    (last as HTMLButtonElement).focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(first).toHaveFocus();

    (first as HTMLButtonElement).focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(last).toHaveFocus();
  });

  it('restores previous focus on cleanup', () => {
    const { unmount, getByTestId } = render(<FocusTrapFixture active={true} />);
    const outside = getByTestId('outside');
    (outside as HTMLButtonElement).focus();

    const { unmount: unmountTrap } = render(<FocusTrapFixture active={true} />);
    unmountTrap();

    expect(outside).toHaveFocus();
    unmount();
  });

  it('does nothing when inactive', () => {
    const { getByTestId } = render(<FocusTrapFixture active={false} />);
    const outside = getByTestId('outside');
    (outside as HTMLButtonElement).focus();
    expect(outside).toHaveFocus();
  });
});
