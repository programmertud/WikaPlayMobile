import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { AudioButton } from '../../../components/AudioButton';
import { ItemVisual } from '../../../components/ItemVisual';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { resolveAvatarUrl } from '../../../components/UserAvatar';
import { getCategoryBySlug, hydrateCategoryOverrides, syncCategoryFlashcards } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { playVocabularyItem, stopCurrentSound, useBgmDuck } from '../../../services/audio/sound-service';
import { categoryService } from '../../../services/api';
import { storage } from '../../../utils/storage';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import type { VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min(width - 48, 340);

export default function FlashcardsViewerScreen() {
  useBgmDuck();
  const { user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);
  const [items, setItems] = useState<VocabularyItem[]>(category.items);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryFlashcards = async () => {
      if (!slug) return;

      // Step 1: Apply locally cached overrides and custom teacher flashcards immediately
      try {
        await hydrateCategoryOverrides(slug);
        const cachedRaw = await storage.getItem(`@wikaplay_flashcards_${slug}`);
        const customRaw = await storage.getItem(`@wikaplay_custom_items_${slug}`);
        const customItems: VocabularyItem[] = customRaw ? JSON.parse(customRaw) : [];

        if ((cachedRaw || customItems.length > 0) && isMounted) {
          const cachedMap: Record<string, { imageUri?: string; audioUri?: string }> = cachedRaw ? JSON.parse(cachedRaw) : {};
          // Purge legacy test artifacts with repeated letters (e.g. "agilasssss")
          Object.keys(cachedMap).forEach((k) => {
            if (/s{3,}/i.test(k)) {
              delete cachedMap[k];
            }
          });
          if (cachedRaw) {
            storage.setItem(`@wikaplay_flashcards_${slug}`, JSON.stringify(cachedMap)).catch(() => {});
          }

          setItems((prev) => {
            const updated = prev
              .filter((item) => !/s{3,}/i.test(item.filipino))
              .map((item) => {
                const norm = item.filipino.toLowerCase().trim();
                const cached = cachedMap[norm];
                if (cached) {
                  return {
                    ...item,
                    // Only override if cache has a real (non-blob) URL
                    imageUri: (cached.imageUri && !cached.imageUri.startsWith('blob:')) ? cached.imageUri : item.imageUri,
                    audioUri: cached.audioUri || item.audioUri,
                  };
                }
                return item;
              });

            // Append cached custom flashcards so newly added cards are visible offline
            customItems.forEach((ci) => {
              const ciNorm = ci.filipino.toLowerCase().trim();
              if (!updated.some((it) => it.filipino.toLowerCase().trim() === ciNorm)) {
                updated.push(ci);
              }
            });

            return updated;
          });
        }
      } catch {}

      // Step 2: Always fetch from the live backend API — teacher updates must appear immediately
      try {
        const res = await categoryService.getFlashcards(slug, user?.section_id);
        if (res?.flashcards && isMounted) {
          syncCategoryFlashcards(slug, res.flashcards);
          const overridesMap: Record<string, { imageUri?: string; audioUri?: string }> = {};

          setItems((prev) => {
            const updated = prev.map((item) => {
              const norm = item.filipino.toLowerCase().trim();
              const match = res.flashcards.find((f) => {
                const fn = (f.filipino_name || f.name || '').toLowerCase().trim();
                return fn === norm || (norm === 'buko' && fn === 'niyog') || (norm === 'niyog' && fn === 'buko');
              });

              if (match) {
                const isUnsplash = typeof match.image_url === 'string' && match.image_url.includes('images.unsplash.com');
                const isBlobUrl = typeof match.image_url === 'string' && match.image_url.startsWith('blob:');
                const isLocalFile = typeof match.image_url === 'string' && match.image_url.startsWith('file://');
                // Accept any valid non-placeholder, non-blob, non-local-file server URL
                const normalizedImg = match.image_url ? resolveAvatarUrl(match.image_url) : undefined;
                const isPlaceholder = normalizedImg?.includes('wikaplay.app');
                const validImage = normalizedImg && !isUnsplash && !isBlobUrl && !isLocalFile && !isPlaceholder
                  ? normalizedImg
                  : undefined;
                // Only treat as valid audio override if it's an actual remote upload (http/storage)
                const isRealRemoteAudio = typeof match.audio_url === 'string' &&
                  (match.audio_url.startsWith('http://') || match.audio_url.startsWith('https://') || match.audio_url.includes('/storage/'));
                const isLocalAudioFile = typeof match.audio_url === 'string' && match.audio_url.startsWith('file://');
                const validAudio = typeof match.audio_url === 'string' && isRealRemoteAudio && !match.audio_url.startsWith('blob:') && !isLocalAudioFile
                  ? match.audio_url
                  : undefined;

                // Always update overrides map so we can cache the latest state
                overridesMap[norm] = {
                  imageUri: validImage,
                  audioUri: validAudio || item.audioUri,
                };

                return {
                  ...item,
                  // Teacher image takes priority over bundled local image
                  imageUri: validImage ?? item.imageUri,
                  audioUri: validAudio || item.audioUri,
                };
              }
              return item;
            });

            // Append any extra teacher-added flashcards not in the local curriculum
            // Only include published flashcards (is_published !== false)
            const newlyAddedCustom: VocabularyItem[] = [];
            res.flashcards.forEach((f) => {
              const fNorm = (f.filipino_name || f.name || '').toLowerCase().trim();
              const exists = updated.some((it) => {
                const itNorm = it.filipino.toLowerCase().trim();
                return itNorm === fNorm || (fNorm === 'buko' && itNorm === 'niyog') || (fNorm === 'niyog' && itNorm === 'buko');
              });
              const isTestCard = f.id === 155 || /s{3,}/i.test(fNorm) || /s{3,}/i.test(f.english_name || '');
              // Skip unpublished flashcards, test cards, and items already in local curriculum
              if (!exists && f.filipino_name && f.is_published !== false && !isTestCard) {
                const normalizedFImg = f.image_url ? resolveAvatarUrl(f.image_url) : undefined;
                const isUnsplash = typeof normalizedFImg === 'string' && normalizedFImg.includes('images.unsplash.com');
                const isBlobUrl = typeof normalizedFImg === 'string' && normalizedFImg.startsWith('blob:');
                const isLocalFile = typeof normalizedFImg === 'string' && normalizedFImg.startsWith('file://');
                const isPlaceholder = typeof normalizedFImg === 'string' && normalizedFImg.includes('wikaplay.app');
                const isLocalAudioFile = typeof f.audio_url === 'string' && f.audio_url.startsWith('file://');
                const customItem: VocabularyItem = {
                  id: `fc_${f.id}`,
                  categoryId: category.id,
                  filipino: f.filipino_name,
                  english: f.english_name || '',
                  imageUri: normalizedFImg && !isUnsplash && !isBlobUrl && !isLocalFile && !isPlaceholder ? normalizedFImg : undefined,
                  audioUri: f.audio_url && !isLocalAudioFile ? f.audio_url : undefined,
                  emoji: '⭐',
                };
                updated.push(customItem);
                newlyAddedCustom.push(customItem);
                overridesMap[fNorm] = {
                  imageUri: customItem.imageUri,
                  audioUri: customItem.audioUri,
                };
              }
            });

            // Filter out any unwanted test cards with 3+ repeated letters
            const cleanUpdated = updated.filter(
              (item) => !/s{3,}/i.test(item.filipino)
            );

            // Persist the latest overrides and custom flashcards to local cache for offline use.
            // Merge with previously cached custom items so ALL teacher-added cards survive offline.
            storage.setItem(`@wikaplay_flashcards_${slug}`, JSON.stringify(overridesMap)).catch(() => {});
            (async () => {
              try {
                const prevRaw = await storage.getItem(`@wikaplay_custom_items_${slug}`);
                const prevCustom: VocabularyItem[] = prevRaw ? JSON.parse(prevRaw) : [];
                // Merge: start with previous cached, upsert anything from this session
                const mergedMap = new Map<string, VocabularyItem>();
                prevCustom.forEach((item) => mergedMap.set(item.filipino.toLowerCase().trim(), item));
                newlyAddedCustom.forEach((item) => mergedMap.set(item.filipino.toLowerCase().trim(), item));
                const merged = Array.from(mergedMap.values());
                await storage.setItem(`@wikaplay_custom_items_${slug}`, JSON.stringify(merged));
              } catch {}
            })();
            return cleanUpdated;
          });
        }
      } catch {
        // Safe offline fallback — cached local data stays
      }
    };

    loadCategoryFlashcards();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const currentItem = items[currentIndex] || items[0];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  usePresence(`Nagbabasa ng Flashcards sa ${category.name}`, 'flashcards_view');

  // Stop audio immediately when leaving the flashcards screen
  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  // Auto-pronounce word when card is opened or changed
  useEffect(() => {
    if (!currentItem) return;
    stopCurrentSound();
    const timer = setTimeout(() => {
      playVocabularyItem(currentItem).catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      stopCurrentSound();
    };
  }, [currentIndex, currentItem]);

  // Animation values for card slide/flip transition
  const cardOpacity = useSharedValue(1);
  const cardTranslateX = useSharedValue(0);

  const transitionTo = (newIndex: number, direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const exitX = direction === 'left' ? -60 : 60;
    const enterX = direction === 'left' ? 60 : -60;

    cardTranslateX.value = withTiming(exitX, { duration: 150 });
    cardOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(setCurrentIndex)(newIndex);
      cardTranslateX.value = enterX;
      cardTranslateX.value = withTiming(0, { duration: 180 });
      cardOpacity.value = withTiming(1, { duration: 180 });
    });
  };

  const handlePrev = () => {
    if (!isFirst) {
      transitionTo(currentIndex - 1, 'right');
    }
  };

  const handleNext = () => {
    if (!isLast) {
      transitionTo(currentIndex + 1, 'left');
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  return (
    <AnimatedBackground>
      <ScreenHeader
        title={category.name.toUpperCase()}
        bgColor={category.color}
      />

      <View style={styles.content}>
        {/* Main Flashcard with Slide/Flip Animation */}
        <Animated.View style={[styles.flashcard, Shadows.card, cardAnimatedStyle]}>
          {/* Card Visual / Illustration */}
          <ItemVisual item={currentItem} size={CARD_SIZE * 0.7} style={styles.visualContainer} />

          {/* Filipino Name */}
          <Text style={[styles.filipinoName, { color: category.color || Colors.skyBlueDark }]}>
            {currentItem.filipino}
          </Text>

          {/* English Translation */}
          <Text style={styles.englishName}>
            {currentItem.english}
          </Text>

          {/* Audio Play Button — supports both URI strings and bundled require assets */}
          {(currentItem.audioUri || currentItem.audio) ? (
            <View style={styles.audioContainer}>
              <AudioButton audioUrl={currentItem.audioUri ?? currentItem.audio} size={54} />
            </View>
          ) : (
            <PressableScale
              onPress={() => playVocabularyItem(currentItem)}
              style={[styles.audioPill, { backgroundColor: (category.color || Colors.skyBlue) + '18' }]}
            >
              <Ionicons name="volume-high" size={18} color={category.color || Colors.skyBlueDark} />
              <Text style={[styles.audioPillText, { color: category.color || Colors.skyBlueDark }]}>
                Pakinggan
              </Text>
            </PressableScale>
          )}

          {/* Counter Badge */}
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {items.length}
            </Text>
          </View>
        </Animated.View>

        {/* Progress Dots (showing a window of 7 dots centered around current) */}
        <View style={styles.dotsRow}>
          {items.slice(0, 15).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.activeDot, { backgroundColor: category.color || Colors.skyBlueDark }]
                  : styles.inactiveDot,
              ]}
            />
          ))}
          {items.length > 15 && <Text style={styles.moreDotsText}>•••</Text>}
        </View>

        {/* Navigation Controls: Previous & Next with Icon Buttons */}
        <View style={styles.controlsRow}>
          <PressableScale
            onPress={handlePrev}
            disabled={isFirst}
            style={[
              styles.navButton,
              styles.prevButton,
              isFirst && styles.disabledButton,
              Shadows.subtle,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isFirst ? Colors.textMuted : Colors.text}
            />
            <Text style={[styles.navButtonText, isFirst && styles.disabledText]}>
              Nakaraan
            </Text>
          </PressableScale>

          <PressableScale
            onPress={handleNext}
            disabled={isLast}
            style={[
              styles.navButton,
              styles.nextButton,
              isLast && styles.disabledButton,
              Shadows.colored(Colors.skyBlueDark, 0.2),
            ]}
          >
            <LinearGradient
              colors={isLast ? ['#CBD5E1', '#94A3B8'] : Gradients.sky}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.nextButtonText, isLast && styles.disabledText]}>
              Susunod
            </Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.white}
            />
          </PressableScale>
        </View>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  flashcard: {
    width: CARD_SIZE,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  visualContainer: {
    marginBottom: 16,
  },
  filipinoName: {
    fontSize: 32,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    textTransform: 'lowercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  englishName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  audioContainer: {
    marginBottom: 16,
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 16,
    gap: 6,
  },
  audioPillText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  counterBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  counterText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
    gap: 5,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
  },
  inactiveDot: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  moreDotsText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginLeft: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CARD_SIZE,
    marginTop: 16,
    gap: 14,
  },
  navButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 6,
  },
  prevButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  nextButton: {
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.45,
  },
  navButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  disabledText: {
    color: Colors.textMuted,
  },
});
