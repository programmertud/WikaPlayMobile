/**
 * WikaPlay — Voice audio mapping for Quiz Madali
 *
 * Maps every question in quiz-bank-madali to its accurate pre-recorded voice audio file.
 *
 * Strategy:
 * - Q1–10 (MC): Accurate recorded question voice audio file for that category.
 * - Q11–20 (picture-id): The category's prompt audio e.g. "anonghayopangnasalitrato.mp3".
 * - Q11–20 (situational, Pagbati): Pre-recorded situational scenario voice audio.
 *
 * This ensures no question in any category ever falls back to Web Speech Synthesis (AI voice).
 */


// ---------------------------------------------------------------------------
// Category Picture Prompt Audios (Q11–20 for picture questions & fallback)
// ---------------------------------------------------------------------------
export const HAYOP_PIC_PROMPT   = require('../../assets/audio/HAYOP-madali/anonghayopangnasalitrato.mp3');
export const GULAY_PIC_PROMPT   = require('../../assets/audio/GULAY-madali/anonggulayangnasalitrato.mp3');
export const PRUTAS_PIC_PROMPT  = require('../../assets/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3');
export const HUGIS_PIC_PROMPT   = require('../../assets/audio/HUGIS-madali/anonghugisangnasalitrato.mp3');
export const BILANG_PIC_PROMPT  = require('../../assets/audio/NUMERO-madali/anongbilangangnasalitrato.mp3');
export const KATAWAN_PIC_PROMPT = require('../../assets/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3');
export const KULAY_PIC_PROMPT   = require('../../assets/audio/KULAY-madali/anongkulayangnasalitrato.mp3');

