import React from 'react';
import ContentManagementScreen from './content';

export default function ManageQuizScreen() {
  return <ContentManagementScreen initialMode="quizzes" showBackToDashboard={true} />;
}
