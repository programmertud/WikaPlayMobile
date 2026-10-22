/**
 * Web-safe haptics utility.
 *
 * expo-haptics internally calls navigator.vibrate() which Chrome blocks
 * until there has been a user gesture on the frame.  On web the warning
 * "[Intervention] Blocked call to navigator.vibrate" will fire for any
 * haptic triggered before the first tap (e.g. on mount), and on some
 * devices the API is simply absent.
 *
 * This module is a no-op on web and delegates to expo-haptics on native.
 */

import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

const isNative = Platform.OS !== 'web';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light
): Promise<void> {
  if (!isNative) return Promise.resolve();
  return ExpoHaptics.impactAsync(style).catch(() => {});
}

export function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success
): Promise<void> {
  if (!isNative) return Promise.resolve();
  return ExpoHaptics.notificationAsync(type).catch(() => {});
}

export function selectionAsync(): Promise<void> {
  if (!isNative) return Promise.resolve();
  return ExpoHaptics.selectionAsync().catch(() => {});
}
