import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography, Radius } from '@/theme';

function TabBarIcon({
  name,
  outlineName,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color?: any;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      <Ionicons
        name={focused ? name : outlineName}
        size={22}
        color={focused ? Colors.skyBlueDark : Colors.textMuted}
      />
    </View>
  );
}

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.skyBlueDark,
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
      screenListeners={{
        tabPress: () => {
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur?.();
          }
        },
        state: () => {
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur?.();
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bahay',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="home"
              outlineName="home-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gantimpala"
        options={{
          title: 'Gantimpala',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="gift"
              outlineName="gift-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nakolekta"
        options={{
          title: 'Nakolekta',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="trophy"
              outlineName="trophy-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ako',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name="star"
              outlineName="star-outline"
              focused={focused}
              color={color}
            />
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
    height: Platform.OS === 'ios' ? 84 : 70,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.85)' : '#FFFFFF',
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
    backgroundColor: Colors.skyBlueLight,
  },
});
