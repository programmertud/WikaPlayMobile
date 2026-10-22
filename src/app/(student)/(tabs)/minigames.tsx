import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MiniGameCard } from '../../../components/MiniGameCard';
import { usePresence } from '../../../hooks/use-presence';
import { Colors, Shadows, Typography, Radius } from '../../../theme';
import { MiniGame } from '../../../types';

const MINI_GAMES: MiniGame[] = [
  {
    id: 'memory_match',
    slug: 'memory-match',
    title: 'Memory Match',
    description: 'Hanapin ang magkaparehong larawan!',
    cover_image: '',
    bg_color: '#8B5CF6',
    tag: 'Katandaan',
  },
  {
    id: 'paghahanap_larawan',
    slug: 'paghahanap-larawan',
    title: 'Paghahanap ng Larawan',
    description: 'Marinig ang salita at hanapin ang larawan!',
    cover_image: '',
    bg_color: '#0EA5E9',
    tag: 'Pakikinig',
  },
  {
    id: 'hulaan_salita',
    slug: 'hulaan-salita',
    title: 'Hulaan ang Salita',
    description: 'Tingnan ang larawan at hulaan ang salita!',
    cover_image: '',
    bg_color: '#10B981',
    tag: 'Pag-iisip',
  },
  {
    id: 'gulong_letra',
    slug: 'gulong-letra',
    title: 'Gulong ng mga Letra',
    description: 'Ayusin ang mga letra upang makabuo ng salita!',
    cover_image: '',
    bg_color: '#F59E0B',
    tag: 'Spelling',
  },
  {
    id: 'pop_balloon',
    slug: 'pop-balloon',
    title: 'Pop Balloon',
    description: 'I-pop ang tamang balloon batay sa larawan!',
    cover_image: '',
    bg_color: '#EF4444',
    tag: 'Mabilis',
  },
];

const GAME_EMOJIS: Record<string, string> = {
  memory_match: '🧠',
  paghahanap_larawan: '🔍',
  hulaan_salita: '💡',
  gulong_letra: '🎡',
  pop_balloon: '🎈',
};

export default function MiniGamesScreen() {
  const insets = useSafeAreaInsets();
  usePresence('Pinipili ng Laro (Mini-Games)', 'minigame_select');

  const handleSelectGame = (game: MiniGame) => {
    router.push(`/(student)/games/${game.slug}` as any);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, Shadows.soft]}>
          <Ionicons name="game-controller" size={24} color={Colors.vibrantPurple} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Mga Laro</Text>
          <Text style={styles.headerSub}>Maglaro at matuto ng Filipino!</Text>
        </View>
      </View>

      {/* 2-Column Grid */}
      <View style={styles.grid}>
        {MINI_GAMES.map((game) => (
          <MiniGameCard
            key={game.id}
            game={game}
            emoji={GAME_EMOJIS[game.id]}
            onPress={() => handleSelectGame(game)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
