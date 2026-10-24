import React from 'react';
import ContentManagementScreen from './content';

export default function ManageFlashcardsScreen() {
  return <ContentManagementScreen initialMode="flashcards" showBackToDashboard={true} />;
}
