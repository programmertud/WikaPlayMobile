import { AchievementBadge, AchievementsResponse } from '../services/api';
import {
  getCachedClaimedBadges,
  getLatestCachedUser,
} from '../services/offline/offline-session-store';

export const BADGES_CATALOG: Omit<AchievementBadge, 'status'>[] = [
  {
    key: 'first_star',
    title: 'First Star',
    filipino_title: 'Unang Bituin',
    threshold: 10,
    icon: '🌱',
    description: 'Makaipon ng 10 bituin - Simula ng isang bagong paglalakbay!',
  },
  {
    key: 'star_collector',
    title: 'Star Collector',
    filipino_title: 'Kolektor ng Bituin',
    threshold: 50,
    icon: '⭐',
    description: 'Makaipon ng 50 na kabuuang bituin.',
  },
  {
    key: 'super_learner',
    title: 'Super Learner',
    filipino_title: 'Super Mag-aaral',
    threshold: 100,
    icon: '🌟',
    description: 'Makaipon ng 100 na kabuuang bituin.',
  },
  {
    key: 'bookworm',
    title: 'Bookworm',
    filipino_title: 'Mahilig Magbasa',
    threshold: 150,
    icon: '📚',
    description: 'Patunay na masipag kang matuto — 150 bituin na!',
  },
  {
    key: 'quiz_master',
    title: 'Quiz Master',
    filipino_title: 'Dalubhasa sa Pagsusulit',
    threshold: 200,
    icon: '🎯',
    description: 'Makaipon ng 200 na kabuuang bituin.',
  },
  {
    key: 'rising_star',
    title: 'Rising Star',
    filipino_title: 'Papasikat na Bituin',
    threshold: 250,
    icon: '🚀',
    description: 'Ika-250 na bituin — patuloy kang lumalayo sa iba!',
  },
  {
    key: 'learning_champion',
    title: 'Learning Champion',
    filipino_title: 'Kampeon ng Karunungan',
    threshold: 300,
    icon: '🏆',
    description: 'Makaipon ng 300 na kabuuang bituin.',
  },
  {
    key: 'word_wizard',
    title: 'Word Wizard',
    filipino_title: 'Salamangkero ng Salita',
    threshold: 360,
    icon: '🪄',
    description: '360 bituin — talagang mahusay ka sa mga salita!',
  },
  {
    key: 'ultimate_learner',
    title: 'Ultimate Learner',
    filipino_title: 'Tunay na Henyo ng WikaPlay',
    threshold: 480,
    icon: '👑',
    description: 'Makaipon ng 480 na kabuuang bituin (Lahat ng kategorya).',
  },
  {
    key: 'knowledge_seeker',
    title: 'Knowledge Seeker',
    filipino_title: 'Tagahangad ng Kaalaman',
    threshold: 600,
    icon: '🔭',
    description: '600 bituin — walang tigil sa paghahanap ng kaalaman!',
  },
  {
    key: 'legend',
    title: 'Legend',
    filipino_title: 'Alamat ng WikaPlay',
    threshold: 750,
    icon: '🦅',
    description: '750 bituin — tunay kang alamat sa WikaPlay!',
  },
  {
    key: 'grandmaster',
    title: 'Grand Master',
    filipino_title: 'Pinakadakilang Henyo',
    threshold: 900,
    icon: '💎',
    description: '900 bituin — talino na walang katumbas!',
  },
  {
    key: 'wika_hero',
    title: 'Language Hero',
    filipino_title: 'Bayani ng Wika',
    threshold: 1100,
    icon: '🦸',
    description: '1,100 bituin — isang bayani sa Filipino!',
  },
  {
    key: 'galaxy_brain',
    title: 'Galaxy Brain',
    filipino_title: 'Utak ng Kalawakan',
    threshold: 1350,
    icon: '🌌',
    description: '1,350 bituin — pambihirang talino!',
  },
  {
    key: 'immortal_scholar',
    title: 'Immortal Scholar',
    filipino_title: 'Walang Hanggang Iskolar',
    threshold: 1650,
    icon: '🏛️',
    description: '1,650 bituin — rurok ng tagumpay!',
  },
];

/**
 * Build local achievements data when offline or fallback.
 */
export async function getOfflineAchievements(studentId?: number): Promise<AchievementsResponse> {
  const cachedUser = await getLatestCachedUser().catch(() => null);
  const effectiveId = studentId || cachedUser?.student_id || 1;
  const claimedBadges = await getCachedClaimedBadges(effectiveId).catch(() => []);
  const claimedMap = new Set(claimedBadges.map((b) => b.badge_key));
  const totalSpent = claimedBadges.reduce((sum, b) => sum + (b.cost || 0), 0);

  const spendableStars = cachedUser?.stars_balance_last_known || 0;
  const lifetimeStars = spendableStars + totalSpent;

  let nextMilestone: AchievementBadge | null = null;
  let currentMilestone: AchievementBadge | null = null;

  const badges: AchievementBadge[] = BADGES_CATALOG.map((b) => {
    const isClaimed = claimedMap.has(b.key);
    const isUnlocked = lifetimeStars >= b.threshold;

    let status: 'locked' | 'unlocked' | 'claimed' = 'locked';
    if (isClaimed) {
      status = 'claimed';
      currentMilestone = { ...b, status: 'claimed' };
    } else if (isUnlocked) {
      status = 'unlocked';
      currentMilestone = { ...b, status: 'unlocked' };
    } else if (!nextMilestone) {
      nextMilestone = { ...b, status: 'locked' };
    }

    return {
      ...b,
      status,
      claimed_at: isClaimed ? new Date().toISOString() : null,
    };
  });

  const prevThreshold: number = currentMilestone ? (currentMilestone as AchievementBadge).threshold : 0;
  const nextThreshold = nextMilestone ? (nextMilestone as AchievementBadge).threshold : 480;
  const range = Math.max(1, nextThreshold - prevThreshold);
  const earnedInRange = Math.max(0, Math.min(range, lifetimeStars - prevThreshold));
  const progressPct = Math.round((earnedInRange / range) * 100);

  return {
    stars_balance: spendableStars,
    lifetime_stars: lifetimeStars,
    spent_stars: totalSpent,
    current_milestone: currentMilestone,
    next_milestone: nextMilestone,
    milestone_progress_pct: progressPct,
    badges,
    missions: [
      {
        id: 'm_daily_quiz_5',
        type: 'daily',
        title: 'Sagutin ang 5 Tanong',
        description: 'Magsagot ng 5 tanong sa anumang pagsusulit ngayong araw.',
        progress: 0,
        target: 5,
        is_completed: false,
        reward_label: 'Tagumpay! 🎯',
      },
    ],
    recent_rewards: [],
  };
}
