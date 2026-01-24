// Loading State Component - Reusable loading indicators
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { useTheme } from '../theme';

export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse' | 'shimmer';

export interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: 'small' | 'medium' | 'large';
  message?: string;
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  style?: any;
  testID?: string;
}

// Animated Dots Component
function AnimatedDots({ color, size }: { color: string; size: number }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: size * 0.3,
  };

  return (
    <View style={styles.dotsContainer}>
      <Animated.View
        style={[
          dotStyle,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot1, 0.5)) }] },
        ]}
      />
      <Animated.View
        style={[
          dotStyle,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot2, 0.5)) }] },
        ]}
      />
      <Animated.View
        style={[
          dotStyle,
          { transform: [{ scale: Animated.add(1, Animated.multiply(dot3, 0.5)) }] },
        ]}
      />
    </View>
  );
}

// Pulse Animation Component
function PulseLoader({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.5,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <View
        style={[
          styles.pulseCore,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    </View>
  );
}

// Shimmer Effect Component
function ShimmerLoader({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const translateX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 200,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={styles.shimmerContainer}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.shimmerLine,
            {
              backgroundColor: theme.colors.surface,
              width: i === 3 ? '60%' : '100%',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.shimmerGradient,
              {
                backgroundColor: 'rgba(255,255,255,0.5)',
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

// Skeleton Card
export function SkeletonCard({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        { backgroundColor: theme.colors.surface, opacity },
      ]}
    >
      <View style={[styles.skeletonImage, { backgroundColor: theme.colors.background }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonTitle, { backgroundColor: theme.colors.background }]} />
        <View style={[styles.skeletonText, { backgroundColor: theme.colors.background }]} />
        <View
          style={[
            styles.skeletonText,
            { backgroundColor: theme.colors.background, width: '60%' },
          ]}
        />
      </View>
    </Animated.View>
  );
}

export function LoadingState({
  variant = 'spinner',
  size = 'medium',
  message,
  color,
  fullScreen = false,
  overlay = false,
  style,
  testID,
}: LoadingStateProps) {
  const theme = useTheme();
  const loaderColor = color || theme.colors.primary || '#6366F1';

  const sizeMap = {
    small: { spinner: 20, dots: 6, pulse: 16 },
    medium: { spinner: 36, dots: 10, pulse: 24 },
    large: { spinner: 48, dots: 14, pulse: 32 },
  };

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <AnimatedDots color={loaderColor} size={sizeMap[size].dots} />;
      case 'pulse':
        return <PulseLoader color={loaderColor} size={sizeMap[size].pulse} />;
      case 'shimmer':
        return <ShimmerLoader theme={theme} />;
      case 'skeleton':
        return <SkeletonCard theme={theme} />;
      default:
        return (
          <ActivityIndicator
            size={size === 'small' ? 'small' : 'large'}
            color={loaderColor}
          />
        );
    }
  };

  const content = (
    <>
      {renderLoader()}
      {message && (
        <Text
          style={[
            styles.message,
            { color: overlay ? '#FFFFFF' : theme.colors.textSecondary },
          ]}
        >
          {message}
        </Text>
      )}
    </>
  );

  if (overlay) {
    return (
      <View style={[styles.overlay, style]} testID={testID}>
        <View style={styles.overlayContent}>{content}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        style,
      ]}
      testID={testID}
    >
      {content}
    </View>
  );
}

// Convenience components
export function FullScreenLoading({ message }: { message?: string }) {
  return <LoadingState fullScreen message={message} />;
}

export function OverlayLoading({ message }: { message?: string }) {
  return <LoadingState overlay message={message} />;
}

export function InlineLoading({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) {
  return <LoadingState variant="dots" size={size} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
    minHeight: 300,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCore: {},
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  shimmerContainer: {
    width: '100%',
    gap: 12,
  },
  shimmerLine: {
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  skeletonCard: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  skeletonImage: {
    height: 160,
  },
  skeletonContent: {
    padding: 16,
    gap: 8,
  },
  skeletonTitle: {
    height: 20,
    borderRadius: 4,
    width: '70%',
  },
  skeletonText: {
    height: 14,
    borderRadius: 4,
    width: '100%',
  },
});
