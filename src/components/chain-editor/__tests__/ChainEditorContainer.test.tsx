import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChainEditor } from '../ChainEditorContainer';

const useChainEditorFormMock = vi.hoisted(() => vi.fn());
const useVirtualKeyboardMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useChainEditorForm', () => ({
  useChainEditorForm: useChainEditorFormMock,
}));

vi.mock('../../../hooks/useVirtualKeyboard', () => ({
  useVirtualKeyboard: useVirtualKeyboardMock,
}));

vi.mock('../ChainEditorView', () => ({
  ChainEditorView: (props: {
    onCancel: () => void;
    keyboardHeight: number;
  }) => (
    <div>
      <div data-testid="keyboard-height">{props.keyboardHeight}</div>
      <button onClick={props.onCancel}>cancel</button>
    </div>
  ),
}));

describe('ChainEditorContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChainEditorFormMock.mockReturnValue({ draft: { name: 'Chain A' } });
    useVirtualKeyboardMock.mockReturnValue({
      keyboardHeight: 220,
      isKeyboardVisible: true,
    });
  });

  it('provides form and keyboard state to view and wires cancel action', () => {
    const onCancel = vi.fn();
    render(
      <ChainEditor isEditing={false} onSave={vi.fn()} onCancel={onCancel} />,
    );

    expect(useChainEditorFormMock).toHaveBeenCalledWith({
      chain: undefined,
      isEditing: false,
      initialParentId: undefined,
      onSave: expect.any(Function),
    });
    expect(useVirtualKeyboardMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('keyboard-height').textContent).toBe('220');

    fireEvent.click(screen.getByText('cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
