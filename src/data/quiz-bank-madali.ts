/**
 * WikaPlay — Madali (Easy) Quiz Question Bank
 *
 * 8 categories × 20 questions = 160 total.
 *   Q 1–10  : Vocabulary multiple-choice (text choices A / B / C / D)
 *   Q 11–20 : Picture-identification  (choices built from VocabularyItem)
 *
 * For Mga Pagbati, Q 11–20 are situational multiple-choice questions
 * (no picture prompt) because greeting scenarios cannot be illustrated
 * meaningfully with a single static image.
 */

import { getMadaliAudioById } from "../utils/quiz-madali-audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MadaliQuestionType =
  | "multiple-choice"
  | "picture-id"
  | "situational";

export interface MadaliTextChoice {
  id: "A" | "B" | "C" | "D";
  text: string;
}

/**
 * For picture-id questions the choices are vocabulary item IDs drawn
 * from the category so the existing ItemVisual component can render them.
 */
export interface MadaliPicChoice {
  id: "A" | "B" | "C" | "D";
  vocabId: string; // matches VocabularyItem.id
  text: string; // Filipino label shown below the visual
}

export interface MadaliQuestion {
  /** Stable unique ID, never change once released. */
  id: string;
  categoryId: string; // LearningCategory.id  e.g. 'cat_hayop'
  categorySlug: string; // LearningCategory.slug e.g. 'mga-hayop'
  difficulty: "madali";
  type: MadaliQuestionType;
  questionFil: string;
  questionEn: string;
  /** Text choices — present only on type 'multiple-choice' | 'situational' */
  textChoices?: MadaliTextChoice[];
  /** Correct text-choice id (A/B/C/D) */
  correctTextId?: "A" | "B" | "C" | "D";
  /** Picture choices — present only on type 'picture-id' */
  picChoices?: MadaliPicChoice[];
  /** Correct picture-choice vocabId */
  correctVocabId?: string;
  /** Accurate pre-recorded voice audio file */
  audio?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mc(
  id: string,
  catId: string,
  catSlug: string,
  fil: string,
  en: string,
  choices: [string, string, string, string],
  correctIdx: 0 | 1 | 2 | 3,
  audio?: any,
): MadaliQuestion {
  const ids: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  return {
    id,
    categoryId: catId,
    categorySlug: catSlug,
    difficulty: "madali",
    type: "multiple-choice",
    questionFil: fil,
    questionEn: en,
    textChoices: choices.map((text, i) => ({ id: ids[i], text })),
    correctTextId: ids[correctIdx],
    audio: audio ?? getMadaliAudioById(id),
  };
}

function pic(
  id: string,
  catId: string,
  catSlug: string,
  fil: string,
  en: string,
  choices: [string, string, string, string], // VocabularyItem ids
  correctIdx: 0 | 1 | 2 | 3,
  labels: [string, string, string, string], // Filipino labels for each choice
  audio?: any,
): MadaliQuestion {
  const ids: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  const correctVocabId = choices[correctIdx];

  // Combine items to allow deterministic shuffle
  const items = choices.map((vocabId, i) => ({
    vocabId,
    text: labels[i],
    isCorrect: i === correctIdx,
  }));

  // Deterministic rotation so correct answer is distributed across A, B, C, D
  let shift = 0;
  for (let i = 0; i < id.length; i++) {
    shift = (shift * 31 + id.charCodeAt(i)) % 4;
  }
  const rotatedItems = [...items.slice(shift), ...items.slice(0, shift)];
  const newCorrectIdx = rotatedItems.findIndex((it) => it.isCorrect);

  return {
    id,
    categoryId: catId,
    categorySlug: catSlug,
    difficulty: "madali",
    type: "picture-id",
    questionFil: fil,
    questionEn: en,
    textChoices: rotatedItems.map((item, i) => ({
      id: ids[i],
      text: item.text,
    })),
    correctTextId: ids[newCorrectIdx] as "A" | "B" | "C" | "D",
    picChoices: rotatedItems.map((item, i) => ({
      id: ids[i],
      vocabId: item.vocabId,
      text: item.text,
    })),
    correctVocabId,
    audio: audio ?? getMadaliAudioById(id),
  };
}

function sit(
  id: string,
  catId: string,
  catSlug: string,
  fil: string,
  en: string,
  choices: [string, string, string, string],
  correctIdx: 0 | 1 | 2 | 3,
  audio?: any,
): MadaliQuestion {
  const ids: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  return {
    id,
    categoryId: catId,
    categorySlug: catSlug,
    difficulty: "madali",
    type: "situational",
    questionFil: fil,
    questionEn: en,
    textChoices: choices.map((text, i) => ({ id: ids[i], text })),
    correctTextId: ids[correctIdx],
    audio: audio ?? getMadaliAudioById(id),
  };
}

// ---------------------------------------------------------------------------
// 1. MGA HAYOP  (cat_hayop / mga-hayop)
// ---------------------------------------------------------------------------

const hayopQuestions: MadaliQuestion[] = [
  // Q1–10: Vocabulary multiple-choice
  mc(
    "hayop-01",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Tagalog ang "Dog"?',
    'What is the Tagalog word for "Dog"?',
    ["Pusa", "Aso", "Baka", "Kabayo"],
    1,
  ),

  mc(
    "hayop-02",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Ingles ang "Pusa"?',
    'What is the English word for "Pusa"?',
    ["Dog", "Chicken", "Cat", "Mouse"],
    2,
  ),

  mc(
    "hayop-03",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Tagalog ang "Cow"?',
    'What is the Tagalog word for "Cow"?',
    ["Kambing", "Baka", "Kabayo", "Baboy"],
    1,
  ),

  mc(
    "hayop-04",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Tagalog ang "Horse"?',
    'What is the Tagalog word for "Horse"?',
    ["Kambing", "Kabayo", "Kalabaw", "Baboy"],
    1,
  ),

  mc(
    "hayop-05",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Tagalog ang "Lion"?',
    'What is the Tagalog word for "Lion"?',
    ["Tigre", "Oso", "Leon", "Unggoy"],
    2,
  ),

  mc(
    "hayop-06",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Ingles ang "Tigre"?',
    'What is the English word for "Tigre"?',
    ["Lion", "Tiger", "Bear", "Wolf"],
    1,
  ),

  mc(
    "hayop-07",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Ingles ang "Kambing"?',
    'What is the English word for "Kambing"?',
    ["Cow", "Horse", "Goat", "Sheep"],
    2,
  ),

  mc(
    "hayop-08",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Ingles ang "Unggoy"?',
    'What is the English word for "Unggoy"?',
    ["Tiger", "Monkey", "Cat", "Chicken"],
    1,
  ),

  mc(
    "hayop-09",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Ingles ang "Baboy"?',
    'What is the English word for "Baboy"?',
    ["Cow", "Pig", "Goat", "Horse"],
    1,
  ),

  mc(
    "hayop-10",
    "cat_hayop",
    "mga-hayop",
    'Ano sa Tagalog ang "Chicken"?',
    'What is the Tagalog word for "Chicken"?',
    ["Pato", "Manok", "Ibon", "Pabo"],
    1,
  ),

  // Q11–20: Picture identification
  pic(
    "hayop-11",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_aso", "hayop_pusa", "hayop_ibon", "hayop_isda"],
    0,
    ["Aso", "Pusa", "Ibon", "Isda"],
  ),

  pic(
    "hayop-12",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_pusa", "hayop_daga", "hayop_baboy", "hayop_aso"],
    0,
    ["Pusa", "Daga", "Baboy", "Aso"],
  ),

  pic(
    "hayop-13",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_kabayo", "hayop_kambing", "hayop_kalabaw", "hayop_baboy"],
    0,
    ["Kabayo", "Kambing", "Kalabaw", "Baboy"],
  ),

  pic(
    "hayop-14",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_tigre", "hayop_leon", "hayop_unggoy", "hayop_kabayo"],
    1,
    ["Tigre", "Leon", "Unggoy", "Kabayo"],
  ),

  pic(
    "hayop-15",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_palaka", "hayop_pagong", "hayop_ahas", "hayop_isda"],
    0,
    ["Palaka", "Pagong", "Ahas", "Isda"],
  ),

  pic(
    "hayop-16",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_bubuyog", "hayop_gagamba", "hayop_daga", "hayop_ibon"],
    0,
    ["Bubuyog", "Gagamba", "Daga", "Ibon"],
  ),

  pic(
    "hayop-17",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_pating", "hayop_pugita", "hayop_isda", "hayop_palaka"],
    0,
    ["Pating", "Pugita", "Isda", "Palaka"],
  ),

  pic(
    "hayop-18",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_manok", "hayop_ibon", "hayop_baboy", "hayop_aso"],
    0,
    ["Manok", "Ibon", "Baboy", "Aso"],
  ),

  pic(
    "hayop-19",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_unggoy", "hayop_tigre", "hayop_leon", "hayop_kabayo"],
    0,
    ["Unggoy", "Tigre", "Leon", "Kabayo"],
  ),

  pic(
    "hayop-20",
    "cat_hayop",
    "mga-hayop",
    "Anong hayop ang nasa litrato?",
    "What animal is in the picture?",
    ["hayop_pagong", "hayop_palaka", "hayop_isda", "hayop_ahas"],
    0,
    ["Pagong", "Palaka", "Isda", "Ahas"],
  ),
];

// ---------------------------------------------------------------------------
// 2. MGA PRUTAS  (cat_prutas / mga-prutas)
// ---------------------------------------------------------------------------

const prutasQuestions: MadaliQuestion[] = [
  mc(
    "prutas-01",
    "cat_prutas",
    "mga-prutas",
    'Ano sa Ingles ang "Saging"?',
    'What is the English word for "Saging"?',
    ["Mango", "Banana", "Guava", "Grapes"],
    1,
  ),

  mc(
    "prutas-02",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Ingles ng "Mangga"?',
    'What is the English word for "Mangga"?',
    ["Papaya", "Pear", "Mango", "Grapes"],
    2,
  ),

  mc(
    "prutas-03",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Watermelon"?',
    'What is the Tagalog word for "Watermelon"?',
    ["Melon", "Langka", "Mangga", "Pakwan"],
    3,
  ),

  mc(
    "prutas-04",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Apple"?',
    'What is the Tagalog word for "Apple"?',
    ["Mansanas", "Bayabas", "Presas", "Abukado"],
    0,
  ),

  mc(
    "prutas-05",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Grapes"?',
    'What is the Tagalog word for "Grapes"?',
    ["Seresa", "Presas", "Ubas", "Santol"],
    2,
  ),

  mc(
    "prutas-06",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Strawberry"?',
    'What is the Tagalog word for "Strawberry"?',
    ["Seresa", "Presas", "Rambutan", "Santol"],
    1,
  ),

  mc(
    "prutas-07",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Ingles ng "Bayabas"?',
    'What is the English word for "Bayabas"?',
    ["Papaya", "Avocado", "Jackfruit", "Guava"],
    3,
  ),

  mc(
    "prutas-08",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Pear"?',
    'What is the Tagalog word for "Pear"?',
    ["Peras", "Mansanas", "Seresa", "Santol"],
    0,
  ),

  mc(
    "prutas-09",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Ingles ng "Langka"?',
    'What is the English word for "Langka"?',
    ["Durian", "Sugar Apple", "Jackfruit", "Star Fruit"],
    2,
  ),

  mc(
    "prutas-10",
    "cat_prutas",
    "mga-prutas",
    'Ano ang Tagalog ng "Avocado"?',
    'What is the Tagalog word for "Avocado"?',
    ["Abukado", "Atis", "Durian", "Balimbing"],
    0,
  ),

  pic(
    "prutas-11",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_saging", "prutas_mangga", "prutas_pakwan", "prutas_ubas"],
    0,
    ["Saging", "Mangga", "Pakwan", "Ubas"],
  ),

  pic(
    "prutas-12",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_mangga", "prutas_papaya", "prutas_saging", "prutas_peras"],
    0,
    ["Mangga", "Papaya", "Saging", "Peras"],
  ),

  pic(
    "prutas-13",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_mansanas", "prutas_bayabas", "prutas_presas", "prutas_abukado"],
    0,
    ["Mansanas", "Bayabas", "Presas", "Abukado"],
  ),

  pic(
    "prutas-14",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_ubas", "prutas_seresa", "prutas_rambutan", "prutas_saging"],
    0,
    ["Ubas", "Seresa", "Rambutan", "Saging"],
  ),

  pic(
    "prutas-15",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_pakwan", "prutas_melon", "prutas_papaya", "prutas_bayabas"],
    0,
    ["Pakwan", "Melon", "Papaya", "Bayabas"],
  ),

  pic(
    "prutas-16",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_presas", "prutas_seresa", "prutas_ubas", "prutas_rambutan"],
    0,
    ["Presas", "Seresa", "Ubas", "Rambutan"],
  ),

  pic(
    "prutas-17",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_abukado", "prutas_atis", "prutas_durian", "prutas_langka"],
    0,
    ["Abukado", "Atis", "Durian", "Langka"],
  ),

  pic(
    "prutas-18",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_peras", "prutas_mansanas", "prutas_seresa", "prutas_santol"],
    0,
    ["Peras", "Mansanas", "Seresa", "Santol"],
  ),

  pic(
    "prutas-19",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_langka", "prutas_durian", "prutas_balimbing", "prutas_buko"],
    0,
    ["Langka", "Durian", "Balimbing", "Buko"],
  ),

  pic(
    "prutas-20",
    "cat_prutas",
    "mga-prutas",
    "Anong prutas ang nasa litrato?",
    "What fruit is in the picture?",
    ["prutas_buko", "prutas_kakao", "prutas_santol", "prutas_melon"],
    0,
    ["Buko", "Kakao", "Santol", "Melon"],
  ),
];

// ---------------------------------------------------------------------------
// 3. MGA GULAY  (cat_gulay / mga-gulay)
// ---------------------------------------------------------------------------

const gulayQuestions: MadaliQuestion[] = [
  mc(
    "gulay-01",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Tagalog ang "Carrot"?',
    'What is the Tagalog word for "Carrot"?',
    ["Karot", "Kamatis", "Kalabasa", "Kangkong"],
    0,
  ),

  mc(
    "gulay-02",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Tagalog ang "Tomato"?',
    'What is the Tagalog word for "Tomato"?',
    ["Karot", "Kamatis", "Okra", "Talong"],
    1,
  ),

  mc(
    "gulay-03",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Ingles ang "Talong"?',
    'What is the English word for "Talong"?',
    ["Broccoli", "Spinach", "Eggplant", "Radish"],
    2,
  ),

  mc(
    "gulay-04",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Tagalog ang "Cabbage"?',
    'What is the Tagalog word for "Cabbage"?',
    ["Repolyo", "Pechay", "Espinaka", "Koliplor"],
    0,
  ),

  mc(
    "gulay-05",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Ingles ang "Kalabasa"?',
    'What is the English word for "Kalabasa"?',
    ["Potato", "Squash", "Cabbage", "Cucumber"],
    1,
  ),

  mc(
    "gulay-06",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Ingles ang "Patatas"?',
    'What is the English word for "Patatas"?',
    ["Tomato", "Potato", "Carrot", "Pumpkin"],
    1,
  ),

  mc(
    "gulay-07",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Tagalog ang "Broccoli"?',
    'What is the Tagalog word for "Broccoli"?',
    ["Koliplor", "Brokoli", "Repolyo", "Espinaka"],
    1,
  ),

  mc(
    "gulay-08",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Ingles ang "Koliplor"?',
    'What is the English word for "Koliplor"?',
    ["Broccoli", "Cabbage", "Cauliflower", "Lettuce"],
    2,
  ),

  mc(
    "gulay-09",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Ingles ang "Kangkong"?',
    'What is the English word for "Kangkong"?',
    ["Water Spinach", "Cabbage", "Eggplant", "Corn"],
    0,
  ),

  mc(
    "gulay-10",
    "cat_gulay",
    "mga-gulay",
    'Ano sa Tagalog ang "Bitter Melon"?',
    'What is the Tagalog word for "Bitter Melon"?',
    ["Ampalaya", "Upo", "Sayote", "Pipino"],
    0,
  ),

  pic(
    "gulay-11",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_karot", "gulay_kamatis", "gulay_talong", "gulay_mais"],
    0,
    ["Karot", "Kamatis", "Talong", "Mais"],
  ),

  pic(
    "gulay-12",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_kamatis", "gulay_talong", "gulay_okra", "gulay_karot"],
    0,
    ["Kamatis", "Talong", "Okra", "Karot"],
  ),

  pic(
    "gulay-13",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_mais", "gulay_kalabasa", "gulay_patatas", "gulay_upo"],
    0,
    ["Mais", "Kalabasa", "Patatas", "Upo"],
  ),

  pic(
    "gulay-14",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_talong", "gulay_okra", "gulay_sitaw", "gulay_pipino"],
    0,
    ["Talong", "Okra", "Sitaw", "Pipino"],
  ),

  pic(
    "gulay-15",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_brokoli", "gulay_repolyo", "gulay_espinaka", "gulay_koliplor"],
    0,
    ["Brokoli", "Repolyo", "Espinaka", "Koliplor"],
  ),

  pic(
    "gulay-16",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_patatas", "gulay_kamatis", "gulay_karot", "gulay_mais"],
    0,
    ["Patatas", "Kamatis", "Karot", "Mais"],
  ),

  pic(
    "gulay-17",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_pipino", "gulay_upo", "gulay_ampalaya", "gulay_sitaw"],
    0,
    ["Pipino", "Upo", "Ampalaya", "Sitaw"],
  ),

  pic(
    "gulay-18",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_sibuyas", "gulay_bawang", "gulay_luya", "gulay_labanos"],
    0,
    ["Sibuyas", "Bawang", "Luya", "Labanos"],
  ),

  pic(
    "gulay-19",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_kangkong", "gulay_espinaka", "gulay_sitaw", "gulay_okra"],
    0,
    ["Kangkong", "Espinaka", "Sitaw", "Okra"],
  ),

  pic(
    "gulay-20",
    "cat_gulay",
    "mga-gulay",
    "Anong gulay ang nasa litrato?",
    "What vegetable is in the picture?",
    ["gulay_ampalaya", "gulay_upo", "gulay_pipino", "gulay_kalabasa"],
    0,
    ["Ampalaya", "Upo", "Pipino", "Kalabasa"],
  ),
];

// ---------------------------------------------------------------------------
// 4. MGA BILANG  (cat_bilang / mga-bilang)
// ---------------------------------------------------------------------------

const bilangQuestions: MadaliQuestion[] = [
  mc(
    "bilang-01",
    "cat_bilang",
    "mga-bilang",
    'Ano ang Tagalog ng "One"?',
    'What is the Tagalog word for "One"?',
    ["Dalawa", "Isa", "Tatlo", "Apat"],
    1,
  ),

  mc(
    "bilang-02",
    "cat_bilang",
    "mga-bilang",
    'Ano ang English ng "Dalawa"?',
    'What is the English word for "Dalawa"?',
    ["One", "Two", "Three", "Four"],
    1,
  ),

  mc(
    "bilang-03",
    "cat_bilang",
    "mga-bilang",
    'Ano ang Tagalog ng "Three"?',
    'What is the Tagalog word for "Three"?',
    ["Isa", "Dalawa", "Tatlo", "Apat"],
    2,
  ),

  mc(
    "bilang-04",
    "cat_bilang",
    "mga-bilang",
    'Ano ang English ng "Apat"?',
    'What is the English word for "Apat"?',
    ["Three", "Four", "Five", "Six"],
    1,
  ),

  mc(
    "bilang-05",
    "cat_bilang",
    "mga-bilang",
    'Ano ang Tagalog ng "Five"?',
    'What is the Tagalog word for "Five"?',
    ["Anim", "Apat", "Lima", "Pito"],
    2,
  ),

  mc(
    "bilang-06",
    "cat_bilang",
    "mga-bilang",
    'Ano ang English ng "Anim"?',
    'What is the English word for "Anim"?',
    ["Five", "Six", "Seven", "Eight"],
    1,
  ),

  mc(
    "bilang-07",
    "cat_bilang",
    "mga-bilang",
    'Ano ang Tagalog ng "Seven"?',
    'What is the Tagalog word for "Seven"?',
    ["Walo", "Siyam", "Pito", "Anim"],
    2,
  ),

  mc(
    "bilang-08",
    "cat_bilang",
    "mga-bilang",
    'Ano ang English ng "Walo"?',
    'What is the English word for "Walo"?',
    ["Six", "Seven", "Eight", "Nine"],
    2,
  ),

  mc(
    "bilang-09",
    "cat_bilang",
    "mga-bilang",
    'Ano ang Tagalog ng "Nine"?',
    'What is the Tagalog word for "Nine"?',
    ["Walo", "Siyam", "Sampu", "Pito"],
    1,
  ),

  mc(
    "bilang-10",
    "cat_bilang",
    "mga-bilang",
    'Ano ang English ng "Sampu"?',
    'What is the English word for "Sampu"?',
    ["Eight", "Nine", "Seven", "Ten"],
    3,
  ),

  pic(
    "bilang-11",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_1", "bilang_2", "bilang_3", "bilang_4"],
    0,
    ["Isa", "Dalawa", "Tatlo", "Apat"],
  ),

  pic(
    "bilang-12",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_2", "bilang_1", "bilang_3", "bilang_4"],
    0,
    ["Dalawa", "Isa", "Tatlo", "Apat"],
  ),

  pic(
    "bilang-13",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_5", "bilang_4", "bilang_6", "bilang_7"],
    0,
    ["Lima", "Apat", "Anim", "Pito"],
  ),

  pic(
    "bilang-14",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_3", "bilang_2", "bilang_4", "bilang_5"],
    0,
    ["Tatlo", "Dalawa", "Apat", "Lima"],
  ),

  pic(
    "bilang-15",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_10", "bilang_8", "bilang_9", "bilang_7"],
    0,
    ["Sampu", "Walo", "Siyam", "Pito"],
  ),

  pic(
    "bilang-16",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_6", "bilang_5", "bilang_7", "bilang_8"],
    0,
    ["Anim", "Lima", "Pito", "Walo"],
  ),

  pic(
    "bilang-17",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_8", "bilang_7", "bilang_9", "bilang_10"],
    0,
    ["Walo", "Pito", "Siyam", "Sampu"],
  ),

  pic(
    "bilang-18",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_15", "bilang_14", "bilang_16", "bilang_13"],
    0,
    ["Labinlima", "Labing-apat", "Labing-anim", "Labintatlo"],
  ),

  pic(
    "bilang-19",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_20", "bilang_19", "bilang_18", "bilang_17"],
    0,
    ["Dalawampu", "Labinsiyam", "Labingwalo", "Labimpito"],
  ),

  pic(
    "bilang-20",
    "cat_bilang",
    "mga-bilang",
    "Anong bilang ang nasa litrato?",
    "What number is shown in the picture?",
    ["bilang_11", "bilang_12", "bilang_13", "bilang_14"],
    0,
    ["Labing-isa", "Labindalawa", "Labintatlo", "Labing-apat"],
  ),
];

// ---------------------------------------------------------------------------
// 5. MGA HUGIS  (cat_hugis / mga-hugis)
// ---------------------------------------------------------------------------

const hugisQuestions: MadaliQuestion[] = [
  mc(
    "hugis-01",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Tagalog ang "Circle"?',
    'What is the Tagalog word for "Circle"?',
    ["Tatsulok", "Bilog", "Parisukat", "Parihaba"],
    1,
  ),

  mc(
    "hugis-02",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Tagalog ang "Triangle"?',
    'What is the Tagalog word for "Triangle"?',
    ["Bilog", "Tatsulok", "Bituin", "Parihaba"],
    1,
  ),

  mc(
    "hugis-03",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Ingles ang "Parisukat"?',
    'What is the English word for "Parisukat"?',
    ["Rectangle", "Circle", "Square", "Triangle"],
    2,
  ),

  mc(
    "hugis-04",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Ingles ang "Bituin"?',
    'What is the English word for "Bituin"?',
    ["Heart", "Star", "Moon", "Sun"],
    1,
  ),

  mc(
    "hugis-05",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Ingles ang "Parihaba"?',
    'What is the English word for "Parihaba"?',
    ["Square", "Pentagon", "Rectangle", "Diamond"],
    2,
  ),

  mc(
    "hugis-06",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Tagalog ang "Heart"?',
    'What is the Tagalog word for "Heart"?',
    ["Hugis-puso", "Hugis-buwan", "Hugis-itlog", "Bituin"],
    0,
  ),

  mc(
    "hugis-07",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Tagalog ang "Oval"?',
    'What is the Tagalog word for "Oval"?',
    ["Hugis-buwan", "Bilog", "Hugis-itlog (Oval)", "Parihaba"],
    2,
  ),

  mc(
    "hugis-08",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Ingles ang "Diyamante"?',
    'What is the English word for "Diyamante"?',
    ["Star", "Diamond", "Heart", "Circle"],
    1,
  ),

  mc(
    "hugis-09",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Ingles ang "Hexagono"?',
    'What is the English word for "Hexagono"?',
    ["Oval", "Square", "Hexagon", "Circle"],
    2,
  ),

  mc(
    "hugis-10",
    "cat_hugis",
    "mga-hugis",
    'Ano sa Tagalog ang "Pentagon"?',
    'What is the Tagalog word for "Pentagon"?',
    ["Pentagono", "Hexagono", "Tatsulok", "Bilog"],
    0,
  ),

  pic(
    "hugis-11",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_bilog", "hugis_tatsulok", "hugis_parisukat", "hugis_parihaba"],
    0,
    ["Bilog", "Tatsulok", "Parisukat", "Parihaba"],
  ),

  pic(
    "hugis-12",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_tatsulok", "hugis_bilog", "hugis_bituin", "hugis_parihaba"],
    0,
    ["Tatsulok", "Bilog", "Bituin", "Parihaba"],
  ),

  pic(
    "hugis-13",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_parisukat", "hugis_parihaba", "hugis_bilog", "hugis_tatsulok"],
    0,
    ["Parisukat", "Parihaba", "Bilog", "Tatsulok"],
  ),

  pic(
    "hugis-14",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_bituin", "hugis_puso", "hugis_buwan", "hugis_bilog"],
    0,
    ["Bituin", "Hugis-puso", "Hugis-buwan", "Bilog"],
  ),

  pic(
    "hugis-15",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_puso", "hugis_bituin", "hugis_buwan", "hugis_krus"],
    0,
    ["Hugis-puso", "Bituin", "Hugis-buwan", "Krus"],
  ),

  pic(
    "hugis-16",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_diyamante", "hugis_bituin", "hugis_parisukat", "hugis_parihaba"],
    0,
    ["Diyamante", "Bituin", "Parisukat", "Parihaba"],
  ),

  pic(
    "hugis-17",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_itlog", "hugis_bilog", "hugis_parihaba", "hugis_parisukat"],
    0,
    ["Hugis-itlog", "Bilog", "Parihaba", "Parisukat"],
  ),

  pic(
    "hugis-18",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_hexagono", "hugis_pentagono", "hugis_oktagono", "hugis_bilog"],
    0,
    ["Hexagono", "Pentagono", "Oktagono", "Bilog"],
  ),

  pic(
    "hugis-19",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_krus", "hugis_bituin", "hugis_puso", "hugis_buwan"],
    0,
    ["Krus", "Bituin", "Hugis-puso", "Hugis-buwan"],
  ),

  pic(
    "hugis-20",
    "cat_hugis",
    "mga-hugis",
    "Anong hugis ang nasa litrato?",
    "What shape is shown in the picture?",
    ["hugis_parihaba", "hugis_parisukat", "hugis_bilog", "hugis_tatsulok"],
    0,
    ["Parihaba", "Parisukat", "Bilog", "Tatsulok"],
  ),
];

// ---------------------------------------------------------------------------
// 6. MGA KULAY  (cat_kulay / mga-kulay)
// ---------------------------------------------------------------------------

const kulayQuestions: MadaliQuestion[] = [
  mc(
    "kulay-01",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Tagalog ang "Red"?',
    'What is the Tagalog word for "Red"?',
    ["Asul", "Pula", "Berde", "Dilaw"],
    1,
  ),

  mc(
    "kulay-02",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Ingles ang "Asul"?',
    'What is the English word for "Asul"?',
    ["Red", "Green", "Blue", "Yellow"],
    2,
  ),

  mc(
    "kulay-03",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Ingles ang "Dilaw"?',
    'What is the English word for "Dilaw"?',
    ["Green", "Orange", "Yellow", "Pink"],
    2,
  ),

  mc(
    "kulay-04",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Tagalog ang "Green"?',
    'What is the Tagalog word for "Green"?',
    ["Berde", "Pula", "Asul", "Lila"],
    0,
  ),

  mc(
    "kulay-05",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Ingles ang "Kahel"?',
    'What is the English word for "Kahel"?',
    ["Purple", "Orange", "Pink", "Brown"],
    1,
  ),

  mc(
    "kulay-06",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Tagalog ang "Purple"?',
    'What is the Tagalog word for "Purple"?',
    ["Rosas", "Lila", "Kahel", "Abo"],
    1,
  ),

  mc(
    "kulay-07",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Ingles ang "Rosas"?',
    'What is the English word for "Rosas"?',
    ["Purple", "Orange", "Red", "Pink"],
    3,
  ),

  mc(
    "kulay-08",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Tagalog ang "Black"?',
    'What is the Tagalog word for "Black"?',
    ["Puti", "Itim", "Abo", "Kayumanggi"],
    1,
  ),

  mc(
    "kulay-09",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Tagalog ang "White"?',
    'What is the Tagalog word for "White"?',
    ["Abo", "Puti", "Itim", "Kayumanggi"],
    1,
  ),

  mc(
    "kulay-10",
    "cat_kulay",
    "mga-kulay",
    'Ano sa Ingles ang "Kayumanggi"?',
    'What is the English word for "Kayumanggi"?',
    ["Black", "Gray", "White", "Brown"],
    3,
  ),

  pic(
    "kulay-11",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_pula", "kulay_asul", "kulay_berde", "kulay_dilaw"],
    0,
    ["Pula", "Asul", "Berde", "Dilaw"],
  ),

  pic(
    "kulay-12",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_asul", "kulay_pula", "kulay_lila", "kulay_kahel"],
    0,
    ["Asul", "Pula", "Lila", "Kahel"],
  ),

  pic(
    "kulay-13",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_dilaw", "kulay_kahel", "kulay_pula", "kulay_berde"],
    0,
    ["Dilaw", "Kahel", "Pula", "Berde"],
  ),

  pic(
    "kulay-14",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_berde", "kulay_asul", "kulay_dilaw", "kulay_kayumanggi"],
    0,
    ["Berde", "Asul", "Dilaw", "Kayumanggi"],
  ),

  pic(
    "kulay-15",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_itim", "kulay_abo", "kulay_puti", "kulay_kayumanggi"],
    0,
    ["Itim", "Abo", "Puti", "Kayumanggi"],
  ),

  pic(
    "kulay-16",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_puti", "kulay_abo", "kulay_itim", "kulay_kayumanggi"],
    0,
    ["Puti", "Abo", "Itim", "Kayumanggi"],
  ),

  pic(
    "kulay-17",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_lila", "kulay_rosas", "kulay_asul", "kulay_pula"],
    0,
    ["Lila", "Rosas", "Asul", "Pula"],
  ),

  pic(
    "kulay-18",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_kahel", "kulay_dilaw", "kulay_pula", "kulay_kayumanggi"],
    0,
    ["Kahel", "Dilaw", "Pula", "Kayumanggi"],
  ),

  pic(
    "kulay-19",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_rosas", "kulay_lila", "kulay_pula", "kulay_asul"],
    0,
    ["Rosas", "Lila", "Pula", "Asul"],
  ),

  pic(
    "kulay-20",
    "cat_kulay",
    "mga-kulay",
    "Anong kulay ang nasa litrato?",
    "What color is shown in the picture?",
    ["kulay_kayumanggi", "kulay_abo", "kulay_itim", "kulay_puti"],
    0,
    ["Kayumanggi", "Abo", "Itim", "Puti"],
  ),
];

// ---------------------------------------------------------------------------
// 7. MGA BAHAGI NG KATAWAN  (cat_katawan / mga-bahagi-ng-katawan)
// ---------------------------------------------------------------------------

const katawanQuestions: MadaliQuestion[] = [
  mc(
    "katawan-01",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Tagalog ng "Head"?',
    'What is the Tagalog word for "Head"?',
    ["Leeg", "Ulo", "Braso", "Balikat"],
    1,
  ),

  mc(
    "katawan-02",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Tagalog ng "Eye"?',
    'What is the Tagalog word for "Eye"?',
    ["Ilong", "Bibig", "Mata", "Tainga"],
    2,
  ),

  mc(
    "katawan-03",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Tagalog ng "Nose"?',
    'What is the Tagalog word for "Nose"?',
    ["Bibig", "Ilong", "Mata", "Dila"],
    1,
  ),

  mc(
    "katawan-04",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Ingles ng "Bibig"?',
    'What is the English word for "Bibig"?',
    ["Eye", "Nose", "Mouth", "Ear"],
    2,
  ),

  mc(
    "katawan-05",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Ingles ng "Tainga"?',
    'What is the English word for "Tainga"?',
    ["Ear", "Eye", "Nose", "Mouth"],
    0,
  ),

  mc(
    "katawan-06",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Ingles ng "Buhok"?',
    'What is the English word for "Buhok"?',
    ["Tooth", "Tongue", "Hair", "Back"],
    2,
  ),

  mc(
    "katawan-07",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Tagalog ng "Neck"?',
    'What is the Tagalog word for "Neck"?',
    ["Balikat", "Leeg", "Ulo", "Kamay"],
    1,
  ),

  mc(
    "katawan-08",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Ingles ng "Balikat"?',
    'What is the English word for "Balikat"?',
    ["Elbow", "Knee", "Shoulder", "Neck"],
    2,
  ),

  mc(
    "katawan-09",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Tagalog ng "Tooth"?',
    'What is the Tagalog word for "Tooth"?',
    ["Dila", "Ngipin", "Bibig", "Ilong"],
    1,
  ),

  mc(
    "katawan-10",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    'Ano ang Ingles ng "Dila"?',
    'What is the English word for "Dila"?',
    ["Tooth", "Lip", "Tongue", "Throat"],
    2,
  ),

  pic(
    "katawan-11",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_ulo", "katawan_kamay", "katawan_paa", "katawan_leeg"],
    0,
    ["Ulo", "Kamay", "Paa", "Leeg"],
  ),

  pic(
    "katawan-12",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_mata", "katawan_ilong", "katawan_bibig", "katawan_tainga"],
    0,
    ["Mata", "Ilong", "Bibig", "Tainga"],
  ),

  pic(
    "katawan-13",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_kamay", "katawan_braso", "katawan_binti", "katawan_paa"],
    0,
    ["Kamay", "Braso", "Binti", "Paa"],
  ),

  pic(
    "katawan-14",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_paa", "katawan_tuhod", "katawan_binti", "katawan_daliri_paa"],
    0,
    ["Paa", "Tuhod", "Binti", "Daliri sa Paa"],
  ),

  pic(
    "katawan-15",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_ilong", "katawan_bibig", "katawan_mata", "katawan_tainga"],
    0,
    ["Ilong", "Bibig", "Mata", "Tainga"],
  ),

  pic(
    "katawan-16",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_tainga", "katawan_mata", "katawan_ilong", "katawan_bibig"],
    0,
    ["Tainga", "Mata", "Ilong", "Bibig"],
  ),

  pic(
    "katawan-17",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_ngipin", "katawan_dila", "katawan_bibig", "katawan_ilong"],
    0,
    ["Ngipin", "Dila", "Bibig", "Ilong"],
  ),

  pic(
    "katawan-18",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_buhok", "katawan_ulo", "katawan_leeg", "katawan_balikat"],
    0,
    ["Buhok", "Ulo", "Leeg", "Balikat"],
  ),

  pic(
    "katawan-19",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_balikat", "katawan_braso", "katawan_kamay", "katawan_likod"],
    0,
    ["Balikat", "Braso", "Kamay", "Likod"],
  ),

  pic(
    "katawan-20",
    "cat_katawan",
    "mga-bahagi-ng-katawan",
    "Anong bahagi ng katawan ang nasa litrato?",
    "What body part is shown in the picture?",
    ["katawan_tuhod", "katawan_binti", "katawan_paa", "katawan_daliri_paa"],
    0,
    ["Tuhod", "Binti", "Paa", "Daliri sa Paa"],
  ),
];

// ---------------------------------------------------------------------------
// 8. MGA PAGBATI  (cat_pagbati / mga-pagbati-at-parirala)
// ---------------------------------------------------------------------------

const pagbatiQuestions: MadaliQuestion[] = [
  // Q1–10: Vocabulary multiple-choice
  mc(
    "pagbati-01",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "Good Morning"?',
    'What is the Tagalog expression for "Good Morning"?',
    ["Magandang Hapon", "Magandang Umaga", "Magandang Gabi", "Magandang Araw"],
    1,
  ),

  mc(
    "pagbati-02",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "Thank You"?',
    'What is the Tagalog expression for "Thank You"?',
    ["Patawad", "Walang Anuman", "Salamat", "Paumanhin"],
    2,
  ),

  mc(
    "pagbati-03",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "Goodbye"?',
    'What is the Tagalog expression for "Goodbye"?',
    ["Kumusta", "Paalam", "Ingat Ka", "Kita Tayo"],
    1,
  ),

  mc(
    "pagbati-04",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Ingles ang "Kumusta"?',
    'What is the English expression for "Kumusta"?',
    ["Good Morning", "Goodbye", "Hello / How are you?", "Thank You"],
    2,
  ),

  mc(
    "pagbati-05",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "I Love You"?',
    'What is the Tagalog expression for "I Love You"?',
    ["Salamat", "Mahal Kita", "Mabuti Ako", "Ingat Ka"],
    1,
  ),

  mc(
    "pagbati-06",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "How are you"?',
    'What is the Tagalog expression for "How are you"?',
    ["Kumusta ka?", "Magandang Umaga", "Paalam", "Salamat"],
    0,
  ),

  mc(
    "pagbati-07",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Tagalog ang "I\'m fine"?',
    'What is the Tagalog expression for "I\'m fine"?',
    ["Paumanhin", "Mabuti Ako", "Ingat Ka", "Walang Anuman"],
    1,
  ),

  mc(
    "pagbati-08",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Ingles ang "Ingat Ka"?',
    'What is the English expression for "Ingat Ka"?',
    ["See You Later", "Welcome Back", "Take Care", "Good Day"],
    2,
  ),

  mc(
    "pagbati-09",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano ang Tagalog ng "You\'re Welcome"?',
    'What is the Tagalog expression for "You\'re Welcome"?',
    ["Salamat", "Walang Anuman", "Paumanhin", "Patawad"],
    1,
  ),

  mc(
    "pagbati-10",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    'Ano sa Ingles ang "Maligayang Pagdating"?',
    'What is the English expression for "Maligayang Pagdating"?',
    ["Good Luck", "Welcome Back", "Welcome", "Nice to Meet You"],
    2,
  ),

  // Q11–20: Situational questions
  sit(
    "pagbati-11",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Umaga na. Nagising ka at nakita mo ang iyong nanay. Anong sasabihin mo?",
    "It is morning. You woke up and saw your mother. What will you say?",
    ["Magandang Gabi", "Magandang Umaga", "Paalam", "Ingat Ka"],
    1,
  ),

  sit(
    "pagbati-12",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Tinanong ka ng kaibigan mo kung paano ka. Anong tamang sagot?",
    "Your friend asked how you are. What is the correct answer?",
    ["Paalam", "Salamat", "Mabuti Ako", "Mahal Kita"],
    2,
  ),

  sit(
    "pagbati-13",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Nakita mo ang iyong kaibigan sa daan. Anong sasabihin mo sa kaniya?",
    "You saw your friend on the road. What will you say to them?",
    ["Kumusta!", "Patawad", "Salamat", "Walang Anuman"],
    0,
  ),

  sit(
    "pagbati-14",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Binigyan ka ng iyong kaibigan ng pagkain. Anong sasabihin mo?",
    "Your friend gave you food. What will you say?",
    ["Paumanhin", "Paalam", "Salamat!", "Kumusta"],
    2,
  ),

  sit(
    "pagbati-15",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Hapon na at nakita mo ang iyong guro. Anong sasabihin mo?",
    "It is afternoon and you see your teacher. What will you say?",
    ["Magandang Umaga", "Magandang Hapon", "Magandang Gabi", "Paalam"],
    1,
  ),

  sit(
    "pagbati-16",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Aalis na ang iyong kaibigan. Anong sasabihin mo?",
    "Your friend is leaving. What will you say?",
    ["Kumusta", "Salamat", "Paalam!", "Mahal Kita"],
    2,
  ),

  sit(
    "pagbati-17",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Gusto mong makitang muli ang iyong kalaro. Anong sasabihin mo?",
    "You want to see your playmate again. What will you say?",
    ["Paalam na", "Kita tayo muli!", "Ingat Ka", "Mabuti Ako"],
    1,
  ),

  sit(
    "pagbati-18",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Bumalik na ang iyong tatay o nanay sa bahay. Anong sasabihin mo?",
    "Your father or mother returned home. What will you say?",
    ["Paalam", "Maligayang Pagbabalik!", "Paumanhin", "Kita Tayo"],
    1,
  ),

  sit(
    "pagbati-19",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "May nagbigay sa iyo ng regalo. Anong sasabihin mo?",
    "Someone gave you a gift. What will you say?",
    ["Maraming Salamat!", "Magandang Umaga", "Paalam na", "Walang Anuman"],
    0,
  ),

  sit(
    "pagbati-20",
    "cat_pagbati",
    "mga-pagbati-at-parirala",
    "Bago umuwi mula sa paaralan o laro. Anong sasabihin mo sa iyong mga kalaro?",
    "Before going home from school or play. What will you say to your playmates?",
    ["Magandang Araw", "Magandang Umaga", "Paalam at Ingat Kayo!", "Salamat"],
    2,
  ),
];

// ---------------------------------------------------------------------------
// Master bank
// ---------------------------------------------------------------------------

export const MADALI_QUESTION_BANK: MadaliQuestion[] = [
  ...hayopQuestions,
  ...prutasQuestions,
  ...gulayQuestions,
  ...bilangQuestions,
  ...hugisQuestions,
  ...kulayQuestions,
  ...katawanQuestions,
  ...pagbatiQuestions,
];

/**
 * Returns 20 Madali questions for the given LearningCategory.id.
 */
export function getMadaliQuestionsForCategory(
  categoryId: string,
): MadaliQuestion[] {
  return MADALI_QUESTION_BANK.filter((q) => q.categoryId === categoryId);
}

export function normalizeQuizSlug(slug: string): string {
  if (!slug) return "";
  const s = slug.toLowerCase().trim();
  if (s === "mga-numero" || s === "numero" || s === "bilang")
    return "mga-bilang";
  if (
    s === "mga-parte-ng-katawan" ||
    s === "parte-ng-katawan" ||
    s === "bahagi-ng-katawan"
  )
    return "mga-bahagi-ng-katawan";
  if (s === "mga-pagbati" || s === "pagbati") return "mga-pagbati-at-parirala";
  return s;
}

/**
 * Returns Madali questions by category slug (alternative lookup).
 */
export function getMadaliQuestionsBySlug(slug: string): MadaliQuestion[] {
  const norm = normalizeQuizSlug(slug);
  return MADALI_QUESTION_BANK.filter(
    (q) =>
      q.categorySlug === norm ||
      q.categoryId === slug ||
      q.categorySlug === slug,
  );
}

// ---------------------------------------------------------------------------
// Data integrity validation (runs at module load)
// ---------------------------------------------------------------------------

(function validateBank() {
  const EXPECTED_CATEGORIES = [
    "cat_hayop",
    "cat_prutas",
    "cat_gulay",
    "cat_bilang",
    "cat_hugis",
    "cat_kulay",
    "cat_katawan",
    "cat_pagbati",
  ];
  const QUESTIONS_PER_CATEGORY = 20;

  // 1. Total count
  if (MADALI_QUESTION_BANK.length !== 160) {
    console.error(
      `[QuizBank] Expected 160 total questions, found ${MADALI_QUESTION_BANK.length}`,
    );
  }

  // 2. Exactly 8 categories
  const foundCatIds = new Set(MADALI_QUESTION_BANK.map((q) => q.categoryId));
  if (foundCatIds.size !== 8) {
    console.error(
      `[QuizBank] Expected 8 categories, found ${foundCatIds.size}`,
    );
  }
  for (const catId of EXPECTED_CATEGORIES) {
    if (!foundCatIds.has(catId)) {
      console.error(`[QuizBank] Missing category: ${catId}`);
    }
  }

  // 3. Exactly 20 questions per category
  for (const catId of EXPECTED_CATEGORIES) {
    const count = MADALI_QUESTION_BANK.filter(
      (q) => q.categoryId === catId,
    ).length;
    if (count !== QUESTIONS_PER_CATEGORY) {
      console.error(
        `[QuizBank] ${catId}: expected ${QUESTIONS_PER_CATEGORY} questions, found ${count}`,
      );
    }
  }

  // 4. Unique IDs
  const allIds = MADALI_QUESTION_BANK.map((q) => q.id);
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    console.error("[QuizBank] Duplicate question IDs detected");
  }

  // 5. Choice integrity per question
  for (const q of MADALI_QUESTION_BANK) {
    if (q.type === "multiple-choice" || q.type === "situational") {
      if (!q.textChoices || q.textChoices.length !== 4) {
        console.error(`[QuizBank] ${q.id}: expected 4 text choices`);
      }
      if (!q.correctTextId) {
        console.error(`[QuizBank] ${q.id}: missing correctTextId`);
      }
      const cids = (q.textChoices ?? []).map((c) => c.id);
      if (q.correctTextId && !cids.includes(q.correctTextId)) {
        console.error(
          `[QuizBank] ${q.id}: correctTextId "${q.correctTextId}" not found in choices`,
        );
      }
    } else if (q.type === "picture-id") {
      if (!q.picChoices || q.picChoices.length !== 4) {
        console.error(`[QuizBank] ${q.id}: expected 4 picture choices`);
      }
      if (!q.correctVocabId) {
        console.error(`[QuizBank] ${q.id}: missing correctVocabId`);
      }
      const vids = (q.picChoices ?? []).map((c) => c.vocabId);
      if (q.correctVocabId && !vids.includes(q.correctVocabId)) {
        console.error(
          `[QuizBank] ${q.id}: correctVocabId "${q.correctVocabId}" not found in picChoices`,
        );
      }
    }
  }
})();
