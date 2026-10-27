import { ApiClient } from './client';
import {
  Category,
  Collectible,
  Flashcard,
  MiniGame,
  QuizDifficulty,
  QuizQuestion,
  QuizResultSession,
  StudentMonitoringItem,
  User,
} from '../../types';
import {
  cacheServerCollectibles,
  getOfflineCollectiblesCatalog,
} from '../offline/offline-session-store';

export * from './client';

export const authService = {
  login: async (credentials: { email: string; password: string; role?: string }) => {
    const data = await ApiClient.post<{ message: string; token: string; user: User }>(
      'auth/login',
      credentials
    );
    await ApiClient.setToken(data.token);
    return data;
  },

  studentLogin: async (name: string) => {
    const data = await ApiClient.post<{ message: string; token: string; user: User }>(
      'auth/student-login',
      { name }
    );
    await ApiClient.setToken(data.token);
    return data;
  },

  studentRegister: async (payload: { name: string; enrollment_code?: string }) => {
    const data = await ApiClient.post<{ message: string; token: string; user: User }>(
      'auth/student-register',
      payload
    );
    await ApiClient.setToken(data.token);
    return data;
  },

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role?: 'student' | 'teacher';
    section_name?: string; // Name of the section this teacher will manage
  }) => {
    const data = await ApiClient.post<{ message: string; token: string; user: User }>(
      'auth/register',
      payload
    );
    await ApiClient.setToken(data.token);
    return data;
  },

  getMe: async () => {
    return ApiClient.get<{
      user: User;
      stats: {
        stars_balance: number;
        unlocked_collectibles_count: number;
        quizzes_passed_count: number;
        minigames_played_count: number;
      };
    }>('auth/me');
  },

  logout: async () => {
    try {
      await ApiClient.post('auth/logout');
    } finally {
      await ApiClient.setToken(null);
    }
  },

  updateProfile: async (payload: { name?: string; avatar?: string; section?: string }) => {
    return ApiClient.put<{ message: string; user: User }>('auth/profile', payload);
  },

  uploadAvatar: async (formData: FormData) => {
    return ApiClient.uploadFile<{ message: string; avatar: string; user: User }>('auth/upload-avatar', formData);
  },

  uploadAvatarBase64: async (base64: string) => {
    return ApiClient.post<{ message: string; avatar: string; user: User }>('auth/upload-avatar', {
      image_base64: base64,
    });
  },
};

export const categoryService = {
  getAll: async () => {
    const data = await ApiClient.get<{ categories: Category[] }>('categories');
    return data.categories;
  },

  getBySlug: async (slug: string) => {
    const data = await ApiClient.get<{ category: Category }>(`categories/${slug}`);
    return data.category;
  },

  getFlashcards: async (slug: string) => {
    const data = await ApiClient.get<{
      category: { id: number; slug: string; name: string; color: string };
      flashcards: Flashcard[];
    }>(`categories/${slug}/flashcards`);
    return data;
  },

  getQuizQuestions: async (slug: string, difficulty: QuizDifficulty) => {
    return ApiClient.get<{
      category: { id: number; slug: string; name: string; color: string };
      difficulty: QuizDifficulty;
      is_locked: boolean;
      pass_score: number;
      questions: QuizQuestion[];
    }>(`categories/${slug}/quizzes/${difficulty}`).catch((error: any) => {
      if (error?.status === 403 || error?.response?.status === 403) {
        return { is_locked: true, category: { name: slug, id: 0, color: '' }, difficulty, pass_score: 3, questions: [] };
      }
      throw error;
    });
  },
};

export const quizService = {
  submitQuiz: async (payload: {
    category_id: number;
    difficulty: QuizDifficulty;
    session_id?: string;
    answers: { question_id: any; selected_answer: string; is_correct?: boolean }[];
  }) => {
    return ApiClient.post<{
      message: string;
      session: QuizResultSession;
      is_duplicate_submission?: boolean;
    }>('quizzes/submit', payload);
  },

  getHistory: async () => {
    return ApiClient.get<{ data: any[] }>('quizzes/history');
  },
};

