import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-auth';
import { Colors, Shadows, Typography, Radius } from '../../theme';

function TeacherTabBarIcon({
  name,
  outlineName,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      <Ionicons
        name={focused ? name : outlineName}
        size={22}
        color={focused ? Colors.teacherPurple : Colors.textMuted}
      />
    </View>
  );
}

export default function TeacherLayout() {
  const { isAuthenticated, isTeacher, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.teacherPurple} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!isTeacher) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.teacherPurple,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 100}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TeacherTabBarIcon
              name="stats-chart"
              outlineName="stats-chart-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Mga Estudyante',
          tabBarIcon: ({ focused }) => (
            <TeacherTabBarIcon
              name="people"
              outlineName="people-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: 'Nilalaman',
          tabBarIcon: ({ focused }) => (
            <TeacherTabBarIcon
              name="book"
              outlineName="book-outline"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ako',
          tabBarIcon: ({ focused }) => (
            <TeacherTabBarIcon
              name="school"
              outlineName="school-outline"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.teacherPurpleBg,
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 70,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : Colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    ...Shadows.card,
  },
  tabLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: Colors.teacherPurpleLight,
  },
});
