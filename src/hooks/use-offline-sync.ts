/**
 * useOfflineSync — React hook for offline sync state
 *
 * Provides:
 * - isOnline: whether the API is currently reachable
 * - syncState: idle | syncing | complete | failed
 * - pendingCount: number of results waiting to sync
 * - lastSyncTime: when last successful sync occurred
 * - triggerSync: manually kick off synchronization
 *
 * Automatically triggers sync on mount and when connectivity is restored.
 * Polls connectivity every 30 seconds while the app is in foreground.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  checkApiReachability,
  onConnectivityChange,
  invalidateReachabilityCache,
} from '../services/offline/connectivity-service';
import {
  syncPendingSessions,
  onSyncStateChange,
  getSyncState,
  getPendingCount,
  getLastSyncTime,
  refreshPendingCount,
  SyncState,
} from '../services/offline/sync-service';

const POLL_INTERVAL_MS = 30_000;

export function useOfflineSync(studentId: number | null) {
  const [isOnline, setIsOnline] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(getSyncState);
  const [pendingCount, setPendingCount] = useState(getPendingCount);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(getLastSyncTime);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) ?? 'active');

  const triggerSync = useCallback(async () => {
    if (!studentId) return;
    invalidateReachabilityCache();
    const reachable = await checkApiReachability(true);
    setIsOnline(reachable);
    if (reachable) {
      await syncPendingSessions(studentId);
      setLastSyncTime(getLastSyncTime());
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    // Subscribe to sync state changes
    const unsubSync = onSyncStateChange((state, count) => {
      setSyncState(state);
      setPendingCount(count);
      if (state === 'complete') {
        setLastSyncTime(new Date());
      }
    });

    // Subscribe to connectivity changes from the connectivity service
    const unsubConnectivity = onConnectivityChange((reachable) => {
      setIsOnline(reachable);
      if (reachable) {
        syncPendingSessions(studentId).catch(console.warn);
      }
    });

    // Initial check
    const init = async () => {
      const reachable = await checkApiReachability();
      setIsOnline(reachable);
      const count = await refreshPendingCount(studentId);
      setPendingCount(count);
      if (reachable && count > 0) {
        syncPendingSessions(studentId).catch(console.warn);
      }
    };
    init();

    // Poll every 30s while foregrounded
    pollRef.current = setInterval(async () => {
      const reachable = await checkApiReachability();
      setIsOnline(reachable);
      if (reachable) {
        syncPendingSessions(studentId).catch(console.warn);
      }
    }, POLL_INTERVAL_MS);

    // Resume on app foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        invalidateReachabilityCache();
        triggerSync();
      }
      appStateRef.current = nextState;
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      unsubSync();
      unsubConnectivity();
      sub.remove();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [studentId, triggerSync]);

  return {
    isOnline,
    syncState,
    pendingCount,
    lastSyncTime,
    triggerSync,
  };
}
