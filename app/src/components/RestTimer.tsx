import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';

interface Props {
  /** Increment this to (re)start the timer, e.g. after logging a set. */
  startKey: number;
  defaultSeconds?: number;
}

export default function RestTimer({ startKey, defaultSeconds = 90 }: Props) {
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
        <Pressable style={styles.button} onPress={() => setSecondsLeft((s) => s + 15)}>
          <Text style={styles.buttonText}>+15s</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={() => setRunning(false)}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  label: { ...TYPOGRAPHY.label, color: COLORS.accent },
  time: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  row: { flexDirection: 'row', gap: SPACING.sm },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  buttonText: { color: COLORS.accentText, fontWeight: '700', fontSize: 13 },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  skipButtonText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
});
