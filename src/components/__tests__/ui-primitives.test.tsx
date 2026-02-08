import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Portal } from '../Portal';
import { IconButton } from '../IconButton';
import { BackButton } from '../BackButton';
import { Switch } from '../Switch';

describe('UI primitives', () => {
  describe('IconButton', () => {
    it('applies aria label, default type and classes', () => {
      render(
        <IconButton label="Settings" className="custom-class">
          <span>icon</span>
        </IconButton>,
      );

      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveClass('focus-ring');
      expect(button).toHaveClass('custom-class');
    });

    it('respects provided type and click handler', () => {
      const onClick = vi.fn();
      render(
        <IconButton label="Submit" type="submit" onClick={onClick}>
          <span>icon</span>
        </IconButton>,
      );

      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).toHaveAttribute('type', 'submit');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('BackButton', () => {
    it('renders icon button and forwards click', () => {
      const onClick = vi.fn();
      render(<BackButton label="Go back" onClick={onClick} />);

      const button = screen.getByRole('button', { name: 'Go back' });
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
      const icon = button.querySelector('svg');
      expect(icon).toHaveAttribute('width', '24');
    });

    it('uses custom icon size when provided', () => {
      render(<BackButton label="Back" iconSize={16} />);
      const button = screen.getByRole('button', { name: 'Back' });
      const icon = button.querySelector('svg');
      expect(icon).toHaveAttribute('width', '16');
    });
  });

  describe('Switch', () => {
    it('toggles checked state through callback', () => {
      const onCheckedChange = vi.fn();
      render(
        <Switch
          checked={false}
          onCheckedChange={onCheckedChange}
          aria-label="Desktop notifications"
        />,
      );

      const switchButton = screen.getByRole('switch', {
        name: 'Desktop notifications',
      });
      expect(switchButton).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchButton);
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('disables interaction when disabled or loading', () => {
      const onCheckedChange = vi.fn();
      const { rerender } = render(
        <Switch
          checked
          disabled
          onCheckedChange={onCheckedChange}
          aria-label="Toggle"
        />,
      );

      const switchButton = screen.getByRole('switch', { name: 'Toggle' });
      expect(switchButton).toBeDisabled();
      fireEvent.click(switchButton);
      expect(onCheckedChange).not.toHaveBeenCalled();

      rerender(
        <Switch
          checked
          loading
          onCheckedChange={onCheckedChange}
          aria-label="Toggle"
        />,
      );

      expect(screen.getByRole('switch', { name: 'Toggle' })).toBeDisabled();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('uses danger variant classes when enabled', () => {
      render(
        <Switch
          checked
          variant="danger"
          onCheckedChange={() => undefined}
          aria-label="Danger switch"
        />,
      );

      const switchButton = screen.getByRole('switch', {
        name: 'Danger switch',
      });
      expect(switchButton.className).toContain('from-red-500');
    });
  });

  describe('Portal', () => {
    it('renders content into document.body', () => {
      render(
        <Portal>
          <div data-testid="portal-child">portal content</div>
        </Portal>,
      );

      const child = screen.getByTestId('portal-child');
      expect(child).toBeInTheDocument();
      expect(child.parentElement).toBe(document.body);
    });
  });
});
