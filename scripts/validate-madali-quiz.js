const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(filePath) {
  let source = fs.readFileSync(filePath, 'utf8');
  // Mock require calls for media assets
  source = source.replace(/require\([^)]+\.(mp3|png|jpg)[^)]*\)/g, '""');
  // Strip relative imports of types
  source = source.replace(/import\s+[^;]*from\s+['"][^'"]*types[^'"]*['"];?/g, '');
  
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const mod = { exports: {} };
  const dirname = path.dirname(filePath);
  const customRequire = (reqPath) => {
    if (reqPath.includes('types')) return {};
    if (reqPath.endsWith('.mp3') || reqPath.endsWith('.png') || reqPath.endsWith('.jpg')) return "";
    let full = path.resolve(dirname, reqPath);
    if (!fs.existsSync(full) && fs.existsSync(full + '.ts')) full = full + '.ts';
    if (!fs.existsSync(full) && fs.existsSync(full + '.js')) full = full + '.js';
    if (full.endsWith('.ts')) return loadTsModule(full);
    return require(reqPath);
  };

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled);
  fn(mod.exports, customRequire, mod, filePath, dirname);
  return mod.exports;
}

const quizBank = loadTsModule(path.resolve(__dirname, '../src/data/quiz-bank-madali.ts'));
const categories = loadTsModule(path.resolve(__dirname, '../src/data/categories.ts'));

const MADALI_QUESTION_BANK = quizBank.MADALI_QUESTION_BANK;
const getMadaliQuestionsBySlug = quizBank.getMadaliQuestionsBySlug;
const LEARNING_CATEGORIES = categories.LEARNING_CATEGORIES;

console.log('=== RUNNING MADALI QUIZ BANK VALIDATION ===\n');

let errors = 0;

// 1. Total Questions Check
const TOTAL_EXPECTED = 160;
if (MADALI_QUESTION_BANK.length !== TOTAL_EXPECTED) {
  console.error(`❌ Total questions count mismatch: expected ${TOTAL_EXPECTED}, found ${MADALI_QUESTION_BANK.length}`);
  errors++;
} else {
  console.log(`✅ Total questions count is exactly ${TOTAL_EXPECTED}`);
}

// 2. Exactly 8 Categories
const EXPECTED_CATEGORIES = [
  { id: 'cat_hayop', slug: 'mga-hayop', name: 'Mga Hayop' },
  { id: 'cat_prutas', slug: 'mga-prutas', name: 'Mga Prutas' },
  { id: 'cat_gulay', slug: 'mga-gulay', name: 'Mga Gulay' },
  { id: 'cat_bilang', slug: 'mga-bilang', name: 'Mga Bilang' },
  { id: 'cat_hugis', slug: 'mga-hugis', name: 'Mga Hugis' },
  { id: 'cat_kulay', slug: 'mga-kulay', name: 'Mga Kulay' },
  { id: 'cat_katawan', slug: 'mga-bahagi-ng-katawan', name: 'Mga Bahagi ng Katawan' },
  { id: 'cat_pagbati', slug: 'mga-pagbati-at-parirala', name: 'Mga Pagbati at Parirala' },
];

const categoryIds = new Set(MADALI_QUESTION_BANK.map(q => q.categoryId));
if (categoryIds.size !== 8) {
  console.error(`❌ Category count mismatch: expected 8, found ${categoryIds.size}`);
  errors++;
} else {
  console.log(`✅ Exactly 8 categories found in question bank`);
}

// 3. Exactly 20 questions per category
EXPECTED_CATEGORIES.forEach(cat => {
  const catQuestions = MADALI_QUESTION_BANK.filter(q => q.categoryId === cat.id);
  if (catQuestions.length !== 20) {
    console.error(`❌ ${cat.name} (${cat.id}) has ${catQuestions.length} questions, expected 20`);
    errors++;
  } else {
    console.log(`✅ Category "${cat.name}" has exactly 20 questions`);
  }
});

