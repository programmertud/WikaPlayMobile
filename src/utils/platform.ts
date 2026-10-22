/**
 * Platform-specific animation helpers.
 *
 * useNativeDriver: true is unsupported on web (the RCTAnimation native module
 * is absent in the web bundle).  Setting this constant to false on web
 * silences the "Falling back to JS-based animation" warning without any
 * visual difference.
 */
import { Platform } from 'react-native';

/** Pass directly as the `useNativeDriver` option in Animated calls. */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
