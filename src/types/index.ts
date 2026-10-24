export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  name: string;
  email?: string | null;
  role: UserRole;
  avatar?: string | null;
  section?: string | null;
  stars_balance: number;
  student_id_code?: string | null;
  status?: 'active' | 'pending_approval' | 'disabled';
}

export type QuizDifficulty = 'madali' | 'katamtaman' | 'mahirap';

export interface QuizAvailabilityItem {
  is_locked: boolean;
  pass_score: number;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  color: string;
  icon?: string;
  flashcards_count?: number;
  quiz_availabilities?: Record<QuizDifficulty, QuizAvailabilityItem>;
  quizAvailabilities?: any;
  is_locked?: boolean;
  flashcards?: Flashcard[];
}

export interface Flashcard {
  id: number;
  category_id: number;
  name: string;
  filipino_name: string;
  english_name?: string | null;
  description?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface ChoiceItem {
  id: string;
  image_url: string;
  text: string;
  vocabularyItem?: VocabularyItem;
}

export interface QuizQuestion {
  id: number;
  category_id?: number;
  flashcard_id?: number | null;
  question_text?: string;
  audio_url?: string | null;
  target_image_url: string;
  target_item_name?: string;
  targetItem?: VocabularyItem;
  choices: ChoiceItem[];
  correct_answer: string;
  points: number;
  difficulty: QuizDifficulty;
}

export interface QuizResultSession {
  id: number;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  passed: boolean;
  stars_awarded: number;
  stars_balance: number;
}

export interface MiniGame {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  bg_color: string;
  tag: string;
}

export interface Collectible {
  id: number;
  slug: string;
  name: string;
  filipino_name: string;
  category?: string;
  description: string;
  image_url?: string | null;
  audio_url?: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  required_stars: number;
  is_unlocked: boolean;
  unlocked_at?: string | null;
  is_duplicate?: boolean;
}

export interface StudentMonitoringItem {
  id: number;
  name: string;
  email?: string | null;
  student_id_code?: string | null;
  status?: 'active' | 'pending_approval' | 'disabled';
  avatar?: string | null;
  section?: string | null;
  stars_balance: number;
  lifetime_stars?: number;
  stars_spent?: number;
  badges_count?: number;
  quizzes_passed: number;
  games_played: number;
  collectibles_count: number;
  is_online: boolean;
  current_activity: string;
  current_screen?: string | null;
  current_game_or_quiz?: string | null;
  last_active_at: string;
}

export type VocabularyItem = {
  id: string;
  categoryId: string;
  filipino: string;
  english: string;
  image?: any;
  imageUri?: string;
  audio?: any;
  audioUri?: string;
  colorCode?: string;
  shapeType?: string;
  quantity?: number;
  emoji?: string;
};

export type LearningCategory = {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  color: string;
  icon: string;
  logoImage?: any;
  description?: string;
  items: VocabularyItem[];
};
