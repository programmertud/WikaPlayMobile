import { useEffect, useRef } from 'react';
import { presenceService } from '../services/api';
import { useAuth } from './use-auth';

export function usePresence(activity: string = 'Nag-aaral', screenName: string = 'dashboard') {
  const { user, isStudent } = useAuth();
  const activityRef = useRef(activity);
  const screenRef = useRef(screenName);

  activityRef.current = activity;
  screenRef.current = screenName;

  useEffect(() => {
    if (!user || !isStudent) return;

    // Send initial heartbeat
    presenceService.heartbeat({
      activity: activityRef.current,
      screen: screenRef.current,
    }).catch(() => {});

    // Recurring heartbeat every 25 seconds
    const interval = setInterval(() => {
      presenceService.heartbeat({
        activity: activityRef.current,
        screen: screenRef.current,
      }).catch(() => {});
    }, 25000);

    return () => clearInterval(interval);
  }, [user, isStudent]);
}
