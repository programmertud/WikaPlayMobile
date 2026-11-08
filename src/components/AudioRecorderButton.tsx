/**
 * AudioRecorderButton
 * Reusable in-app audio recorder for the Teacher portal.
 * Uses expo-audio (SDK 58) hooks — no expo-av dependency.
 *
 * Props:
 *  onRecordingComplete(uri, mimeType, filename) — called after the user stops recording
 *  isUploading  — when true the button shows a spinner (upload in progress)
 *  disabled     — fully disables the button
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Colors, Radius } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioRecorderButtonProps {
  onRecordingComplete: (uri: string, mimeType: string, filename: string) => void;
  isUploading?: boolean;
  disabled?: boolean;
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AudioRecorderButton({
  onRecordingComplete,
  isUploading = false,
  disabled = false,
  label = 'I-Record',
}: AudioRecorderButtonProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // 1. Ask for permission
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Required',
          'Kailangan ng access sa mikropono para mag-record. Mangyaring i-allow sa Settings.'
        );
        return;
      }

      // 2. Set audio mode to allow recording
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      // 3. Prepare & start
      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('AudioRecorderButton startRecording error:', err);
      Alert.alert('Recording Error', err?.message || 'Hindi makapag-record. Subukan muli.');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recorder.stop();
      setIsRecording(false);

      // Restore audio mode
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });

      const uri = recorder.uri;
      if (!uri) {
        Alert.alert('Recording Error', 'Walang nakuhang recording. Subukan muli.');
        return;
      }

      const filename = `recording_${Date.now()}.m4a`;
      onRecordingComplete(uri, 'audio/m4a', filename);
    } catch (err: any) {
      console.error('AudioRecorderButton stopRecording error:', err);
      setIsRecording(false);
      Alert.alert('Recording Error', err?.message || 'May error sa pag-stop ng recording.');
    }
  }, [recorder, onRecordingComplete]);

  // ── Render ──

  if (isUploading) {
    return (
      <View style={[styles.btn, styles.btnUploading]}>
        <ActivityIndicator size="small" color={Colors.white} />
        <Text style={styles.btnText}>Ina-upload...</Text>
      </View>
    );
  }

  if (isRecording) {
    return (
      <TouchableOpacity
        style={[styles.btn, styles.btnRecording]}
        onPress={stopRecording}
        activeOpacity={0.8}
      >
        <Ionicons name="stop-circle" size={18} color={Colors.white} />
        <Text style={styles.btnText}>⏹ I-Stop ({formatTime(elapsedSeconds)})</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, styles.btnIdle, disabled && styles.btnDisabled]}
      onPress={startRecording}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name="mic" size={18} color={Colors.white} />
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    flex: 1,
    justifyContent: 'center',
  },
  btnIdle: {
    backgroundColor: Colors.teacherPurple,
  },
  btnRecording: {
    backgroundColor: '#E53E3E', // red while recording
  },
  btnUploading: {
    backgroundColor: Colors.textMuted,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});
