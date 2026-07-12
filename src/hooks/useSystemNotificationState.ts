import { useEffect, useState } from 'react';
import {
  systemNotificationService,
  type SystemNotificationState,
} from '../services/platform/SystemNotificationService';
import { fireAndForget } from '../utils/fireAndForget';

export function useSystemNotificationState(): SystemNotificationState {
  const [state, setState] = useState<SystemNotificationState>(
    systemNotificationService.getState(),
  );

  useEffect(() => {
    const unsubscribe = systemNotificationService.subscribe(setState);
    fireAndForget(systemNotificationService.init(), {
      label: 'system-notification-initialization',
    });
    return unsubscribe;
  }, []);

  return state;
}