// 4. Unique IDs
const idCounts = {};
MADALI_QUESTION_BANK.forEach(q => {
  idCounts[q.id] = (idCounts[q.id] || 0) + 1;
});
const duplicates = Object.keys(idCounts).filter(id => idCounts[id] > 1);
if (duplicates.length > 0) {
  console.error(`❌ Duplicate question IDs found: ${duplicates.join(', ')}`);
  errors++;
} else {
  console.log(`✅ All 160 question IDs are strictly unique`);
}

// 5. Structure & Choices validation
const validChoiceIds = ['A', 'B', 'C', 'D'];
MADALI_QUESTION_BANK.forEach(q => {
  if (!q.textChoices || q.textChoices.length !== 4) {
    console.error(`❌ Question ${q.id}: Must have exactly 4 textChoices`);
    errors++;
  } else {
    const choiceIds = q.textChoices.map(c => c.id);
    const uniqueChoiceIds = new Set(choiceIds);
    if (uniqueChoiceIds.size !== 4) {
      console.error(`❌ Question ${q.id}: Duplicate choice IDs in choices`);
      errors++;
    }
    const texts = q.textChoices.map(c => c.text.toLowerCase().trim());
    const uniqueTexts = new Set(texts);
    if (uniqueTexts.size !== 4) {
      console.error(`❌ Question ${q.id}: Duplicate choice texts detected: ${texts.join(', ')}`);
      errors++;
    }
  }

  if (!q.correctTextId || !validChoiceIds.includes(q.correctTextId)) {
    console.error(`❌ Question ${q.id}: Invalid correctTextId "${q.correctTextId}"`);
    errors++;
  } else {
    const hasCorrect = q.textChoices.some(c => c.id === q.correctTextId);
    if (!hasCorrect) {
      console.error(`❌ Question ${q.id}: correctTextId "${q.correctTextId}" not in choices`);
      errors++;
    }
  }

  if (q.type === 'picture-id') {
    if (!q.correctVocabId) {
      console.error(`❌ Picture question ${q.id}: Missing correctVocabId`);
      errors++;
    } else {
      let vocabFound = false;
      for (const cat of LEARNING_CATEGORIES) {
        if (cat.items.some(it => it.id === q.correctVocabId)) {
          vocabFound = true;
          break;
        }
      }
      if (!vocabFound) {
        console.error(`❌ Picture question ${q.id}: correctVocabId "${q.correctVocabId}" not found in LEARNING_CATEGORIES`);
        errors++;
      }
    }
  }

  if (q.categoryId === 'cat_pagbati') {
    const num = parseInt(q.id.replace('pagbati-', ''), 10);
    if (num >= 11 && num <= 20) {
      if (q.type !== 'situational') {
        console.error(`❌ Pagbati question ${q.id}: expected type 'situational', got '${q.type}'`);
        errors++;
      }
    }
  }
});

// 6. Test Slug Resolution & Aliases
const testSlugs = [
  'mga-hayop',
  'mga-prutas',
  'mga-gulay',
  'mga-bilang',
  'mga-numero',
  'mga-hugis',
  'mga-kulay',
  'mga-bahagi-ng-katawan',
  'mga-parte-ng-katawan',
  'mga-pagbati-at-parirala',
  'mga-pagbati'
];

testSlugs.forEach(slug => {
  const qList = getMadaliQuestionsBySlug(slug);
  if (qList.length !== 20) {
    console.error(`❌ Slug lookup for "${slug}" returned ${qList.length} questions, expected 20`);
    errors++;
  } else {
    console.log(`✅ Slug lookup for "${slug}" successfully returned 20 questions`);
  }
});

console.log('\n=== VALIDATION SUMMARY ===');
console.log(`Total Errors: ${errors}`);
if (errors === 0) {
  console.log('🎉 ALL 160 MADALI QUIZ QUESTIONS VALIDATED SUCCESSFULLY WITH ZERO ERRORS!\n');
} else {
  process.exit(1);
}
