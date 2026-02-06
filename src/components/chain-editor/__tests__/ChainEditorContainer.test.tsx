import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChainEditor } from '../ChainEditorContainer';

const useChainEditorFormMock = vi.hoisted(() => vi.fn());
const useMobileOptimizationMock = vi.hoisted(() => vi.fn());
const useTouchOptimizationMock = vi.hoisted(() => vi.fn());
const useVirtualKeyboardAdaptationMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useChainEditorForm', () => ({
  useChainEditorForm: useChainEditorFormMock,
}));

vi.mock('../../../hooks/useMobileOptimization', () => ({
  useMobileOptimization: useMobileOptimizationMock,
  useTouchOptimization: useTouchOptimizationMock,
  useVirtualKeyboardAdaptation: useVirtualKeyboardAdaptationMock,
}));

vi.mock('../ChainEditorView', () => ({
  ChainEditorView: (props: {
    onCancel: () => void;
    keyboardHeight: number;
    isKeyboardVisible: boolean;
  }) => (
    <div>
      <div data-testid="keyboard-height">{props.keyboardHeight}</div>
      <div data-testid="keyboard-visible">{String(props.isKeyboardVisible)}</div>
      <button onClick={props.onCancel}>cancel</button>
    </div>
  ),
}));

describe('ChainEditorContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChainEditorFormMock.mockReturnValue({ draft: { name: 'Chain A' } });
    useMobileOptimizationMock.mockReturnValue({ isMobile: true });
    useVirtualKeyboardAdaptationMock.mockReturnValue({
      keyboardHeight: 220,
      isKeyboardVisible: true,
    });
  });

  it('provides form and device adapters to view and wires cancel action', () => {
    const onCancel = vi.fn();
    render(
      <ChainEditor
        isEditing={false}
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    );

    expect(useChainEditorFormMock).toHaveBeenCalledWith({
      chain: undefined,
      isEditing: false,
      initialParentId: undefined,
      onSave: expect.any(Function),
    });
    expect(useTouchOptimizationMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('keyboard-height').textContent).toBe('220');
    expect(screen.getByTestId('keyboard-visible').textContent).toBe('true');

    fireEvent.click(screen.getByText('cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
