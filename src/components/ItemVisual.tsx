import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Fonts, Radius, Shadows } from '../theme';
import { VocabularyItem } from '../types';

interface ItemVisualProps {
  item: VocabularyItem;
  size?: number;
  style?: ViewStyle;
}

export const ItemVisual: React.FC<ItemVisualProps> = ({ item, size = 180, style }) => {
  // 1. If explicit imageUri is provided
  if (item.imageUri) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <Image
          source={{ uri: item.imageUri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>
    );
  }

  // 2. If explicit bundled image asset is provided
  if (item.image) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <Image
          source={item.image}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>
    );
  }

  // 3. For "Mga Kulay" (Colors) — Display vibrant color swatch sphere
  if (item.colorCode) {
    const isWhite = item.colorCode.toUpperCase() === '#FFFFFF';
    return (
      <View
        style={[
          styles.container,
          styles.swatchCard,
          { width: size, height: size, borderColor: isWhite ? '#CBD5E1' : '#FFFFFF' },
          style,
        ]}
      >
        <View
          style={[
            styles.swatchCircle,
            {
              backgroundColor: item.colorCode,
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: (size * 0.72) / 2,
              borderWidth: isWhite ? 3 : 2,
              borderColor: isWhite ? '#E2E8F0' : 'rgba(255,255,255,0.6)',
            },
          ]}
        >
          {/* Glossy highlight */}
          <View
            style={[
              styles.swatchGloss,
              {
                width: size * 0.28,
                height: size * 0.14,
                borderRadius: size * 0.14,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  // 4. For "Mga Bilang" (Numbers) — Display prominent numeral and visual quantity counters
  if (item.quantity !== undefined) {
    const qty = item.quantity;
    const maxDots = Math.min(qty, 10);
    return (
      <View
        style={[
          styles.container,
          styles.numberCard,
          { width: size, height: size },
          style,
        ]}
      >
        <Text style={[styles.numberLargeText, { fontSize: size * 0.38 }]}>
          {qty}
        </Text>
        {/* Visual quantity indicator */}
        <View style={styles.quantityRow}>
          {Array.from({ length: maxDots }).map((_, i) => (
            <View key={i} style={[styles.quantityDot, { width: size * 0.05, height: size * 0.05 }]} />
          ))}
          {qty > 10 ? (
            <Text style={styles.quantityMoreText}>+{qty - 10}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  // 5. For "Mga Hugis" (Shapes) — Distinct geometric visual cards
  if (item.shapeType) {
    return (
      <View style={[styles.container, styles.shapeCard, { width: size, height: size }, style]}>
        <Text style={[styles.shapeEmoji, { fontSize: size * 0.52 }]}>
          {item.emoji || '🔺'}
        </Text>
      </View>
    );
  }

  // 6. Default Fallback — Child-friendly illustrated glyph card
  return (
    <View style={[styles.container, styles.defaultCard, { width: size, height: size }, style]}>
      <Text style={[styles.defaultEmoji, { fontSize: size * 0.52 }]}>
        {item.emoji || '🌟'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    ...Shadows.md,
  },
  image: {
    width: '90%',
    height: '90%',
  },
  swatchCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  swatchCircle: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 10,
    ...Shadows.md,
  },
  swatchGloss: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '-25deg' }],
  },
  numberCard: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    padding: 8,
  },
  numberLargeText: {
    fontFamily: Fonts.bold,
    color: '#854D0E',
    textAlign: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  quantityDot: {
    backgroundColor: '#EAB308',
    borderRadius: Radius.pill,
  },
  quantityMoreText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#854D0E',
    marginLeft: 2,
  },
  shapeCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#F3E8FF',
  },
  shapeEmoji: {
    textAlign: 'center',
  },
  defaultCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  defaultEmoji: {
    textAlign: 'center',
  },
});

