import { useEffect, useState } from 'react';
import {
  systemNotificationService,
  type SystemNotificationState,
} from '../services/platform/SystemNotificationService';

export function useSystemNotificationState(): SystemNotificationState {
  const [state, setState] = useState<SystemNotificationState>(
    systemNotificationService.getState(),
  );

  useEffect(() => {
    const unsubscribe = systemNotificationService.subscribe(setState);
    void systemNotificationService.init();
    return unsubscribe;
  }, []);

  return state;
}

