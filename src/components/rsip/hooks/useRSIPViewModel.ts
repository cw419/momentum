import type { RSIPViewProps } from '../../RSIPView.types';
import { useRSIPViewCreationActions } from './useRSIPViewCreationActions';
import { useRSIPViewInteractionActions } from './useRSIPViewInteractionActions';
import { useRSIPViewState } from './useRSIPViewState';
import type { RSIPViewModel } from './useRSIPViewModel.types';

export type { RSIPViewModel } from './useRSIPViewModel.types';

export function useRSIPViewModel(props: RSIPViewProps): RSIPViewModel {
  const state = useRSIPViewState(props);
  const creationActions = useRSIPViewCreationActions({
    state,
    props,
  });
  const interactionActions = useRSIPViewInteractionActions({
    state,
    props,
  });

  return {
    ...state,
    ...creationActions,
    ...interactionActions,
    onSaveGroups: props.onSaveGroups ?? (async () => undefined),
  };
}
