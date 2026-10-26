import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bgm } from '../services/audio/bgm-service';
import { Colors, Radius, Shadows, Typography } from '../theme';
import * as Haptics from '../utils/haptics';

interface VolumeButtonProps {
  /** Optional tint color for the icon when active/unmuted */
  activeColor?: string;
  /** Optional size for the button container */
  size?: number;
}

/**
 * Visual Equalizer Bars showing BGM playback status
 */
function SoundEqualizer({ isMuted, volume }: { isMuted: boolean; volume: number }) {
  const anim1 = useRef(new Animated.Value(6)).current;
  const anim2 = useRef(new Animated.Value(14)).current;
  const anim3 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (isMuted || volume === 0) {
      anim1.setValue(4);
      anim2.setValue(4);
      anim3.setValue(4);
      return;
    }

    const createLoop = (anim: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const l1 = createLoop(anim1, 5, 18, 380);
    const l2 = createLoop(anim2, 6, 22, 460);
    const l3 = createLoop(anim3, 4, 16, 320);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [isMuted, volume, anim1, anim2, anim3]);

  return (
    <View style={styles.eqRow}>
      <Animated.View
        style={[
          styles.eqBar,
          { height: anim1, backgroundColor: isMuted || volume === 0 ? '#CBD5E1' : Colors.vibrantPurple },
        ]}
      />
      <Animated.View
        style={[
          styles.eqBar,
          { height: anim2, backgroundColor: isMuted || volume === 0 ? '#CBD5E1' : Colors.skyBlueDark },
        ]}
      />
      <Animated.View
        style={[
          styles.eqBar,
          { height: anim3, backgroundColor: isMuted || volume === 0 ? '#CBD5E1' : Colors.grassGreenDark },
        ]}
      />
    </View>
  );
}