export const minigameService = {
  getAll: async () => {
    const data = await ApiClient.get<{ games: MiniGame[] }>('minigames');
    return data.games;
  },

  getContent: async (gameType: string) => {
    return ApiClient.get<{ game_type: string; items: Flashcard[] }>(`minigames/${gameType}/content`);
  },

  submitResult: async (payload: {
    game_type: string;
    score: number;
    session_id?: string;
    duration_seconds?: number;
    metadata?: any;
  }) => {
    return ApiClient.post<{
      message: string;
      session: {
        id: number;
        session_id?: string;
        score: number;
        total_levels: number;
        stars_awarded: number;
        stars_balance: number;
        qualifies_for_collectible?: boolean;
        collectible?: Collectible & { is_duplicate?: boolean };
      };
    }>('minigames/submit', payload);
  },
};

export const rewardService = {
  getCollectibles: async () => {
    return ApiClient.get<{
      collectibles: Collectible[];
      stars_balance: number;
      total_unlocked: number;
      total_available: number;
    }>('rewards/collectibles');
  },

  unlockMystery: async () => {
    return ApiClient.post<{
      message: string;
      collectible?: Collectible;
      stars_balance?: number;
      all_unlocked?: boolean;
    }>('rewards/unlock-mystery');
  },

  getStarsHistory: async () => {
    return ApiClient.get<{
      stars_balance: number;
      total_earned: number;
      total_spent: number;
      history: { data: any[] };
    }>('rewards/stars-history');
  },

  getAchievements: async () => {
    return ApiClient.get<AchievementsResponse>('rewards/achievements');
  },

  claimBadge: async (badgeKey: string) => {
    return ApiClient.post<{
      message: string;
      badge: any;
      stars_balance?: number;
      lifetime_stars?: number;
      stars_spent?: number;
    }>('rewards/claim-badge', { badge_key: badgeKey });
  },
};

export interface AchievementBadge {
  key: string;
  title: string;
  filipino_title: string;
  threshold: number;
  icon: string;
  description: string;
  status: 'locked' | 'unlocked' | 'claimed';
  claimed_at?: string | null;
}

export interface LearningMission {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  progress: number;
  target: number;
  is_completed: boolean;
  reward_label: string;
}

export interface AchievementsResponse {
  stars_balance: number;
  lifetime_stars: number;
  spent_stars: number;
  current_milestone: AchievementBadge | null;
  next_milestone: AchievementBadge | null;
  milestone_progress_pct: number;
  badges: AchievementBadge[];
  missions: LearningMission[];
  recent_rewards: {
    id: number;
    amount: number;
    description: string;
    balance_after: number;
    created_at: string;
    created_at_human: string;
  }[];
}

export interface CategoryProgressItem {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  stars_earned: number;
  max_stars: number;
  attempts: number;
  accuracy: number;
  best_score: number;
  suggested_activity: string;
}

export interface StudentProfileStatsResponse {
  user: {
    id: number;
    student_id_code?: string;
    name: string;
    avatar?: string;
    section?: string;
    level: number;
    current_badge: string;
  };
  stats: {
    lifetime_stars: number;
    spendable_stars: number;
    spent_stars: number;
    total_sessions: number;
    quizzes_completed: number;
    minigames_completed: number;
    total_questions_answered: number;
    correct_answers: number;
    wrong_answers: number;
    overall_accuracy: number;
    collectibles_owned: number;
    total_collectibles: number;
    badges_earned_count: number;
    categories_practiced_count: number;
    personal_bests: Record<string, number>;
  };
  category_progress: CategoryProgressItem[];
  badges: AchievementBadge[];
  recent_activities: {
    id: string;
    type: 'quiz' | 'minigame';
    title: string;
    category: string;
    score: string;
    stars_awarded: number;
    completed_at: string;
    created_at_human: string;
  }[];
  encouragement: string;
}

export const studentService = {
  getProfileStats: async () => {
    return ApiClient.get<StudentProfileStatsResponse>('student/profile-stats');
  },

  updateAvatar: async (avatar: string) => {
    return ApiClient.put<{ message: string; avatar: string }>('student/avatar', { avatar });
  },
};