// ---------------------------------------------------------------------------
// 1. HAYOP-madali
// ---------------------------------------------------------------------------
export const HAYOP_AUDIO: Record<string, any> = {
  'hayop-01': require('../../assets/audio/HAYOP-madali/anosatagalogangdog.mp3'),
  'hayop-02': require('../../assets/audio/HAYOP-madali/anosainglesangpusa.mp3'),
  'hayop-03': require('../../assets/audio/HAYOP-madali/anosatagalogangcow.mp3'),
  'hayop-04': require('../../assets/audio/HAYOP-madali/anosatagaloganghorse.mp3'),
  'hayop-05': require('../../assets/audio/HAYOP-madali/anosatagaloganglion.mp3'),
  'hayop-06': require('../../assets/audio/HAYOP-madali/anosainglesangtigre.mp3'),
  'hayop-07': require('../../assets/audio/HAYOP-madali/anosainglesangkambing.mp3'),
  'hayop-08': require('../../assets/audio/HAYOP-madali/anosatagalogangunggoy.mp3'),
  'hayop-09': require('../../assets/audio/HAYOP-madali/anosainglesangbaboy.mp3'),
  'hayop-10': require('../../assets/audio/HAYOP-madali/anosatagalogangchicken.mp3'),
  // Q11–20: Anong hayop ang nasa larawan?
  'hayop-11': HAYOP_PIC_PROMPT, 'hayop-12': HAYOP_PIC_PROMPT,
  'hayop-13': HAYOP_PIC_PROMPT, 'hayop-14': HAYOP_PIC_PROMPT,
  'hayop-15': HAYOP_PIC_PROMPT, 'hayop-16': HAYOP_PIC_PROMPT,
  'hayop-17': HAYOP_PIC_PROMPT, 'hayop-18': HAYOP_PIC_PROMPT,
  'hayop-19': HAYOP_PIC_PROMPT, 'hayop-20': HAYOP_PIC_PROMPT,
  'hayop-pic-prompt': HAYOP_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 2. GULAY-madali
// ---------------------------------------------------------------------------
export const GULAY_AUDIO: Record<string, any> = {
  'gulay-01': require('../../assets/audio/GULAY-madali/anosatagalogangcarrot.mp3'),
  'gulay-02': require('../../assets/audio/GULAY-madali/anosatagalogangtomato.mp3'),
  'gulay-03': require('../../assets/audio/GULAY-madali/anosainglesangtalong.mp3'),
  'gulay-04': require('../../assets/audio/GULAY-madali/anosatagalogangcabbage.mp3'),
  'gulay-05': require('../../assets/audio/GULAY-madali/anosainglesangkalabasa.mp3'),
  'gulay-06': require('../../assets/audio/GULAY-madali/anosainglesangpatatas.mp3'),
  'gulay-07': require('../../assets/audio/GULAY-madali/anosatagalogangbrocoli.mp3'),
  'gulay-08': require('../../assets/audio/GULAY-madali/anosainglesangkoliplor.mp3'),
  'gulay-09': require('../../assets/audio/GULAY-madali/anosainglesangkangkong.mp3'),
  'gulay-10': require('../../assets/audio/GULAY-madali/anosatagalogangbittermelon.mp3'),
  // Q11–20: Anong gulay ang nasa larawan?
  'gulay-11': GULAY_PIC_PROMPT, 'gulay-12': GULAY_PIC_PROMPT,
  'gulay-13': GULAY_PIC_PROMPT, 'gulay-14': GULAY_PIC_PROMPT,
  'gulay-15': GULAY_PIC_PROMPT, 'gulay-16': GULAY_PIC_PROMPT,
  'gulay-17': GULAY_PIC_PROMPT, 'gulay-18': GULAY_PIC_PROMPT,
  'gulay-19': GULAY_PIC_PROMPT, 'gulay-20': GULAY_PIC_PROMPT,
  'gulay-pic-prompt': GULAY_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 3. PRUTAS-madali
// ---------------------------------------------------------------------------
export const PRUTAS_AUDIO: Record<string, any> = {
  'prutas-01': require('../../assets/audio/PRUTAS-madali/anoangenglishngsaging.mp3'),
  'prutas-02': require('../../assets/audio/PRUTAS-madali/anoangenglishngmangga.mp3'),
  'prutas-03': require('../../assets/audio/PRUTAS-madali/anoangtagalogngwatermelon.mp3'),
  'prutas-04': require('../../assets/audio/PRUTAS-madali/anoangtagalogngapple.mp3'),
  'prutas-05': require('../../assets/audio/PRUTAS-madali/anoangtagalognggrapes.mp3'),
  'prutas-06': require('../../assets/audio/PRUTAS-madali/anoangtagalogngstrawberry.mp3'),
  'prutas-07': require('../../assets/audio/PRUTAS-madali/anoangenglishngbayabas.mp3'),
  'prutas-08': require('../../assets/audio/PRUTAS-madali/anoangtagalogngpear.mp3'),
  'prutas-09': require('../../assets/audio/PRUTAS-madali/anoangenglishnglangka.mp3'),
  'prutas-10': require('../../assets/audio/PRUTAS-madali/anoangtagalogngavocado.mp3'),
  // Q11–20: Anong prutas ang nasa larawan?
  'prutas-11': PRUTAS_PIC_PROMPT, 'prutas-12': PRUTAS_PIC_PROMPT,
  'prutas-13': PRUTAS_PIC_PROMPT, 'prutas-14': PRUTAS_PIC_PROMPT,
  'prutas-15': PRUTAS_PIC_PROMPT, 'prutas-16': PRUTAS_PIC_PROMPT,
  'prutas-17': PRUTAS_PIC_PROMPT, 'prutas-18': PRUTAS_PIC_PROMPT,
  'prutas-19': PRUTAS_PIC_PROMPT, 'prutas-20': PRUTAS_PIC_PROMPT,
  'prutas-pic-prompt': PRUTAS_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 4. HUGIS-madali
// ---------------------------------------------------------------------------
export const HUGIS_AUDIO: Record<string, any> = {
  'hugis-01': require('../../assets/audio/HUGIS-madali/anosatagalogangcircle.mp3'),
  'hugis-02': require('../../assets/audio/HUGIS-madali/anosatagalogangtriangle.mp3'),
  'hugis-03': require('../../assets/audio/HUGIS-madali/anosainglesangparisukat.mp3'),
  'hugis-04': require('../../assets/audio/HUGIS-madali/anosainglesangbituin.mp3'),
  'hugis-05': require('../../assets/audio/HUGIS-madali/anosainglesangparihaba.mp3'),
  'hugis-06': require('../../assets/audio/HUGIS-madali/anosatagalogangheart.mp3'),
  'hugis-07': require('../../assets/audio/HUGIS-madali/anosatagalogangoval.mp3'),
  'hugis-08': require('../../assets/audio/HUGIS-madali/anosainglesangdiyamante.mp3'),
  'hugis-09': require('../../assets/audio/HUGIS-madali/anosainglesanghexagono.mp3'),
  'hugis-10': require('../../assets/audio/HUGIS-madali/anosatagalogangpentagon.mp3'),
  // Q11–20: Anong hugis ang nasa larawan?
  'hugis-11': HUGIS_PIC_PROMPT, 'hugis-12': HUGIS_PIC_PROMPT,
  'hugis-13': HUGIS_PIC_PROMPT, 'hugis-14': HUGIS_PIC_PROMPT,
  'hugis-15': HUGIS_PIC_PROMPT, 'hugis-16': HUGIS_PIC_PROMPT,
  'hugis-17': HUGIS_PIC_PROMPT, 'hugis-18': HUGIS_PIC_PROMPT,
  'hugis-19': HUGIS_PIC_PROMPT, 'hugis-20': HUGIS_PIC_PROMPT,
  'hugis-pic-prompt': HUGIS_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 5. NUMERO / BILANG-madali
// ---------------------------------------------------------------------------
export const NUMERO_AUDIO: Record<string, any> = {
  'bilang-01': require('../../assets/audio/NUMERO-madali/one.mp3'),
  'bilang-02': require('../../assets/audio/NUMERO-madali/dalawa.mp3'),
  'bilang-03': require('../../assets/audio/NUMERO-madali/three.mp3'),
  'bilang-04': require('../../assets/audio/NUMERO-madali/apat.mp3'),
  'bilang-05': require('../../assets/audio/NUMERO-madali/five.mp3'),
  'bilang-06': require('../../assets/audio/NUMERO-madali/anim.mp3'),
  'bilang-07': require('../../assets/audio/NUMERO-madali/seven.mp3'),
  'bilang-08': require('../../assets/audio/NUMERO-madali/walo.mp3'),
  'bilang-09': require('../../assets/audio/NUMERO-madali/nine.mp3'),
  'bilang-10': require('../../assets/audio/NUMERO-madali/sampu.mp3'),
  // Q11–20: Anong bilang ang nasa larawan?
  'bilang-11': BILANG_PIC_PROMPT, 'bilang-12': BILANG_PIC_PROMPT,
  'bilang-13': BILANG_PIC_PROMPT, 'bilang-14': BILANG_PIC_PROMPT,
  'bilang-15': BILANG_PIC_PROMPT, 'bilang-16': BILANG_PIC_PROMPT,
  'bilang-17': BILANG_PIC_PROMPT, 'bilang-18': BILANG_PIC_PROMPT,
  'bilang-19': BILANG_PIC_PROMPT, 'bilang-20': BILANG_PIC_PROMPT,
  'bilang-pic-prompt': BILANG_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 6. PARTE NG KATAWAN-madali
// ---------------------------------------------------------------------------
export const KATAWAN_AUDIO: Record<string, any> = {
  'katawan-01': require('../../assets/audio/PARTE NG KATAWAN-madali/head.mp3'),
  'katawan-02': require('../../assets/audio/PARTE NG KATAWAN-madali/eye.mp3'),
  'katawan-03': require('../../assets/audio/PARTE NG KATAWAN-madali/nose.mp3'),
  'katawan-04': require('../../assets/audio/PARTE NG KATAWAN-madali/bibig.mp3'),
  'katawan-05': require('../../assets/audio/PARTE NG KATAWAN-madali/tenga.mp3'),
  'katawan-06': require('../../assets/audio/PARTE NG KATAWAN-madali/buhok.mp3'),
  'katawan-07': require('../../assets/audio/PARTE NG KATAWAN-madali/neck.mp3'),
  'katawan-08': require('../../assets/audio/PARTE NG KATAWAN-madali/balikat.mp3'),
  'katawan-09': require('../../assets/audio/PARTE NG KATAWAN-madali/tooth.mp3'),
  'katawan-10': require('../../assets/audio/PARTE NG KATAWAN-madali/dila.mp3'),
  // Q11–20: Anong bahagi ng katawan ang nasa larawan?
  'katawan-11': KATAWAN_PIC_PROMPT, 'katawan-12': KATAWAN_PIC_PROMPT,
  'katawan-13': KATAWAN_PIC_PROMPT, 'katawan-14': KATAWAN_PIC_PROMPT,
  'katawan-15': KATAWAN_PIC_PROMPT, 'katawan-16': KATAWAN_PIC_PROMPT,
  'katawan-17': KATAWAN_PIC_PROMPT, 'katawan-18': KATAWAN_PIC_PROMPT,
  'katawan-19': KATAWAN_PIC_PROMPT, 'katawan-20': KATAWAN_PIC_PROMPT,
  'katawan-pic-prompt': KATAWAN_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 7. KULAY-madali
// ---------------------------------------------------------------------------
export const KULAY_AUDIO: Record<string, any> = {
  'kulay-01': require('../../assets/audio/KULAY-madali/anosatagalogangkulayred.mp3'),
  'kulay-02': require('../../assets/audio/KULAY-madali/anosainglesangkulayasul.mp3'),
  'kulay-03': require('../../assets/audio/KULAY-madali/anosainglesangkulaydilaw.mp3'),
  'kulay-04': require('../../assets/audio/KULAY-madali/anosatagalogangkulaygreen.mp3'),
  'kulay-05': require('../../assets/audio/KULAY-madali/anosainglesangkulaykahel.mp3'),
  'kulay-06': require('../../assets/audio/KULAY-madali/anosatagalogangkulaypurple.mp3'),
  'kulay-07': require('../../assets/audio/KULAY-madali/anosainglesangkulayrosas.mp3'),
  'kulay-08': require('../../assets/audio/KULAY-madali/anosatagalogangkulayblack.mp3'),
  'kulay-09': require('../../assets/audio/KULAY-madali/anosatagalogangkulaywhite.mp3'),
  'kulay-10': require('../../assets/audio/KULAY-madali/anosainglesangkulaykayumanggi.mp3'),
  // Q11–20: Anong kulay ang nasa larawan?
  'kulay-11': KULAY_PIC_PROMPT, 'kulay-12': KULAY_PIC_PROMPT,
  'kulay-13': KULAY_PIC_PROMPT, 'kulay-14': KULAY_PIC_PROMPT,
  'kulay-15': KULAY_PIC_PROMPT, 'kulay-16': KULAY_PIC_PROMPT,
  'kulay-17': KULAY_PIC_PROMPT, 'kulay-18': KULAY_PIC_PROMPT,
  'kulay-19': KULAY_PIC_PROMPT, 'kulay-20': KULAY_PIC_PROMPT,
  'kulay-pic-prompt': KULAY_PIC_PROMPT,
};

// ---------------------------------------------------------------------------
// 8. GREETINGS / Mga Pagbati
// ---------------------------------------------------------------------------
export const GREETINGS_AUDIO: Record<string, any> = {
  'pagbati-01': require('../../assets/audio/GREETINGS/goodmorning.mp3'),
  'pagbati-02': require('../../assets/audio/GREETINGS/thankyou.mp3'),
  'pagbati-03': require('../../assets/audio/GREETINGS/goodbye .mp3'),
  'pagbati-04': require('../../assets/audio/GREETINGS/hello.mp3'),
  'pagbati-05': require('../../assets/audio/GREETINGS/anosatagalogangiloveyou.mp3'),
  'pagbati-06': require('../../assets/audio/GREETINGS/howareyou.mp3'),
  'pagbati-07': require('../../assets/audio/GREETINGS/imfine.mp3'),
  'pagbati-08': require('../../assets/audio/GREETINGS/takecare.mp3'),
  'pagbati-09': require('../../assets/audio/GREETINGS/you_rewelcome.mp3'),
  'pagbati-10': require('../../assets/audio/GREETINGS/dumating.mp3'),
  'pagbati-11': require('../../assets/audio/GREETINGS/umagana.mp3'),
  'pagbati-12': require('../../assets/audio/GREETINGS/tinanongkangiyongkaibigan.mp3'),
  'pagbati-13': require('../../assets/audio/GREETINGS/nakitamoangiyongkaibigan..mp3'),
  'pagbati-14': require('../../assets/audio/GREETINGS/binigyanmongpagkain.mp3'),
  'pagbati-15': require('../../assets/audio/GREETINGS/afternoon .mp3'),
  'pagbati-16': require('../../assets/audio/GREETINGS/aalisna.mp3'),
  'pagbati-17': require('../../assets/audio/GREETINGS/gustomongmakita.mp3'),
  'pagbati-18': require('../../assets/audio/GREETINGS/bumalik .mp3'),
  'pagbati-19': require('../../assets/audio/GREETINGS/maynagbigaysayongregalo.mp3'),
  'pagbati-20': require('../../assets/audio/GREETINGS/bagoumuwi.mp3'),
};

// Consolidated dictionary of all 160 questions + prompt audio files (Native require assets)
export const ALL_MADALI_AUDIO: Record<string, any> = {
  ...HAYOP_AUDIO,
  ...GULAY_AUDIO,
  ...PRUTAS_AUDIO,
  ...HUGIS_AUDIO,
  ...NUMERO_AUDIO,
  ...KATAWAN_AUDIO,
  ...KULAY_AUDIO,
  ...GREETINGS_AUDIO,
};

// Consolidated static web paths (served from /public/audio on web)
export const ALL_MADALI_WEB_PATHS: Record<string, string> = {
  // 1. Hayop
  'hayop-01': '/audio/HAYOP-madali/anosatagalogangdog.mp3',
  'hayop-02': '/audio/HAYOP-madali/anosainglesangpusa.mp3',
  'hayop-03': '/audio/HAYOP-madali/anosatagalogangcow.mp3',
  'hayop-04': '/audio/HAYOP-madali/anosatagaloganghorse.mp3',
  'hayop-05': '/audio/HAYOP-madali/anosatagaloganglion.mp3',
  'hayop-06': '/audio/HAYOP-madali/anosainglesangtigre.mp3',
  'hayop-07': '/audio/HAYOP-madali/anosainglesangkambing.mp3',
  'hayop-08': '/audio/HAYOP-madali/anosatagalogangunggoy.mp3',
  'hayop-09': '/audio/HAYOP-madali/anosainglesangbaboy.mp3',
  'hayop-10': '/audio/HAYOP-madali/anosatagalogangchicken.mp3',
  'hayop-11': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-12': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-13': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-14': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-15': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-16': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-17': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-18': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-19': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-20': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',
  'hayop-pic-prompt': '/audio/HAYOP-madali/anonghayopangnasalitrato.mp3',

  // 2. Gulay
  'gulay-01': '/audio/GULAY-madali/anosatagalogangcarrot.mp3',
  'gulay-02': '/audio/GULAY-madali/anosatagalogangtomato.mp3',
  'gulay-03': '/audio/GULAY-madali/anosainglesangtalong.mp3',
  'gulay-04': '/audio/GULAY-madali/anosatagalogangcabbage.mp3',
  'gulay-05': '/audio/GULAY-madali/anosainglesangkalabasa.mp3',
  'gulay-06': '/audio/GULAY-madali/anosainglesangpatatas.mp3',
  'gulay-07': '/audio/GULAY-madali/anosatagalogangbrocoli.mp3',
  'gulay-08': '/audio/GULAY-madali/anosainglesangkoliplor.mp3',
  'gulay-09': '/audio/GULAY-madali/anosainglesangkangkong.mp3',
  'gulay-10': '/audio/GULAY-madali/anosatagalogangbittermelon.mp3',
  'gulay-11': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-12': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-13': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-14': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-15': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-16': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-17': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-18': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-19': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-20': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',
  'gulay-pic-prompt': '/audio/GULAY-madali/anonggulayangnasalitrato.mp3',

  // 3. Prutas
  'prutas-01': '/audio/PRUTAS-madali/anoangenglishngsaging.mp3',
  'prutas-02': '/audio/PRUTAS-madali/anoangenglishngmangga.mp3',
  'prutas-03': '/audio/PRUTAS-madali/anoangtagalogngwatermelon.mp3',
  'prutas-04': '/audio/PRUTAS-madali/anoangtagalogngapple.mp3',
  'prutas-05': '/audio/PRUTAS-madali/anoangtagalognggrapes.mp3',
  'prutas-06': '/audio/PRUTAS-madali/anoangtagalogngstrawberry.mp3',
  'prutas-07': '/audio/PRUTAS-madali/anoangenglishngbayabas.mp3',
  'prutas-08': '/audio/PRUTAS-madali/anoangtagalogngpear.mp3',
  'prutas-09': '/audio/PRUTAS-madali/anoangenglishnglangka.mp3',
  'prutas-10': '/audio/PRUTAS-madali/anoangtagalogngavocado.mp3',
  'prutas-11': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-12': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-13': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-14': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-15': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-16': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-17': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-18': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-19': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-20': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',
  'prutas-pic-prompt': '/audio/PRUTAS-madali/anongprutasangnasalitrato.mp3',

  // 4. Hugis
  'hugis-01': '/audio/HUGIS-madali/anosatagalogangcircle.mp3',
  'hugis-02': '/audio/HUGIS-madali/anosatagalogangtriangle.mp3',
  'hugis-03': '/audio/HUGIS-madali/anosainglesangparisukat.mp3',
  'hugis-04': '/audio/HUGIS-madali/anosatagalogangheart.mp3',
  'hugis-05': '/audio/HUGIS-madali/anosainglesangbituin.mp3',
  'hugis-06': '/audio/HUGIS-madali/anosatagalogangoval.mp3',
  'hugis-07': '/audio/HUGIS-madali/anosainglesangparihaba.mp3',
  'hugis-08': '/audio/HUGIS-madali/anosainglesangdiyamante.mp3',
  'hugis-09': '/audio/HUGIS-madali/anosatagalogangpentagon.mp3',
  'hugis-10': '/audio/HUGIS-madali/anosainglesanghexagono.mp3',
  'hugis-11': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-12': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-13': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-14': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-15': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-16': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-17': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-18': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-19': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-20': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',
  'hugis-pic-prompt': '/audio/HUGIS-madali/anonghugisangnasalitrato.mp3',

  // 5. Bilang
  'bilang-01': '/audio/NUMERO-madali/one.mp3',
  'bilang-02': '/audio/NUMERO-madali/dalawa.mp3',
  'bilang-03': '/audio/NUMERO-madali/three.mp3',
  'bilang-04': '/audio/NUMERO-madali/apat.mp3',
  'bilang-05': '/audio/NUMERO-madali/five.mp3',
  'bilang-06': '/audio/NUMERO-madali/anim.mp3',
  'bilang-07': '/audio/NUMERO-madali/seven.mp3',
  'bilang-08': '/audio/NUMERO-madali/walo.mp3',
  'bilang-09': '/audio/NUMERO-madali/nine.mp3',
  'bilang-10': '/audio/NUMERO-madali/sampu.mp3',
  'bilang-11': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-12': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-13': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-14': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-15': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-16': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-17': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-18': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-19': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-20': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',
  'bilang-pic-prompt': '/audio/NUMERO-madali/anongbilangangnasalitrato.mp3',

  // 6. Parte ng Katawan
  'katawan-01': '/audio/PARTE NG KATAWAN-madali/head.mp3',
  'katawan-02': '/audio/PARTE NG KATAWAN-madali/eye.mp3',
  'katawan-03': '/audio/PARTE NG KATAWAN-madali/nose.mp3',
  'katawan-04': '/audio/PARTE NG KATAWAN-madali/bibig.mp3',
  'katawan-05': '/audio/PARTE NG KATAWAN-madali/tenga.mp3',
  'katawan-06': '/audio/PARTE NG KATAWAN-madali/buhok.mp3',
  'katawan-07': '/audio/PARTE NG KATAWAN-madali/neck.mp3',
  'katawan-08': '/audio/PARTE NG KATAWAN-madali/balikat.mp3',
  'katawan-09': '/audio/PARTE NG KATAWAN-madali/tooth.mp3',
  'katawan-10': '/audio/PARTE NG KATAWAN-madali/dila.mp3',
  'katawan-11': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-12': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-13': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-14': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-15': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-16': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-17': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-18': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-19': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-20': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',
  'katawan-pic-prompt': '/audio/PARTE NG KATAWAN-madali/anongbahagingkatawan.mp3',

  // 7. Kulay
  'kulay-01': '/audio/KULAY-madali/anosatagalogangkulayred.mp3',
  'kulay-02': '/audio/KULAY-madali/anosainglesangkulayasul.mp3',
  'kulay-03': '/audio/KULAY-madali/anosainglesangkulaydilaw.mp3',
  'kulay-04': '/audio/KULAY-madali/anosatagalogangkulaygreen.mp3',
  'kulay-05': '/audio/KULAY-madali/anosainglesangkulaykahel.mp3',
  'kulay-06': '/audio/KULAY-madali/anosatagalogangkulaypurple.mp3',
  'kulay-07': '/audio/KULAY-madali/anosainglesangkulayrosas.mp3',
  'kulay-08': '/audio/KULAY-madali/anosatagalogangkulayblack.mp3',
  'kulay-09': '/audio/KULAY-madali/anosatagalogangkulaywhite.mp3',
  'kulay-10': '/audio/KULAY-madali/anosainglesangkulaykayumanggi.mp3',
  'kulay-11': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-12': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-13': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-14': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-15': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-16': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-17': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-18': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-19': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-20': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',
  'kulay-pic-prompt': '/audio/KULAY-madali/anongkulayangnasalitrato.mp3',

  // 8. Mga Pagbati
  'pagbati-01': '/audio/GREETINGS/goodmorning.mp3',
  'pagbati-02': '/audio/GREETINGS/thankyou.mp3',
  'pagbati-03': '/audio/GREETINGS/goodbye .mp3',
  'pagbati-04': '/audio/GREETINGS/hello.mp3',
  'pagbati-05': '/audio/GREETINGS/anosatagalogangiloveyou.mp3',
  'pagbati-06': '/audio/GREETINGS/howareyou.mp3',
  'pagbati-07': '/audio/GREETINGS/imfine.mp3',
  'pagbati-08': '/audio/GREETINGS/takecare.mp3',
  'pagbati-09': '/audio/GREETINGS/you_rewelcome.mp3',
  'pagbati-10': '/audio/GREETINGS/dumating.mp3',
  'pagbati-11': '/audio/GREETINGS/umagana.mp3',
  'pagbati-12': '/audio/GREETINGS/tinanongkangiyongkaibigan.mp3',
  'pagbati-13': '/audio/GREETINGS/nakitamoangiyongkaibigan..mp3',
  'pagbati-14': '/audio/GREETINGS/binigyanmongpagkain.mp3',
  'pagbati-15': '/audio/GREETINGS/afternoon .mp3',
  'pagbati-16': '/audio/GREETINGS/aalisna.mp3',
  'pagbati-17': '/audio/GREETINGS/gustomongmakita.mp3',
  'pagbati-18': '/audio/GREETINGS/bumalik .mp3',
  'pagbati-19': '/audio/GREETINGS/maynagbigaysayongregalo.mp3',
  'pagbati-20': '/audio/GREETINGS/bagoumuwi.mp3',
};

/**
 * Direct lookup by question ID (e.g. 'hayop-01', 'gulay-15')
 */
export function getMadaliAudioById(id: string): any {
  if (!id) return HAYOP_PIC_PROMPT;
  return ALL_MADALI_AUDIO[id] ?? HAYOP_PIC_PROMPT;
}

/**
 * Get the voice audio for a specific Madali question.
 *
 * Always returns a verified audio source. Never falls back to Web Speech Synthesis (AI voice).
 */
export function getMadaliQuestionAudio(question: {
  id: string;
  type?: string;
  categorySlug?: string;
  audio?: any;
}): any {
  if (!question) return HAYOP_PIC_PROMPT;
  if (question.audio) return question.audio;

  const id = question.id;
  if (ALL_MADALI_AUDIO[id]) {
    return ALL_MADALI_AUDIO[id];
  }

  return getMadaliAudioById(id);
}


