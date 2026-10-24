/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { Colors, Gradients, Radius, Shadows, Typography } from '@/theme';
import { Collectible } from '@/types';
import { bgm, playSound, speakWordWeb, stopCurrentSound } from '@/services/audio/sound-service';
import { getCollectibleAudioSource, getCollectibleDescription, getCollectibleImageSource } from '@/utils/collectible-assets';
import { PrimaryButton } from './PrimaryButton';
import { PressableScale } from './PressableScale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: '#64748B',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Karaniwan',
  rare: 'Bihira',
  epic: 'Mahiwaga',
  legendary: 'Pambihira',
};

interface MysteryBoxModalProps {
  visible: boolean;
  score?: number; // 15 to 20
  totalQuestions?: number;
  starsAwarded?: number;
  collectible: (Collectible & { category?: string; is_duplicate?: boolean }) | null;
  onClose: () => void;
}

export function MysteryBoxModal({
  visible,
  score = 20,
  totalQuestions = 20,
  starsAwarded = 20,
  collectible,
  onClose,
}: MysteryBoxModalProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Animations
  const boxRotation = useSharedValue(0);
  const boxScale = useSharedValue(1);
  const cardScale = useSharedValue(0.4);
  const cardOpacity = useSharedValue(0);

  // Reset state when modal opens and minimize BGM (@happy.mp3)
  useEffect(() => {
    if (visible) {
      bgm.minimize();
      setIsRevealed(false);
      setIsPlayingAudio(false);
      cardScale.value = 0.4;
      cardOpacity.value = 0;

      // Start gentle shaking idle animation for the mystery box
      boxRotation.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 100 }),
          withTiming(6, { duration: 100 }),
          withTiming(-4, { duration: 100 }),
          withTiming(4, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      stopCurrentSound();
      bgm.restore();
    }

    return () => {
      stopCurrentSound();
      bgm.restore();
    };
  }, [visible]);

  const handleClose = () => {
    stopCurrentSound();
    bgm.restore();
    onClose();
  };

  // Audio Playback
  const playCardAudio = () => {
    if (!collectible) return;
    setIsPlayingAudio(true);
    bgm.minimize();

    const audioSource = getCollectibleAudioSource(collectible);
    if (audioSource) {
      playSound(audioSource, () => {
        setIsPlayingAudio(false);
      });
    } else {
      // Speech synthesis fallback for filipino description
      const cardDesc = getCollectibleDescription(collectible);
      const textToSpeak = `${collectible.filipino_name || collectible.name}. ${cardDesc}`;
      speakWordWeb(textToSpeak, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const handleOpenBox = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsRevealed(true);

    cardScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    cardOpacity.value = withTiming(1, { duration: 300 });

    // Autoplay audio description upon reveal (Rule 8)
    setTimeout(() => {
      playCardAudio();
    }, 450);
  };

  const animatedBoxStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${boxRotation.value}deg` }, { scale: boxScale.value }],
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!isRevealed ? (
            /* STATE 1: Mystery Box Ready to Open */
            <View style={[styles.cardContainer, Shadows.card]}>
              <LinearGradient colors={Gradients.purple} style={styles.headerGradient}>
                <Text style={styles.headerTitle}>Mahiwagang Kahon!</Text>
                <Text style={styles.headerSubtitle}>
                  Nakakuha ka ng {score}/{totalQuestions} puntos! May espesyal kang regalo!
                </Text>
              </LinearGradient>

              <View style={styles.boxBody}>
                <Animated.View style={[styles.boxWrapper, animatedBoxStyle]}>
                  <PressableScale onPress={handleOpenBox} style={styles.boxTouchable}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.boxCircle}
                    >
                      <Ionicons name="gift" size={72} color={Colors.white} />
                    </LinearGradient>
                  </PressableScale>
                </Animated.View>

                <View style={styles.starsEarnedRow}>
                  <Ionicons name="star" size={24} color={Colors.sunYellowDark} />
                  <Text style={styles.starsEarnedText}>+{starsAwarded} Bituin na Idinagdag!</Text>
                </View>

                <Text style={styles.tapInstruction}>
                  Pindutin ang kahon upang buksan ang iyong bagong kard! 🎁
                </Text>

                <PrimaryButton
                  title="Buksan ang Kahon!"
                  icon="sparkles"
                  size="lg"
                  gradient={Gradients.sun}
                  onPress={handleOpenBox}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            </View>
          ) : (
            /* STATE 2: Revealed Collectible Card */
            <Animated.View style={[styles.cardContainer, Shadows.card, animatedCardStyle]}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.headerGradient}
              >
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.rarityPill,
                      {
                        backgroundColor:
                          RARITY_COLORS[collectible?.rarity || 'common'] ?? '#64748B',
                      },
                    ]}
                  >
                    <Text style={styles.rarityText}>
                      {RARITY_LABELS[collectible?.rarity || 'common']}
                    </Text>
                  </View>
                  {collectible?.is_duplicate ? (
                    <View style={styles.duplicatePill}>
                      <Text style={styles.duplicateText}>Kolektado Na</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.cardHeaderTitle}>
                  {collectible?.filipino_name || collectible?.name || 'Mahiwagang Kard'}
                </Text>
                <Text style={styles.cardCategoryText}>
                  Kategorya: {collectible?.category || 'Mga Hayop'}
                </Text>
              </LinearGradient>

              <View style={styles.revealedBody}>
                {/* Picture Display */}
                <View style={styles.imageFrame}>
                  {(() => {
                    const imgSource = getCollectibleImageSource(collectible);
                    return imgSource ? (
                      <Image
                        source={imgSource}
                        style={styles.cardImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name="trophy" size={80} color={Colors.sunYellowDark} />
                    );
                  })()}
                </View>

                {/* Filipino Description */}
                <Text style={styles.descriptionText}>
                  {getCollectibleDescription(collectible)}
                </Text>

                {/* Audio Playback Controls (Rule 8) */}
                <TouchableOpacity
                  style={[styles.audioReplayBtn, isPlayingAudio && styles.audioReplayBtnActive]}
                  onPress={playCardAudio}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                    size={24}
                    color={Colors.skyBlueDark}
                  />
                  <Text style={styles.audioReplayText}>
                    {isPlayingAudio ? 'Pinakikinggan...' : 'Pakinggan ang Paglalarawan 🔊'}
                  </Text>
                </TouchableOpacity>

                {/* Action Button */}
                <PrimaryButton
                  title="Itabi sa Aking Nakolekta 🏆"
                  gradient={Gradients.grass}
                  size="md"
                  onPress={handleClose}
                  style={{ width: '100%', marginTop: 12 }}
                />
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  boxBody: {
    padding: 24,
    alignItems: 'center',
  },
  boxWrapper: {
    marginVertical: 12,
  },
  boxTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  starsEarnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  starsEarnedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
    fontFamily: Typography.family.display,
  },
  tapInstruction: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  rarityPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  rarityText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
  },
  duplicatePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  duplicateText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: Typography.weights.medium,
  },
  cardHeaderTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  cardCategoryText: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 2,
  },
  revealedBody: {
    padding: 20,
    alignItems: 'center',
  },
  imageFrame: {
    width: 170,
    height: 170,
    borderRadius: Radius.xl,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  descriptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  audioReplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    marginBottom: 8,
  },
  audioReplayBtnActive: {
    backgroundColor: '#BAE6FD',
  },
  audioReplayText: {
    fontSize: Typography.sizes.xs,
    color: Colors.skyBlueDark,
    fontWeight: Typography.weights.bold,
  },
});