interface VolumeControlContentProps {
  accentColor?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Reusable volume controls containing slider, +/- buttons, presets, and mute toggle
 */
export function VolumeControlContent({
  accentColor = Colors.vibrantPurple,
  onClose,
  showCloseButton = true,
}: VolumeControlContentProps) {
  const [isMuted, setIsMuted] = useState<boolean>(bgm.getMuted());
  const [userVolume, setUserVolume] = useState<number>(bgm.getUserVolume());
  const [trackWidth, setTrackWidth] = useState<number>(220);

  useEffect(() => {
    const unsubMute = bgm.subscribeMute((muted) => setIsMuted(muted));
    const unsubVol = bgm.subscribeVolume((vol) => setUserVolume(vol));
    return () => {
      unsubMute();
      unsubVol();
    };
  }, []);

  const handleSetVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    Haptics.selectionAsync().catch(() => {});
    bgm.setUserVolume(clamped);
  };

  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bgm.toggleMute();
  };

  const stepVolume = (delta: number) => {
    const next = Math.max(0, Math.min(1, Math.round((userVolume + delta) * 100) / 100));
    handleSetVolume(next);
  };

  const volumePct = Math.round(userVolume * 100);

  const handleTrackTouch = (evt: GestureResponderEvent) => {
    const x = evt.nativeEvent.locationX;
    if (trackWidth > 0) {
      const vol = Math.max(0, Math.min(1, x / trackWidth));
      handleSetVolume(vol);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleTrackTouch(evt);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleTrackTouch(evt);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <View style={styles.controlBox}>
      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.musicBadge, { backgroundColor: accentColor + '18' }]}>
            <Ionicons name="musical-notes" size={18} color={accentColor} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lakas ng Musika (BGM)</Text>
            <Text style={styles.trackSubtitle}>Tugtog: happy.mp3 🎶</Text>
          </View>
        </View>
        {showCloseButton && onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Isara ang pagsasaayos ng tunog"
          >
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Primary Mute / Unmute State Card */}
      <TouchableOpacity
        style={[
          styles.muteCard,
          isMuted ? styles.muteCardActive : styles.unmuteCardActive,
        ]}
        onPress={handleToggleMute}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'I-on ang background music' : 'I-mute ang background music'}
      >
        <View style={styles.muteCardLeft}>
          <View
            style={[
              styles.muteIconCircle,
              { backgroundColor: isMuted ? '#FEE2E2' : '#DCFCE7' },
            ]}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={22}
              color={isMuted ? Colors.coralPink : Colors.grassGreenDark}
            />
          </View>
          <View>
            <Text style={styles.muteCardTitle}>
              {isMuted ? 'Naka-mute ang Musika' : 'Tumutugtog ang Musika'}
            </Text>
            <Text style={styles.muteCardSub}>
              {isMuted ? 'Pindutin upang marinig muli' : 'Pindutin upang i-mute'}
            </Text>
          </View>
        </View>

        <SoundEqualizer isMuted={isMuted} volume={userVolume} />
      </TouchableOpacity>

      {/* Volume Percentage Display */}
      <View style={styles.volumeDisplayRow}>
        <Text style={styles.volumePctLabel}>Antas ng Tunog:</Text>
        <Text
          style={[
            styles.volumePctValue,
            { color: isMuted ? Colors.textMuted : accentColor },
          ]}
        >
          {isMuted ? '0% (Mute)' : `${volumePct}%`}
        </Text>
      </View>

      {/* Interactive Slider Bar with Step Buttons */}
      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => stepVolume(-0.1)}
          disabled={userVolume <= 0}
          accessibilityLabel="Bawasan ang volume ng 10%"
        >
          <Ionicons
            name="remove"
            size={18}
            color={userVolume <= 0 ? Colors.border : Colors.text}
          />
        </TouchableOpacity>

        <View
          style={styles.trackWrapper}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View style={styles.trackBg} pointerEvents="none">
            <View
              style={[
                styles.trackFill,
                {
                  width: `${isMuted ? 0 : volumePct}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>

          {/* Draggable / Positioned Thumb */}
          <View
            style={[
              styles.thumb,
              {
                left: `${isMuted ? 0 : volumePct}%`,
                backgroundColor: accentColor,
              },
            ]}
            pointerEvents="none"
          />
        </View>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => stepVolume(0.1)}
          disabled={userVolume >= 1}
          accessibilityLabel="Dagdagan ang volume ng 10%"
        >
          <Ionicons
            name="add"
            size={18}
            color={userVolume >= 1 ? Colors.border : Colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Volume Preset Pills */}
      <View style={styles.presetsRow}>
        {[
          { label: '🔇 0%', vol: 0 },
          { label: '25%', vol: 0.25 },
          { label: '50%', vol: 0.5 },
          { label: '75%', vol: 0.75 },
          { label: '100%', vol: 1.0 },
        ].map((preset) => {
          const isActive =
            !isMuted && Math.abs(userVolume - preset.vol) < 0.03 && preset.vol > 0
              ? true
              : isMuted && preset.vol === 0;

          return (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetPill,
                isActive && {
                  backgroundColor: accentColor + '20',
                  borderColor: accentColor,
                },
              ]}
              onPress={() => handleSetVolume(preset.vol)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetPillText,
                  isActive && { color: accentColor, fontWeight: '700' },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.hintText}>
        💡 Awtomatikong humihina ang background music kapag may boses o tanong sa laro.
      </Text>
    </View>
  );
}

/**
 * TopBar Volume Button for Teacher and Student screens.
 * Tap opens the volume control modal; hold toggles mute immediately.
 */
export function VolumeButton({ activeColor = Colors.skyBlueDark, size = 38 }: VolumeButtonProps) {
  const [isMuted, setIsMuted] = useState<boolean>(bgm.getMuted());
  const [userVolume, setUserVolumeState] = useState<number>(bgm.getUserVolume());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubMute = bgm.subscribeMute((muted) => setIsMuted(muted));
    const unsubVol = bgm.subscribeVolume((vol) => setUserVolumeState(vol));
    return () => {
      unsubMute();
      unsubVol();
    };
  }, []);

  const handleQuickToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bgm.toggleMute();
  };

  const volumeIcon = () => {
    if (isMuted || userVolume === 0) return 'volume-mute';
    if (userVolume < 0.35) return 'volume-low';
    if (userVolume < 0.7) return 'volume-medium';
    return 'volume-high';
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        onLongPress={handleQuickToggleMute}
        delayLongPress={400}
        style={[
          styles.btn,
          { width: size, height: size },
          isMuted && styles.btnMuted,
          Shadows.subtle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Lakas ng musika: ${isMuted ? 'Naka-mute' : Math.round(userVolume * 100) + '%'}. Pindutin para ayusin.`}
      >
        <Ionicons
          name={volumeIcon()}
          size={size * 0.52}
          color={isMuted ? Colors.textMuted : activeColor}
        />
      </TouchableOpacity>

      {/* Volume Popover Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalCard, Shadows.card]}>
                <VolumeControlContent
                  accentColor={activeColor}
                  onClose={() => setShowModal(false)}
                  showCloseButton
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

/**
 * In-Page Settings Card for Profile Screens (Teacher Profile & Student Profile)
 */
export function VolumeSettingsCard({ accentColor = Colors.vibrantPurple }: { accentColor?: string }) {
  return (
    <View style={[styles.inlineCard, Shadows.card]}>
      <VolumeControlContent
        accentColor={accentColor}
        showCloseButton={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  btnMuted: {
    backgroundColor: '#F1F5F9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
  },
  inlineCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 16,
  },
  controlBox: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  musicBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  trackSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
  },
  muteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  unmuteCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  muteCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  muteCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  muteIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteCardTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  muteCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
    paddingRight: 4,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
  },
  volumeDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  volumePctLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  volumePctValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackWrapper: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    borderRadius: 5,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: -11,
    marginLeft: -11,
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadows.subtle,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetPillText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: Typography.weights.bold,
  },
  hintText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
});
