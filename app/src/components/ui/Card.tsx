import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme, useThemedStyles } from '../../theme';
import { tapHaptic } from '../../utils/haptics';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  highlighted?: boolean;
  elevated?: boolean;
  onPress?: () => void;
}

export default function Card({ children, style, highlighted, elevated, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(1)).current;

  const body = (
    <View
      style={[styles.card, elevated && styles.elevated, highlighted && styles.highlighted, style]}
    >
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          tapHaptic();
          onPress();
        }}
        onPressIn={() =>
          Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start()
        }
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: t.spacing.lg,
      ...t.shadows.card,
    },
    elevated: {
      backgroundColor: t.colors.surfaceElevated,
      ...t.shadows.raised,
    },
    highlighted: { borderColor: t.colors.accent },
  });
}
