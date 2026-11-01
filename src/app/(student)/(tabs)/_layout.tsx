import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows, Typography, Radius } from '@/theme';

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
        name={focused ? name : outlineName as any}
        size={24}
        color={focused ? '#FFD700' : Colors.textMuted}
      />
    </View>
  );
}

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => (
                <BlurView
                  intensity={80}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                />
              )
            : undefined,
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
    backgroundColor: '#0EA5E9',
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    ...Shadows.card,
  },
  tabLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 48,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
