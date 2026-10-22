import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { playSound } from '../services/audio/sound-service';
import { Colors, Shadows } from '../theme';
import { PressableScale } from './PressableScale';

interface AudioButtonProps {
  audioUrl?: string | null;
  label?: string;
  size?: number;
  style?: ViewStyle;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  audioUrl,
  label = 'Pakinggan',
  size = 56,
  style,
  onPlayStart,
  onPlayEnd,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePress = async () => {
    if (isPlaying) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsPlaying(true);
    onPlayStart?.();

    await playSound(audioUrl || 'tama.mp3', () => {
      setIsPlaying(false);
      onPlayEnd?.();
    });
  };

  const iconSize = Math.round(size * 0.45);

  return (
    <PressableScale
      onPress={handlePress}
      disabled={isPlaying}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isPlaying ? '#FDE047' : Colors.sunYellow,
        },
        Shadows.colored(Colors.sunYellowDark),
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isPlaying ? (
        <ActivityIndicator color={Colors.text} size="small" />
      ) : (
        <Ionicons name="volume-high" size={iconSize} color="#78350F" />
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
});

