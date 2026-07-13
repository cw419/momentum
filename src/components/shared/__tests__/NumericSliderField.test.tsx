import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumericSliderField } from '../NumericSliderField';

const defaultProps = {
  id: 'duration',
  label: 'Duration',
  description: 'Choose a duration',
  value: 25,
  onChange: vi.fn(),
  min: 1,
  max: 300,
  unit: 'min',
  formatValue: (value: number) => `${value} minutes`,
};

describe('NumericSliderField', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('connects labels, limits, and formatted value text', () => {
    render(<NumericSliderField {...defaultProps} />);

    const slider = screen.getByRole('slider', { name: 'Duration' });
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '300');
    expect(slider).toHaveAttribute('aria-valuetext', '25 minutes');
    expect(slider).toHaveAccessibleDescription('Choose a duration');
    expect(screen.getByText('min')).toBeInTheDocument();
  });

  it('handles native range changes and controlled updates', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <NumericSliderField {...defaultProps} onChange={onChange} />,
    );
    const slider = screen.getByRole('slider', { name: 'Duration' });

    fireEvent.change(slider, { target: { value: '90' } });
    expect(onChange).toHaveBeenCalledWith(90);
    expect(slider).toHaveValue('90');

    rerender(
      <NumericSliderField {...defaultProps} value={120} onChange={onChange} />,
    );
    expect(slider).toHaveValue('120');
  });

  it('supports keyboard number input and clamps limits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumericSliderField {...defaultProps} onChange={onChange} />);
    const numberInput = screen.getByRole('spinbutton');

    await user.clear(numberInput);
    await user.type(numberInput, '999');

    expect(onChange).toHaveBeenLastCalledWith(300);
    expect(numberInput).toHaveValue(300);
  });

  it('debounces rapid changes and keeps only the latest value', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <NumericSliderField
        {...defaultProps}
        onChange={onChange}
        debounceMs={200}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Duration' });

    fireEvent.change(slider, { target: { value: '60' } });
    fireEvent.change(slider, { target: { value: '80' } });
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(80);
  });
});
