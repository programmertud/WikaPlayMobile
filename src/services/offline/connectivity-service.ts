/**
 * WikaPlay Connectivity Service
 *
 * Detects network availability and actual API reachability.
 * IMPORTANT: A device can report "connected" but the API may be unreachable
 * (school Wi-Fi, captive portals, VPN, etc.). We distinguish between:
 *   - isNetworkAvailable: device has network interface up
 *   - isApiReachable: our backend responded to a health check recently
 */
import * as Network from 'expo-network';

const API_HEALTH_TIMEOUT_MS = 5000;
const MIN_RECHECK_INTERVAL_MS = 10_000; // Don't hammer the server

let _lastHealthCheckTime = 0;
let _lastHealthCheckResult = false;
let _healthCheckUrl: string | null = null;
let _listeners: Array<(reachable: boolean) => void> = [];

/**
 * Set the API base URL to use for health checks.
 * Call this after ApiClient.init().
 */
export function setHealthCheckUrl(baseUrl: string): void {
  _healthCheckUrl = `${baseUrl.replace(/\/+$/, '')}/health`;
}

/**
 * Check if the device has an active network connection (not necessarily internet).
 */
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

/**
 * Check actual API reachability with a lightweight health check.
 * Caches result for MIN_RECHECK_INTERVAL_MS to avoid repeated requests.
 */
export async function checkApiReachability(forceRefresh = false): Promise<boolean> {
  if (!_healthCheckUrl) return false;

  const now = Date.now();
  if (!forceRefresh && now - _lastHealthCheckTime < MIN_RECHECK_INTERVAL_MS) {
    return _lastHealthCheckResult;
  }

  const networkOk = await isNetworkAvailable();
  if (!networkOk) {
    _lastHealthCheckResult = false;
    _lastHealthCheckTime = now;
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_HEALTH_TIMEOUT_MS);

    const response = await fetch(_healthCheckUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);
    const reachable = response.ok;
    _lastHealthCheckResult = reachable;
    _lastHealthCheckTime = now;

    // Notify listeners of connectivity change
    _listeners.forEach((fn) => {
      try { fn(reachable); } catch {}
    });

    return reachable;
  } catch {
    _lastHealthCheckResult = false;
    _lastHealthCheckTime = now;
    return false;
  }
}

/**
 * Subscribe to API reachability changes.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(listener: (reachable: boolean) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

/**
 * Get the cached reachability state without making a new request.
 */
export function getCachedReachability(): boolean {
  return _lastHealthCheckResult;
}

/**
 * Invalidate the cache so the next call to checkApiReachability does a fresh check.
 */
export function invalidateReachabilityCache(): void {
  _lastHealthCheckTime = 0;
}
