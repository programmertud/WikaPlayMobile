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

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role?: 'student' | 'teacher';
    section?: string;
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
    }>(`categories/${slug}/quizzes/${difficulty}`);
  },
};

export const quizService = {
  submitQuiz: async (payload: {
    category_id: number;
    difficulty: QuizDifficulty;
    answers: { question_id: number; selected_answer: string }[];
  }) => {
    return ApiClient.post<{
      message: string;
      session: QuizResultSession;
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
    duration_seconds?: number;
    metadata?: any;
  }) => {
    return ApiClient.post<{
      message: string;
      session: {
        id: number;
        score: number;
        stars_awarded: number;
        stars_balance: number;
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
    return ApiClient.get<{ stars_balance: number; history: { data: any[] } }>('rewards/stars-history');
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

  saveFlashcard: async (flashcard: Partial<Flashcard>) => {
    return ApiClient.post<{ message: string; flashcard: Flashcard }>('teacher/flashcards', flashcard);
  },

  deleteFlashcard: async (id: number) => {
    return ApiClient.delete(`teacher/flashcards/${id}`);
  },

  toggleQuizLock: async (payload: { category_id: number; difficulty: QuizDifficulty; is_locked: boolean }) => {
    return ApiClient.post<{ message: string; availability: any }>('teacher/quizzes/toggle-lock', payload);
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
};
