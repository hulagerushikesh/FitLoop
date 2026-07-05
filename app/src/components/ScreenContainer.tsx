import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Theme, useThemedStyles } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, style }: Props) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.container, style]}>{children}</View>;
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
  });
}
