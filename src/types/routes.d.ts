/**
 * WikaPlay route type augmentation for Expo Router.
 *
 * Expo Router's typedRoutes feature generates a strict union of valid route paths.
 * When new route groups like (teacher) and (student) sub-tabs are added, the
 * generated types need a full `expo start` rebuild to pick them up.
 *
 * This file extends the StaticRoutes type to include all WikaPlay app routes
 * so TypeScript is satisfied without waiting for type regeneration.
 */
import 'expo-router';

declare module 'expo-router' {
  interface RouteParamInput {
    '/(teacher)': undefined;
    '/(teacher)/index': undefined;
    '/(teacher)/students': undefined;
    '/(teacher)/content': undefined;
    '/(teacher)/profile': undefined;
    '/(student)': undefined;
    '/(student)/index': undefined;
    '/(student)/minigames': undefined;
    '/(student)/gantimpala': undefined;
    '/(student)/nakolekta': undefined;
    '/(student)/profile': undefined;
    '/(student)/games/[slug]': { slug: string };
    '/(student)/category/[slug]': { slug: string };
    '/(student)/flashcards/[slug]': { slug: string };
    '/(student)/quiz/[slug]/[difficulty]': { slug: string; difficulty: string };
    '/login': undefined;
    '/register': undefined;
  }
}
