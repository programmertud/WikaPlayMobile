import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from '@/utils/haptics';
import { bgm } from '../services/audio/bgm-service';
import { playFeedbackSound, stopCurrentSound } from '../services/audio/sound-service';
import { evaluatePronunciation, PronunciationResult } from '../services/speech/pronunciation-service';
import { Colors, Radius, Typography, Shadows } from '../theme';

interface PronunciationAssessmentBarProps {
  expectedWord: string;
  categoryColor?: string;
  categoryName?: string;
  isPassed: boolean;
  onSuccess: () => void;
  onReplayAudio: () => void;
}

export function PronunciationAssessmentBar({
  expectedWord,
  categoryColor = Colors.skyBlueDark,
  categoryName,
  isPassed,
  onSuccess,
  onReplayAudio,
}: PronunciationAssessmentBarProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const expectedWordRef = useRef(expectedWord);
  expectedWordRef.current = expectedWord;

  const categoryNameRef = useRef(categoryName);
  categoryNameRef.current = categoryName;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onReplayAudioRef = useRef(onReplayAudio);
  onReplayAudioRef.current = onReplayAudio;

  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  // Pulse animation for recording and mic idle
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Reset state when expected word changes (card changed)
  useEffect(() => {
    setIsRecording(false);
    setIsAnalyzing(false);
    setResult(null);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, [expectedWord]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      bgm.resumeAfterRecording();
    };
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      await recorder.stop();
      setIsRecording(false);

      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      bgm.resumeAfterRecording();

      const uri = recorder.uri;
      if (!uri) {
        Alert.alert('Error', 'Walang narinig na boses. Pakisubukan muli.');
        return;
      }

      // Analyze pronunciation via AI
      setIsAnalyzing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const targetWord = expectedWordRef.current;
      const targetCategory = categoryNameRef.current;

      const evalResult = await evaluatePronunciation(uri, targetWord, targetCategory);
      setIsAnalyzing(false);
      setResult(evalResult);

      if (evalResult.is_correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        playFeedbackSound('tama').catch(() => {});
        onSuccessRef.current();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        playFeedbackSound('mali').catch(() => {});
      }
    } catch (err: any) {
      console.error('stopRecording error:', err);
      setIsRecording(false);
      setIsAnalyzing(false);
      bgm.resumeAfterRecording();
    }
  }, [recorder]);

  stopRecordingRef.current = stopRecording;

  const startRecording = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone Permission',
          'Kailangan ng access sa mikropono upang suriin ang iyong pagbigkas.'
        );
        return;
      }

      stopCurrentSound();
      bgm.pauseForRecording();

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setResult(null);
      setCountdown(3);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Countdown timer for 3 seconds
      let timeLeft = 3;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

      // Auto-stop after 3.2 seconds (ideal for Kindergarten 1-word speech)
      autoStopTimerRef.current = setTimeout(() => {
        stopRecordingRef.current();
      }, 3200);
    } catch (err: any) {
      console.error('startRecording error:', err);
      bgm.resumeAfterRecording();
      Alert.alert('Error', 'Hindi makapag-record. Subukan muli.');
    }
  }, [recorder]);

  return (
    <View style={styles.container}>
      {/* 1. If currently analyzing audio */}
      {isAnalyzing && (
        <View style={styles.statusBox}>
          <ActivityIndicator size="small" color={categoryColor} />
          <Text style={[styles.statusText, { color: categoryColor }]}>
            Sinusuri ang iyong boses... 👂
          </Text>
        </View>
      )}

      {/* 2. Success state (Card passed) */}
      {!isAnalyzing && (isPassed || result?.is_correct) && (
        <View style={[styles.feedbackBox, styles.successBox]}>
          <View style={styles.feedbackRow}>
            <Ionicons name="checkmark-circle" size={26} color='#10B981' />
            <Text style={styles.successTitle}>Tama! Magaling! ⭐</Text>
          </View>
          <Text style={styles.successSubtext}>
            {result?.feedback || 'Napakagaling ng iyong pagbigkas!'}
          </Text>
        </View>
      )}

      {/* 3. Incorrect state with encouraging retry guidance */}
      {!isAnalyzing && result && !result.is_correct && !isPassed && (
        <View style={[styles.feedbackBox, styles.retryBox]}>
          <View style={styles.feedbackRow}>
            <Ionicons name="refresh-circle" size={26} color="#EA580C" />
            <Text style={styles.retryTitle}>Subukan mong muli!</Text>
          </View>
          <Text style={styles.retrySubtext}>
            {result.feedback || `Pakinggan ang tamang bigkas at sabihin: "${expectedWord}"`}
          </Text>

          <View style={styles.retryActions}>
            <TouchableOpacity
              style={styles.listenAgainBtn}
              onPress={async () => {
                await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
                onReplayAudioRef.current();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={18} color="#EA580C" />
              <Text style={styles.listenAgainText}>Pakinggan Muli</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. Microphone Control Bar */}
      {!isPassed && !isAnalyzing && (
        <View style={styles.micSection}>
          <Animated.View style={!isRecording ? animatedMicStyle : undefined}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording
                  ? styles.micButtonRecording
                  : { backgroundColor: categoryColor || Colors.skyBlueDark },
                Shadows.md,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={34}
                color={Colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.micInstruction}>
            {isRecording
              ? `Sabihin ang "${expectedWord.toUpperCase()}"! (${countdown}s)`
              : `Pindutin ang mic at sabihin: "${expectedWord.toUpperCase()}"`}
          </Text>
        </View>
      )}

      {/* 5. If already passed, provide option to practice again */}
      {isPassed && !isAnalyzing && (
        <TouchableOpacity
          style={styles.practiceAgainBtn}
          onPress={startRecording}
          activeOpacity={0.7}
        >
          <Ionicons name="mic-outline" size={18} color={categoryColor} />
          <Text style={[styles.practiceAgainText, { color: categoryColor }]}>
            Gusto mo bang magsanay ulit?
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 15,
    fontFamily: Typography.family.body,
    fontWeight: '600',
  },
  feedbackBox: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
  },
  successTitle: {
    fontSize: 17,
    fontFamily: Typography.family.display,
    fontWeight: '700',
    color: '#10B981',
  },
  successSubtext: {
    fontSize: 13,
    fontFamily: Typography.family.body,
    color: '#065F46',
    textAlign: 'center',
    marginTop: 2,
  },
  retryBox: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1.5,
  },
  retryTitle: {
    fontSize: 16,
    fontFamily: Typography.family.display,
    fontWeight: '700',
    color: '#C2410C',
  },
  retrySubtext: {
    fontSize: 13,
    fontFamily: Typography.family.body,
    color: '#9A3412',
    textAlign: 'center',
    marginTop: 3,
  },
  retryActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  listenAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
  listenAgainText: {
    fontSize: 13,
    fontFamily: Typography.family.body,
    fontWeight: '700',
    color: '#C2410C',
  },
  micSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
  },
  micInstruction: {
    fontSize: 14,
    fontFamily: Typography.family.display,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  practiceAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  practiceAgainText: {
    fontSize: 13,
    fontFamily: Typography.family.body,
    fontWeight: '600',
  },
});
