import type { Chain, RSIPNode, RSIPTaskLink } from '../../../types';
import {
  automationLabel,
  effectLabel,
  EFFECTS,
  eventLabel,
  EVENTS,
  type TaskLinkMode,
  type Tr,
} from './taskLinkUi';

export function RSIPTaskLinkForm(props: {
  mode: TaskLinkMode;
  nodes: RSIPNode[];
  fixedChainId?: string;
  chains: Chain[];
  selectedNodeId: string;
  onSelectedNodeIdChange: (id: string) => void;
  selectedChainId: string;
  onSelectedChainIdChange: (id: string) => void;
  triggerEvent: RSIPTaskLink['triggerEvent'];
  onTriggerEventChange: (event: RSIPTaskLink['triggerEvent']) => void;
  effect: RSIPTaskLink['effect'];
  onEffectChange: (effect: RSIPTaskLink['effect']) => void;
  automation: RSIPTaskLink['automation'];
  onAutomationChange: (automation: RSIPTaskLink['automation']) => void;
  canCreate: boolean;
  onCreate: () => void;
  tr: Tr;
}) {
  const selectClass =
    'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <select
        value={props.selectedNodeId}
        onChange={(event) => props.onSelectedNodeIdChange(event.target.value)}
        className={selectClass}
      >
        <option value="">
          {props.tr('选择 RSIP 节点', 'Select RSIP node')}
        </option>
        {props.nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.emoji ? `${node.emoji} ` : ''}
            {node.title}
          </option>
        ))}
      </select>
      {!props.fixedChainId && (
        <select
          value={props.selectedChainId}
          onChange={(event) =>
            props.onSelectedChainIdChange(event.target.value)
          }
          className={selectClass}
        >
          <option value="">
            {props.tr('选择任务/任务组', 'Select task/group')}
          </option>
          {props.chains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.type === 'group'
                ? props.tr('任务组', 'Group')
                : props.tr('任务', 'Task')}
              : {chain.name}
            </option>
          ))}
        </select>
      )}
      <select
        value={props.triggerEvent}
        onChange={(event) =>
          props.onTriggerEventChange(
            event.target.value as RSIPTaskLink['triggerEvent'],
          )
        }
        className={selectClass}
      >
        {EVENTS[props.mode].map((event) => (
          <option key={event} value={event}>
            {eventLabel(event, props.tr)} ({event})
          </option>
        ))}
      </select>
      <select
        value={props.effect}
        onChange={(event) =>
          props.onEffectChange(event.target.value as RSIPTaskLink['effect'])
        }
        className={selectClass}
      >
        {EFFECTS[props.mode].map((effect) => (
          <option key={effect} value={effect}>
            {effectLabel(effect, props.tr)} ({effect})
          </option>
        ))}
      </select>
      <select
        value={props.automation}
        onChange={(event) =>
          props.onAutomationChange(
            event.target.value as RSIPTaskLink['automation'],
          )
        }
        className={selectClass}
      >
        <option value="auto">{automationLabel('auto', props.tr)}</option>
        <option value="confirm">{automationLabel('confirm', props.tr)}</option>
      </select>
      <button
        type="button"
        disabled={!props.canCreate}
        onClick={props.onCreate}
        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${props.canCreate ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-500'}`}
      >
        {props.tr('新增联动', 'Add link')}
      </button>
    </div>
  );
}