/** Collectible service — wraps rewardService with convenience helpers */
export const collectibleService = {
  /** Fetch all collectibles with the student's unlock status (with offline fallback) */
  getAll: async () => {
    try {
      const res = await rewardService.getCollectibles();
      if (res?.collectibles && res.collectibles.length > 0) {
        cacheServerCollectibles(res.collectibles).catch(() => {});
      }
      return res;
    } catch (err) {
      console.warn('[CollectibleService] Offline fallback loading collectibles album:', err);
      return await getOfflineCollectiblesCatalog();
    }
  },

  /** Fetch collectibles for a specific category slug */
  getByCategory: async (categoryName: string) => {
    const res = await collectibleService.getAll();
    const filtered = res.collectibles.filter(
      (c) => c.category === categoryName
    );
    return { ...res, collectibles: filtered };
  },

  /** Compute per-category progress from the full list */
  getCategoryProgress: (collectibles: Collectible[]) => {
    const map: Record<string, { total: number; unlocked: number }> = {};
    collectibles.forEach((c) => {
      const cat = c.category ?? 'Iba Pa';
      if (!map[cat]) map[cat] = { total: 0, unlocked: 0 };
      map[cat].total += 1;
      if (c.is_unlocked) map[cat].unlocked += 1;
    });
    return map;
  },
};

export const presenceService = {
  heartbeat: async (payload: { activity?: string; screen?: string; game_or_quiz?: string }) => {
    return ApiClient.post<{ status: string; is_online: boolean; last_active_at: string }>(
      'presence/heartbeat',
      payload
    );
  },
};

