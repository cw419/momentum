import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n';
import { createUnitChain } from '../../../test/factories';
import type { RSIPNode, RSIPTaskLink } from '../../../types';
import { RSIPTaskLinkPanel } from '../RSIPTaskLinkPanel';

const node: RSIPNode = {
  id: 'node-1',
  title: 'Policy',
  rule: 'Do it',
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
const chain = createUnitChain({ id: 'chain-1', name: 'Task' });

function renderPanel(
  props: Partial<React.ComponentProps<typeof RSIPTaskLinkPanel>> = {},
) {
  const onUpsertLinks = props.onUpsertLinks ?? vi.fn();
  render(
    <I18nProvider>
      <RSIPTaskLinkPanel
        links={[]}
        nodes={[node]}
        chains={[chain]}
        onUpsertLinks={onUpsertLinks}
        {...props}
      />
    </I18nProvider>,
  );
  return onUpsertLinks;
}

describe('RSIPTaskLinkPanel', () => {
  it('creates a task-to-RSIP link from the editor selections', () => {
    const onUpsertLinks = renderPanel();
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: node.id } });
    fireEvent.change(selects[1], { target: { value: chain.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));

    expect(onUpsertLinks).toHaveBeenCalledWith([
      expect.objectContaining({
        rsipNodeId: node.id,
        chainId: chain.id,
        chainKind: 'unit',
        triggerEvent: 'task_completed',
        effect: 'mark_rsip_executed',
        isActive: true,
      }),
    ]);
  });

  it('toggles and deletes existing links while fixed to a chain', () => {
    const link: RSIPTaskLink = {
      id: 'link-1',
      rsipNodeId: node.id,
      chainId: chain.id,
      chainKind: 'unit',
      triggerEvent: 'task_completed',
      effect: 'mark_rsip_executed',
      automation: 'auto',
      isActive: true,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const onUpsertLinks = vi.fn();
    renderPanel({ links: [link], fixedChainId: chain.id, onUpsertLinks });
    expect(screen.getAllByRole('combobox')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Enabled' }));
    expect(onUpsertLinks).toHaveBeenCalledWith([
      expect.objectContaining({ id: link.id, isActive: false }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onUpsertLinks).toHaveBeenLastCalledWith([]);
  });
});
