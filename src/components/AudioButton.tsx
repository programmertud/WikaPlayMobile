import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { playSound } from '../services/audio/sound-service';
import { Colors, Shadows, Typography } from '../theme';

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
  size = 64,
  style,
  onPlayStart,
  onPlayEnd,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePress = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    onPlayStart?.();

    const cleanup = await playSound(audioUrl || 'tama.mp3', () => {
      setIsPlaying(false);
      onPlayEnd?.();
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={isPlaying}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isPlaying ? Colors.sunYellow : Colors.sunYellowDark,
        },
        Shadows.button,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isPlaying ? (
        <ActivityIndicator color={Colors.white} size="small" />
      ) : (
        <Text style={styles.icon}>🔊</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  icon: {
    fontSize: 28,
  },
});
