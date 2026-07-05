import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme, useThemedStyles } from '../theme';
import { tapHaptic } from '../utils/haptics';

interface Props {
  /** Increment this to (re)start the timer, e.g. after logging a set. */
  startKey: number;
  defaultSeconds?: number;
}

export default function RestTimer({ startKey, defaultSeconds = 90 }: Props) {
  const styles = useThemedStyles(createStyles);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (startKey === 0) return;
    setSecondsLeft(defaultSeconds);
    setRunning(true);
    // defaultSeconds intentionally excluded: only startKey should retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) {
      if (secondsLeft <= 0) setRunning(false);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, secondsLeft]);

  if (!running) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>REST</Text>
        <Text style={styles.time}>
          {mm}:{ss.toString().padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.row}>
        <Pressable
          style={styles.button}
          onPress={() => {
            tapHaptic();
            setSecondsLeft((s) => s + 15);
          }}
        >
          <Text style={styles.buttonText}>+15s</Text>
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={() => {
            tapHaptic();
            setRunning(false);
          }}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.colors.accentMuted,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.colors.accent,
      padding: t.spacing.lg,
      marginVertical: t.spacing.md,
    },
    label: { ...t.typography.label, color: t.colors.accentEmphasis },
    time: { ...t.typography.stat, color: t.colors.textPrimary },
    row: { flexDirection: 'row', gap: t.spacing.sm },
    button: {
      backgroundColor: t.colors.accent,
      borderRadius: t.radii.full,
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    buttonText: { ...t.typography.bodySmall, fontFamily: t.typography.bodyBold.fontFamily, color: t.colors.onAccent },
    skipButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.textSecondary,
      borderRadius: t.radii.full,
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    skipButtonText: { ...t.typography.bodySmall, fontFamily: t.typography.bodyBold.fontFamily, color: t.colors.textPrimary },
  });
}
