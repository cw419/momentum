import { lazy } from 'react';
import { lazyWithChunkRecovery } from '../../utils/lazyWithChunkRecovery';

export const RSIPView = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/RSIPView').then((m) => ({
        default: m.RSIPView,
      })),
    'RSIPView',
  ),
);

export const ChainEditor = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/ChainEditor').then((m) => ({
        default: m.ChainEditor,
      })),
    'ChainEditor',
  ),
);

export const FocusMode = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/FocusMode').then((m) => ({
        default: m.FocusMode,
      })),
    'FocusMode',
  ),
);

export const ChainDetail = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/ChainDetail').then((m) => ({
        default: m.ChainDetail,
      })),
    'ChainDetail',
  ),
);

export const GroupView = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/GroupView').then((m) => ({
        default: m.GroupView,
      })),
    'GroupView',
  ),
);

export const TaskGroupEditor = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/TaskGroupEditor').then((m) => ({
        default: m.TaskGroupEditor,
      })),
    'TaskGroupEditor',
  ),
);

export const AuxiliaryJudgment = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/AuxiliaryJudgment').then((m) => ({
        default: m.AuxiliaryJudgment,
      })),
    'AuxiliaryJudgment',
  ),
);

export const BettingModal = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/BettingModal').then((m) => ({
        default: m.BettingModal,
      })),
    'BettingModal',
  ),
);

export const PetWidget = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../../components/pet/PetWidget').then((m) => ({
        default: m.PetWidget,
      })),
    'PetWidget',
  ),
);
