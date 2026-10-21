import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AudioButton } from '../../../components/AudioButton';
import { ItemVisual } from '../../../components/ItemVisual';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { getCategoryBySlug } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { playLocalSound } from '../../../services/audio/sound-service';
import { Shadows, Typography } from '../../../theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min(width - 48, 320);

export default function FlashcardsViewerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);
  const items = category.items;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = items[currentIndex] || items[0];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  usePresence(`Nagbabasa ng Flashcards sa ${category.name}`, 'flashcards_view');

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back button and Category Name */}
      <ScreenHeader
        title={category.name.toUpperCase()}
        bgColor={category.color}
      />

      <View style={styles.content}>
        {/* Main Flashcard */}
        <View style={[styles.flashcard, Shadows.card, { borderColor: category.color }]}>
          {/* Card Visual / Illustration */}
          <ItemVisual item={currentItem} size={CARD_SIZE * 0.72} style={styles.visualContainer} />

          {/* Filipino Name (Prominently Highlighted) */}
          <Text style={[styles.filipinoName, { color: category.color }]}>
            {currentItem.filipino}
          </Text>

          {/* English Translation (Directly underneath, smaller) */}
          <Text style={styles.englishName}>
            {currentItem.english}
          </Text>

          {/* Optional Audio Button */}
          {currentItem.audioUri ? (
            <View style={styles.audioContainer}>
              <AudioButton audioUrl={currentItem.audioUri} size={54} />
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => playLocalSound('tama')}
              style={[styles.audioPill, { backgroundColor: category.color + '20' }]}
            >
              <Text style={styles.audioPillText}>🔊 Pakinggan</Text>
            </TouchableOpacity>
          )}

          {/* Progress Indicator: e.g. 1 / 20 */}
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {items.length}
            </Text>
          </View>
        </View>

        {/* Navigation Controls: Previous & Next */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePrev}
            disabled={isFirst}
            style={[
              styles.navButton,
              styles.prevButton,
              isFirst && styles.disabledButton,
              Shadows.button,
            ]}
          >
            <Text style={[styles.navButtonText, isFirst && styles.disabledText]}>
              ⬅️ Nakaraan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            disabled={isLast}
            style={[
              styles.navButton,
              styles.nextButton,
              isLast && styles.disabledButton,
              Shadows.button,
            ]}
          >
            <Text style={[styles.navButtonText, isLast && styles.disabledText]}>
              Susunod ➡️
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  flashcard: {
    width: CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 4,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  visualContainer: {
    marginBottom: 20,
  },
  filipinoName: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'lowercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  englishName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  audioContainer: {
    marginBottom: 16,
  },
  audioPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  audioPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  counterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CARD_SIZE,
    marginTop: 24,
    gap: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  prevButton: {
    backgroundColor: '#94A3B8',
  },
  nextButton: {
    backgroundColor: '#38BDF8',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledText: {
    color: '#94A3B8',
  },
});
