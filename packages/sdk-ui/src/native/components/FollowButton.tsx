// FollowButton - Standalone follow/unfollow button
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';

export interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'text';
  followLabel?: string;
  followingLabel?: string;
}

export function FollowButton({
  isFollowing,
  onPress,
  isLoading = false,
  disabled = false,
  size = 'medium',
  variant = 'filled',
  followLabel = 'Seguir',
  followingLabel = 'Siguiendo',
}: FollowButtonProps) {
  const theme = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 12,
          borderRadius: 14,
          minWidth: 70,
        };
      case 'large':
        return {
          paddingHorizontal: 28,
          paddingVertical: 14,
          fontSize: 16,
          borderRadius: 24,
          minWidth: 140,
        };
      default: // medium
        return {
          paddingHorizontal: 20,
          paddingVertical: 10,
          fontSize: 14,
          borderRadius: 20,
          minWidth: 100,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const getButtonStyle = () => {
    if (variant === 'text') {
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
      };
    }

    if (variant === 'outlined' || isFollowing) {
      return {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
      };
    }

    return {
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
    };
  };

  const getTextColor = () => {
    if (variant === 'filled' && !isFollowing) {
      return '#FFFFFF';
    }
    return theme.colors.primary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        {
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius,
          minWidth: sizeStyles.minWidth,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeStyles.fontSize,
              color: getTextColor(),
            },
          ]}
        >
          {isFollowing ? followingLabel : followLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
