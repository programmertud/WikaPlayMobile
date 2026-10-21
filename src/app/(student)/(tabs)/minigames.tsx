import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniGameCard } from '../../../components/MiniGameCard';
import { usePresence } from '../../../hooks/use-presence';
import { Colors, Shadows, Typography } from '../../../theme';
import { MiniGame } from '../../../types';

// Static mini-game definitions — cover images use emoji fallbacks until
// real assets are placed at assets/images/minigame_*.png
const MINI_GAMES: MiniGame[] = [
  {
    id: 'memory_match',
    slug: 'memory-match',
    title: 'Memory Match',
    description: 'Hanapin ang magkaparehong larawan!',
    cover_image: '',   // Replace with require('../../assets/images/minigame_memory_match.png')
    bg_color: '#8B5CF6',
    tag: '🃏 Katandaan',
  },
  {
    id: 'paghahanap_larawan',
    slug: 'paghahanap-larawan',
    title: 'Paghahanap ng Larawan',
    description: 'Marinig ang salita at hanapin ang larawan!',
    cover_image: '',
    bg_color: '#0EA5E9',
    tag: '🎵 Pakikinig',
  },
  {
    id: 'hulaan_salita',
    slug: 'hulaan-salita',
    title: 'Hulaan ang Salita',
    description: 'Tingnan ang larawan at hulaan ang salita!',
    cover_image: '',
    bg_color: '#10B981',
    tag: '💭 Pag-iisip',
  },
  {
    id: 'gulong_letra',
    slug: 'gulong-letra',
    title: 'Gulong ng mga Letra',
    description: 'Ayusin ang mga letra upang makabuo ng salita!',
    cover_image: '',
    bg_color: '#F59E0B',
    tag: '🔤 Spelling',
  },
  {
    id: 'pop_balloon',
    slug: 'pop-balloon',
    title: 'Pop Balloon',
    description: 'I-pop ang tamang balloon batay sa larawan!',
    cover_image: '',
    bg_color: '#EF4444',
    tag: '🎈 Mabilis',
  },
];

const GAME_EMOJIS: Record<string, string> = {
  memory_match: '🃏',
  paghahanap_larawan: '🔍',
  hulaan_salita: '💬',
  gulong_letra: '🔤',
  pop_balloon: '🎈',
};

export default function MiniGamesScreen() {
  usePresence('Pinipili ng Laro (Mini-Games)', 'minigame_select');

  const handleSelectGame = (game: MiniGame) => {
    router.push(`/(student)/games/${game.slug}` as any);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, Shadows.soft]}>
          <Text style={styles.headerEmoji}>🎮</Text>
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
    backgroundColor: '#F0F9FF',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 52,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    marginRight: 12,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