export const teacherService = {
  getStudents: async () => {
    return ApiClient.get<{
      students: StudentMonitoringItem[];
      total_students: number;
      online_count: number;
      sections?: any[];
    }>('teacher/students');
  },

  getStudentHistory: async (studentId: number) => {
    return ApiClient.get<{
      student: User;
      quiz_history: any[];
      game_history: any[];
    }>(`teacher/students/${studentId}/history`);
  },

  getCategories: async () => {
    const data = await ApiClient.get<{ categories: Category[] }>('teacher/categories');
    return data.categories;
  },

  saveCategory: async (category: Partial<Category>) => {
    return ApiClient.post<{ message: string; category: Category }>('teacher/categories', category);
  },

  getFlashcards: async (params?: { category_id?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return ApiClient.get<{ flashcards: (Flashcard & { category?: Category })[]; total_flashcards: number }>(`teacher/flashcards${qs}`);
  },

  saveFlashcard: async (flashcard: Partial<Flashcard>) => {
    return ApiClient.post<{ message: string; flashcard: Flashcard }>('teacher/flashcards', flashcard);
  },

  deleteFlashcard: async (id: number) => {
    return ApiClient.delete(`teacher/flashcards/${id}`);
  },

  toggleQuizLock: async (payload: { category_id: number; difficulty?: QuizDifficulty | 'all' | string; is_locked: boolean }) => {
    return ApiClient.post<{ message: string; availability: any; availabilities?: any; is_locked: boolean }>('teacher/quizzes/toggle-lock', payload);
  },

  getQuizQuestions: async (categoryId: number, difficulty: QuizDifficulty) => {
    return ApiClient.get<{
      category: Category;
      difficulty: QuizDifficulty;
      availability: any;
      questions: QuizQuestion[];
      available_flashcards: Flashcard[];
    }>(`teacher/quizzes/${categoryId}/${difficulty}`);
  },

  saveQuizQuestion: async (question: Partial<QuizQuestion> & { category_id: number; difficulty: QuizDifficulty }) => {
    return ApiClient.post<{ message: string; question: QuizQuestion }>('teacher/quizzes/question', question);
  },

  uploadAudio: async (formData: FormData) => {
    return ApiClient.uploadFile<{ message: string; path: string; url: string }>('teacher/upload-audio', formData);
  },

  uploadImage: async (formData: FormData) => {
    return ApiClient.uploadFile<{ message: string; path: string; url: string }>('teacher/upload-image', formData);
  },

  deleteQuizQuestion: async (id: number) => {
    return ApiClient.delete(`teacher/quizzes/question/${id}`);
  },

  updateStudentStatus: async (studentId: number, status: 'active' | 'pending_approval' | 'disabled') => {
    return ApiClient.put<{ message: string; student: User }>(`teacher/students/${studentId}/status`, { status });
  },

  getDashboardStats: async () => {
    return ApiClient.get<{
      stats: {
        total_students: number;
        online_students: number;
        recently_active_students: number;
        offline_students: number;
        total_quiz_attempts: number;
        completed_minigames: number;
        total_sessions: number;
        average_quiz_score: number;
        average_accuracy: number;
        average_progress: number;
        total_stars_earned: number;
        total_stars_available: number;
        total_stars_spent: number;
        total_badges_earned: number;
        total_collectibles_claimed: number;
      };
      charts?: {
        participation_over_time: { day: string; date: string; quizzes: number; minigames: number; total: number }[];
        category_performance: { id: number; name: string; color: string; attempts: number; accuracy: number; avg_score: number }[];
        activity_completion: { quizzes_passed: number; quizzes_failed: number; minigames_completed: number; mystery_box_qualified: number };
        star_history: { day: string; date: string; earned: number; spent: number }[];
      };
      recent_activities: any[];
      recent_quiz_results: any[];
      recent_minigame_results?: any[];
      active_students?: any[];
    }>('teacher/dashboard');
  },

  adjustStudentStars: async (studentId: number, amount: number, reason: string) => {
    return ApiClient.post<{
      message: string;
      student: { id: number; name: string; stars_balance: number };
      transaction: any;
    }>(`teacher/students/${studentId}/adjust-stars`, { amount, reason });
  },

  getMinigamesOverview: async () => {
    return ApiClient.get<{
      games: {
        id: string;
        title: string;
        description: string;
        rules: string;
        color: string;
        total_plays: number;
        average_score: number;
        qualifiers_count: number;
        stars_awarded: number;
      }[];
      recent_sessions: any[];
      total_completed_sessions: number;
      total_qualifying_sessions: number;
    }>('teacher/minigames');
  },

  getCollectibles: async (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return ApiClient.get<{
      collectibles: (Collectible & { claims_count?: number })[];
      total_collectibles: number;
      total_claims: number;
      categories: string[];
    }>(`teacher/collectibles${qs}`);
  },

  saveCollectible: async (collectible: Partial<Collectible>) => {
    return ApiClient.post<{ message: string; collectible: Collectible }>('teacher/collectibles', collectible);
  },

  getRewardAudit: async () => {
    return ApiClient.get<{
      total_earned: number;
      total_spendable: number;
      total_spent: number;
      badge_stats: { key: string; title: string; threshold: number; claimed_count: number }[];
      recent_transactions: any[];
    }>('teacher/rewards-audit');
  },

  exportReportsCsv: async (type: 'quizzes' | 'minigames' | 'stars' | 'students' = 'quizzes') => {
    return ApiClient.get<{ csv: string; filename: string; total_records: number }>(`teacher/reports/export-csv?type=${type}`);
  },

  getMySections: async () => {
    return ApiClient.get<{
      sections: {
        id: number;
        name: string;
        school_year: string;
        status: string;
        enrollment_code: string;
        students_count: number;
      }[];
    }>('teacher/sections');
  },

  activateSection: async (id: number) => {
    return ApiClient.post<{ message: string; section: any }>(`teacher/sections/${id}/activate`);
  },

  rotateEnrollmentCode: async (id: number) => {
    return ApiClient.post<{ message: string; enrollment_code: string }>(`teacher/sections/${id}/rotate-code`);
  },

  archiveSection: async (id: number) => {
    return ApiClient.post<{ message: string }>(`teacher/sections/${id}/archive`);
  },
};

// Section service — public + teacher management
export const sectionService = {
  /** Public listing of active sections (used by student registration) */
  getPublicSections: async () => {
    return ApiClient.get<{
      sections: { id: number; name: string; school_year: string; teacher: string | null }[];
    }>('sections');
  },
};
