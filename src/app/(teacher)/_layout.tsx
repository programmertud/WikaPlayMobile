import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/use-auth';
import { Colors, Shadows, Typography } from '../../theme';

export default function TeacherLayout() {
  const { isAuthenticated, isTeacher, isLoading } = useAuth();

  // While auth is resolving, render nothing (avoids premature redirect)
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.skyBlue} />
      </View>
    );
  }

  // Use declarative <Redirect> instead of router.replace() in useEffect.
  // This avoids triggering expo-router's navigation tree reducer inside a
  // layout effect, which causes the "Maximum update depth exceeded" loop on web.
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
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>📊</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Mga Estudyante',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>👨‍🎓</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: 'Nilalaman',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>📚</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ako',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>👩‍🏫</Text>
            </View>
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
    backgroundColor: '#F0F9FF',
  },
  tabBar: {
    height: 70,
    backgroundColor: Colors.white,
    borderTopWidth: 3,
    borderColor: '#E2E8F0',
    paddingBottom: 8,
    paddingTop: 8,
    ...Shadows.card,
  },
  tabLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  iconContainer: {
    padding: 4,
    borderRadius: 14,
  },
  activeIconContainer: {
    backgroundColor: '#EDE9FE',
  },
  tabIcon: {
    fontSize: 22,
  },
});
