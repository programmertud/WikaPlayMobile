import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AudioButton } from '../../../components/AudioButton';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { usePresence } from '../../../hooks/use-presence';
import { categoryService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';
import { Flashcard } from '../../../types';

const { width } = Dimensions.get('window');

export default function FlashcardsViewerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [categoryName, setCategoryName] = useState<string>('Flashcards');
  const [categoryColor, setCategoryColor] = useState<string>(Colors.skyBlue);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  usePresence(`Nagbabasa ng Flashcards sa ${categoryName}`, 'flashcards_view');

  const loadFlashcards = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const res = await categoryService.getFlashcards(slug);
      setFlashcards(res.flashcards);
      setCategoryName(res.category.name);
      setCategoryColor(res.category.color || Colors.skyBlue);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang mga flashcard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, [slug]);

  if (loading) {
    return <LoadingView message="Inihahanda ang mga flashcard..." />;
  }

  if (error || flashcards.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={categoryName} bgColor={categoryColor} />
        <ErrorView
          message={error || 'Walang nakitang flashcards para sa araling ito.'}
          onRetry={loadFlashcards}
        />
      </View>
    );
  }

  const currentCard = flashcards[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === flashcards.length - 1;

  const handlePrev = () => {
    if (!isFirst) setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!isLast) setCurrentIndex((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${categoryName} (${currentIndex + 1}/${flashcards.length})`}
        bgColor={categoryColor}
      />

      <View style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressIndicator
            current={currentIndex + 1}
            total={flashcards.length}
            color={categoryColor}
          />
        </View>

        {/* Large Illustrated Flashcard */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.imageWrapper}>
            {currentCard.image_url ? (
              <Image
                source={{ uri: currentCard.image_url }}
                style={styles.cardImage}
                contentFit="contain"
                transition={300}
              />
            ) : (
              <Text style={styles.placeholderEmoji}>🖼️</Text>
            )}
          </View>

          {/* Filipino Word Title */}
          <Text style={styles.filipinoWord}>
            {currentCard.filipino_name}
          </Text>

          {/* English Translation */}
          {currentCard.english_name ? (
            <Text style={styles.englishWord}>
              ({currentCard.english_name})
            </Text>
          ) : null}

          {/* Audio Playback Button */}
          <View style={styles.audioButtonRow}>
            <AudioButton
              audioUrl={currentCard.audio_url}
              label={`Pakinggan ang ${currentCard.filipino_name}`}
              size={72}
            />
            <Text style={styles.audioInstruction}>Pindutin para pakinggan</Text>
          </View>
        </View>

        {/* Previous and Next Navigation Controls */}
        <View style={styles.navRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePrev}
            disabled={isFirst}
            style={[
              styles.navButton,
              isFirst ? styles.navButtonDisabled : styles.navButtonActive,
              Shadows.button,
            ]}
          >
            <Text style={styles.navIcon}>◀️</Text>
            <Text style={[styles.navText, isFirst && styles.navTextDisabled]}>
              Bumalik
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={isLast}
            style={[
              styles.navButton,
              isLast ? styles.navButtonDisabled : styles.navButtonActive,
              Shadows.button,
            ]}
          >
            <Text style={[styles.navText, isLast && styles.navTextDisabled]}>
              Susunod
            </Text>
            <Text style={styles.navIcon}>▶️</Text>
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
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: Colors.white,
    alignItems: 'center',
    padding: 20,
    flex: 1,
    maxHeight: 460,
    justifyContent: 'space-between',
  },
  imageWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderEmoji: {
    fontSize: 72,
  },
  filipinoWord: {
    fontSize: 32,
    fontWeight: Typography.weights.heavy,
    color: '#0369A1',
    textAlign: 'center',
    marginTop: 10,
  },
  englishWord: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  audioButtonRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  audioInstruction: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.bold,
    marginTop: 6,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    marginTop: 16,
    marginBottom: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.white,
    minWidth: 140,
  },
  navButtonActive: {
    backgroundColor: Colors.skyBlue,
  },
  navButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  navIcon: {
    fontSize: 18,
    marginHorizontal: 4,
  },
  navText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
  },
  navTextDisabled: {
    color: '#94A3B8',
  },
});
