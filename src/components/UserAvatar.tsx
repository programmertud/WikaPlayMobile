import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Shadows, Typography } from '../theme';
import { ApiClient } from '../services/api/client';

export interface UserAvatarProps {
  avatar?: string | null;
  name?: string;
  size?: number;
  isTeacher?: boolean;
  showRing?: boolean;
  ringColors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  avatarStyle?: StyleProp<ViewStyle | ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const isImageAvatar = (avatar?: string | null): boolean => {
  if (!avatar) return false;
  const trimmed = avatar.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('/storage/') ||
    trimmed.includes('/storage/avatars/') ||
    trimmed.includes('.png') ||
    trimmed.includes('.jpg') ||
    trimmed.includes('.jpeg') ||
    trimmed.includes('.webp')
  ) {
    return true;
  }
  return false;
};

export const resolveAvatarUrl = (avatar?: string | null): string => {
  if (!avatar || avatar.includes('wikaplay.app')) return '';
  const trimmed = avatar.trim();
  const baseUrl = ApiClient.getBaseUrl();
  const origin = baseUrl.replace(/\/api\/?$/, '');

  // 1. Preserve local device URIs and data URIs
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // 2. Rewrite any /storage/ (full URL or relative) to /api/media/ (persistent database storage)
  if (trimmed.includes('/storage/')) {
    const afterStorage = trimmed.split('/storage/').pop() || '';
    return `${origin}/api/media/${afterStorage.replace(/^\/+/, '')}`;
  }
  if (trimmed.startsWith('storage/')) {
    const afterStorage = trimmed.replace(/^storage\//, '');
    return `${origin}/api/media/${afterStorage.replace(/^\/+/, '')}`;
  }

  // 3. Handle /api/media/ relative or full paths
  if (trimmed.startsWith('/api/media/')) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('api/media/')) {
    return `${origin}/${trimmed}`;
  }

  // 4. Handle relative images/ or audio/ paths
  if (trimmed.startsWith('images/') || trimmed.startsWith('audio/')) {
    return `${origin}/api/media/${trimmed}`;
  }
  if (trimmed.startsWith('/images/') || trimmed.startsWith('/audio/')) {
    return `${origin}/api/media${trimmed}`;
  }

  // 5. Handle localhost URLs
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    const relativePath = trimmed.replace(/^https?:\/\/[^/]+/, '');
    if (relativePath.includes('storage/')) {
      const clean = relativePath.split('storage/').pop() || '';
      return `${origin}/api/media/${clean.replace(/^\/+/, '')}`;
    }
    return `${origin}${relativePath}`;
  }

  return trimmed;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name = '',
  size = 72,
  isTeacher = false,
  showRing = false,
  ringColors,
  style,
  avatarStyle,
  textStyle,
}) => {
  const isImage = isImageAvatar(avatar);
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();
  const defaultRing = isTeacher ? Gradients.teacher : Gradients.sky;
  const chosenRing = ringColors || defaultRing;

  const content = isImage ? (
    <Image
      source={{ uri: resolveAvatarUrl(avatar) }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        avatarStyle as any,
      ]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View
      style={[
        styles.fallbackCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isTeacher ? Colors.teacherPurpleLight : Colors.skyBlueLight,
        },
        avatarStyle,
      ]}
    >
      {avatar && avatar.length <= 6 ? (
        <Text style={[{ fontSize: size * 0.52 }, textStyle]}>{avatar}</Text>
      ) : (
        <Text
          style={[
            styles.initialText,
            {
              fontSize: size * 0.44,
              color: isTeacher ? Colors.teacherPurple : Colors.skyBlueDark,
            },
            textStyle,
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );

  if (showRing) {
    const ringPadding = Math.max(3, Math.round(size * 0.05));
    return (
      <View style={[styles.ringContainer, Shadows.soft, style]}>
        <LinearGradient
          colors={chosenRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.ring,
            {
              width: size + ringPadding * 2,
              height: size + ringPadding * 2,
              borderRadius: (size + ringPadding * 2) / 2,
              padding: ringPadding,
            },
          ]}
        >
          <View
            style={[
              styles.ringInner,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            {content}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return <View style={style}>{content}</View>;
};

const styles = StyleSheet.create({
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initialText: {
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.heavy,
  },
});
