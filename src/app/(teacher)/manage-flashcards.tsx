import { Redirect } from 'expo-router';
import React from 'react';

export default function ManageFlashcardsScreen() {
  return <Redirect href={{ pathname: '/(teacher)/content', params: { mode: 'flashcards' } } as any} />;
}
