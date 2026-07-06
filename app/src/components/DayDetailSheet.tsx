import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Dumbbell, Flame, UtensilsCrossed, X } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { fetchSessionsForDate } from '../services/calendar';
import { Theme, useTheme, useThemedStyles } from '../theme';
import type { DailySummary, WorkoutSession } from '../types/database';

interface Props {
  visible: boolean;
  date: string | null;
  summary?: DailySummary;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

/** Bottom-sheet detail for a single calendar day: calories, protein, workouts. */
export default function DayDetailSheet({ visible, date, summary, onClose }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user || !date) return;
    setLoading(true);
    fetchSessionsForDate(user.id, date)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [visible, user, date]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>{date ? formatDateLong(date) : ''}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close day details">
              <X size={20} color={t.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <Stat
              icon={<UtensilsCrossed size={18} color={t.colors.accentEmphasis} />}
              value={`${summary?.calories_consumed ?? 0}`}
              label="kcal in"
              styles={styles}
            />
            <Stat
              icon={<Flame size={18} color={t.colors.energy} />}
              value={`${summary?.calories_burned ?? 0}`}
              label="kcal burned"
              styles={styles}
            />
            <Stat
              value={`${summary?.protein_g ?? 0}g`}
              label="protein"
              valueColor={t.colors.protein}
              styles={styles}
            />
          </View>

          <Text style={styles.subtitle}>Workouts</Text>
          {loading ? (
            <ActivityIndicator color={t.colors.accentEmphasis} style={{ marginTop: t.spacing.sm }} />
          ) : sessions.length === 0 ? (
            <Text style={styles.empty}>No workout logged</Text>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={styles.workoutRow}>
                <Dumbbell size={16} color={t.colors.accentEmphasis} />
                <Text style={styles.workoutName}>{s.name}</Text>
                {s.calories_burned ? (
                  <Text style={styles.workoutBurn}>{s.calories_burned} kcal</Text>
                ) : null}
              </View>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stat({
  icon,
  value,
  label,
  valueColor,
  styles,
}: {
  icon?: React.ReactNode;
  value: string;
  label: string;
  valueColor?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radii.xl,
      borderTopRightRadius: t.radii.xl,
      padding: t.spacing.xl,
      paddingBottom: t.spacing.xxl,
      gap: t.spacing.md,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.border,
      marginBottom: t.spacing.sm,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...t.typography.h3, color: t.colors.textPrimary },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: t.colors.surfaceElevated,
      borderRadius: t.radii.lg,
      paddingVertical: t.spacing.lg,
    },
    stat: { alignItems: 'center', gap: 4 },
    statValue: { ...t.typography.statSmall, color: t.colors.textPrimary },
    statLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    subtitle: {
      ...t.typography.label,
      color: t.colors.textSecondary,
      textTransform: 'uppercase',
      marginTop: t.spacing.sm,
    },
    empty: { ...t.typography.caption, color: t.colors.textTertiary },
    workoutRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
    workoutName: { ...t.typography.body, color: t.colors.textPrimary, flex: 1 },
    workoutBurn: { ...t.typography.caption, color: t.colors.energy },
  });
}
