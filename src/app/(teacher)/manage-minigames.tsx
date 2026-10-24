import { Redirect } from 'expo-router';
import React from 'react';

export default function ManageMiniGamesScreen() {
  return <Redirect href={{ pathname: '/(teacher)/content', params: { mode: 'minigames' } } as any} />;
}
