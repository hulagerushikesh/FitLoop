import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme, useThemedStyles } from '../../theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  circle?: boolean;
  style?: ViewStyle;
}

/** Single shimmering placeholder block. Compose into content-shaped loaders. */
export function Skeleton({ width = '100%', height = 16, radius = 8, circle, style }: SkeletonProps) {
  const styles = useThemedStyles(createStyles);
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const size = circle ? { width: height, height, borderRadius: height / 2 } : { width, height, borderRadius: radius };
  return <Animated.View style={[styles.block, size, { opacity: pulse }, style]} />;
}

/** Content-shaped placeholder for a Card with a title line + two body lines. */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="45%" height={14} />
      <Skeleton width="80%" height={22} style={styles.gap} />
      <Skeleton width="65%" height={14} style={styles.gap} />
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    block: { backgroundColor: t.colors.skeleton },
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: t.spacing.lg,
    },
    gap: { marginTop: t.spacing.md },
  });
}
