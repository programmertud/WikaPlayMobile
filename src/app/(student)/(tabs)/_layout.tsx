import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows, Typography } from '../../../theme';

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.skyBlueDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bahay',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gantimpala"
        options={{
          title: 'Gantimpala',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>🎁</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="nakolekta"
        options={{
          title: 'Nakolekta',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Text style={styles.tabIcon}>🏆</Text>
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
              <Text style={styles.tabIcon}>⭐</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="minigames"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.skyBlueLight,
  },
  tabIcon: {
    fontSize: 22,
  },
});
