import { lazy } from 'react';

export const RSIPView = lazy(() =>
  import('../../components/RSIPView').then((m) => ({ default: m.RSIPView })),
);

export const ChainEditor = lazy(() =>
  import('../../components/ChainEditor').then((m) => ({
    default: m.ChainEditor,
  })),
);

export const FocusMode = lazy(() =>
  import('../../components/FocusMode').then((m) => ({ default: m.FocusMode })),
);

export const ChainDetail = lazy(() =>
  import('../../components/ChainDetail').then((m) => ({
    default: m.ChainDetail,
  })),
);

export const GroupView = lazy(() =>
  import('../../components/GroupView').then((m) => ({ default: m.GroupView })),
);

export const TaskGroupEditor = lazy(() =>
  import('../../components/TaskGroupEditor').then((m) => ({
    default: m.TaskGroupEditor,
  })),
);

export const AuxiliaryJudgment = lazy(() =>
  import('../../components/AuxiliaryJudgment').then((m) => ({
    default: m.AuxiliaryJudgment,
  })),
);

export const BettingModal = lazy(() =>
  import('../../components/BettingModal').then((m) => ({
    default: m.BettingModal,
  })),
);

export const PetWidget = lazy(() =>
  import('../../components/pet/PetWidget').then((m) => ({
    default: m.PetWidget,
  })),
);
