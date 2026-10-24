import { Redirect } from 'expo-router';
import React from 'react';

export default function ManageQuizScreen() {
  return <Redirect href={{ pathname: '/(teacher)/content', params: { mode: 'quizzes' } } as any} />;
}
