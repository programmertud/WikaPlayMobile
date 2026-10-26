/**
 * OfflineStatusBanner
 *
 * Child-friendly status indicator for WikaPlay.
 * Shows:
 *   - Offline badge (red) when API is unreachable
 *   - Syncing indicator (blue/spinning text) during sync
 *   - Pending count badge when results are waiting to sync
 *   - Success flash (green) after sync completes
 *   - Tap to retry when sync failed
 *
 * Designed to be compact and non-intrusive.
 * Does NOT block gameplay or show a modal.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SyncState } from '../services/offline/sync-service';

interface Props {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncTime: Date | null;
  onRetry?: () => void;
  compact?: boolean; // Show only icon, no label text
}

export function OfflineStatusBanner({
  isOnline,
  syncState,
  pendingCount,
  lastSyncTime,
  onRetry,
  compact = false,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, syncState]);

  // Pulse animation for syncing state
  useEffect(() => {
    if (syncState === 'syncing') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [syncState]);

  // Nothing to show when online, synced, and no pending
  if (isOnline && syncState !== 'syncing' && syncState !== 'failed' && pendingCount === 0) {
    return null;
  }

  const config = getBannerConfig(isOnline, syncState, pendingCount);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={10} color={config.textColor} />
        {pendingCount > 0 && (
          <Text style={[styles.compactCount, { color: config.textColor }]}>{pendingCount}</Text>
        )}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.banner, { backgroundColor: config.bgColor, opacity: fadeAnim }]}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Ionicons name={config.icon as any} size={14} color={config.textColor} />
      </Animated.View>
      <Text style={[styles.bannerText, { color: config.textColor }]} numberOfLines={1}>
        {config.label}
      </Text>
      {config.showRetry && onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={[styles.retryText, { color: config.textColor }]}>Subukan Ulit</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

interface BannerConfig {
  bgColor: string;
  textColor: string;
  icon: string;
  label: string;
  showRetry: boolean;
}

function getBannerConfig(
  isOnline: boolean,
  syncState: SyncState,
  pendingCount: number
): BannerConfig {
  if (!isOnline) {
    return {
      bgColor: '#FEF2F2',
      textColor: '#B91C1C',
      icon: 'cloud-offline-outline',
      label: pendingCount > 0
        ? `Walang koneksyon — ${pendingCount} resulta naghihintay`
        : 'Walang koneksyon sa internet',
      showRetry: false,
    };
  }

  if (syncState === 'syncing') {
    return {
      bgColor: '#EFF6FF',
      textColor: '#1D4ED8',
      icon: 'sync-outline',
      label: `Nag-i-sync ng ${pendingCount} resulta...`,
      showRetry: false,
    };
  }

  if (syncState === 'failed') {
    return {
      bgColor: '#FFF7ED',
      textColor: '#C2410C',
      icon: 'warning-outline',
      label: `Hindi na-sync ang ${pendingCount} resulta`,
      showRetry: true,
    };
  }

  if (pendingCount > 0) {
    return {
      bgColor: '#F0FDF4',
      textColor: '#15803D',
      icon: 'hourglass-outline',
      label: `${pendingCount} resulta naghihintay na ma-sync`,
      showRetry: false,
    };
  }

  return {
    bgColor: '#F0FDF4',
    textColor: '#15803D',
    icon: 'checkmark-circle-outline',
    label: 'Lahat ng resulta na-sync!',
    showRetry: false,
  };
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  retryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactCount: {
    fontSize: 9,
    fontWeight: '800',
  },
});
