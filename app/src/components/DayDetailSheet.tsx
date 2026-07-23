import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Dumbbell, Flame, GlassWater, UtensilsCrossed, X } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { fetchSessionsForDate } from '../services/calendar';
import { signedProgressPhotoUrl } from '../services/analytics';
import { Theme, useTheme, useThemedStyles } from '../theme';
import type { DailySummary, WorkoutSession } from '../types/database';

interface Props {
  visible: boolean;
  date: string | null;
  summary?: DailySummary;
  /** storage_path of the day's progress photo, if any. */
  photoPath?: string | null;
  isToday?: boolean;
  capturingPhoto?: boolean;
  onAddPhoto?: () => void;
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
export default function DayDetailSheet({
  visible,
  date,
  summary,
  photoPath,
  isToday,
  capturingPhoto,
  onAddPhoto,
  onClose,
}: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !user || !date) return;
    setLoading(true);
    fetchSessionsForDate(user.id, date)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [visible, user, date]);

  // Resolve a signed URL for the day's photo (the bucket is private).
  useEffect(() => {
    if (!visible || !photoPath) {
      setPhotoUrl(null);
      return;
    }
    let active = true;
    signedProgressPhotoUrl(photoPath)
      .then((url) => {
        if (active) setPhotoUrl(url);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });
    return () => {
      active = false;
    };
  }, [visible, photoPath]);

  // Show each workout once — a day can have duplicate sessions of the same
  // routine (e.g. a session resumed/re-created), but the day summary should
  // just say what you trained, like "Leg day", not repeat it.
  const uniqueWorkouts: WorkoutSession[] = [];
  const seenNames = new Set<string>();
  for (const s of sessions) {
    if (seenNames.has(s.name)) continue;
    seenNames.add(s.name);
    uniqueWorkouts.push(s);
  }

  const body = (
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
            <Stat
              icon={<GlassWater size={18} color={t.colors.water} />}
              value={`${((summary?.water_ml ?? 0) / 1000).toFixed(1)}L`}
              label="water"
              valueColor={t.colors.water}
              styles={styles}
            />
          </View>

          {photoUrl || (isToday && onAddPhoto) ? (
            <>
              <Text style={styles.subtitle}>Progress photo</Text>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
              ) : (
                <Pressable style={styles.addPhoto} onPress={onAddPhoto} disabled={capturingPhoto}>
                  {capturingPhoto ? (
                    <ActivityIndicator color={t.colors.accentEmphasis} />
                  ) : (
                    <>
                      <Camera size={20} color={t.colors.accentEmphasis} />
                      <Text style={styles.addPhotoText}>Add today's photo</Text>
                    </>
                  )}
                </Pressable>
              )}
            </>
          ) : null}

          <Text style={styles.subtitle}>Workouts</Text>
          {loading ? (
            <ActivityIndicator color={t.colors.accentEmphasis} style={{ marginTop: t.spacing.sm }} />
          ) : uniqueWorkouts.length === 0 ? (
            <Text style={styles.empty}>No workout logged</Text>
          ) : (
            uniqueWorkouts.map((s) => (
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
  );

  // On web, RN's <Modal> renders through a portal on document.body and escapes
  // the centered phone frame — the sheet ends up as a detached full-width strip
  // at the bottom of the whole browser window. Render it as an in-tree absolute
  // overlay so it stays anchored inside the app. Native keeps the real Modal
  // (correct full-screen behaviour + hardware back handling).
  if (Platform.OS === 'web') {
    if (!visible) return null;
    return <View style={styles.webOverlay}>{body}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {body}
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
  const isWeb = Platform.OS === 'web';
  return StyleSheet.create({
    webOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    // Native: bottom sheet. Web: a centered, width-capped card so it never
    // stretches across a wide browser window or detaches at the viewport edge.
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.overlay,
      justifyContent: isWeb ? 'center' : 'flex-end',
      alignItems: 'center',
      padding: isWeb ? t.spacing.xl : 0,
    },
    sheet: {
      width: '100%',
      maxWidth: isWeb ? 420 : undefined,
      alignSelf: 'center',
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radii.xl,
      borderTopRightRadius: t.radii.xl,
      borderBottomLeftRadius: isWeb ? t.radii.xl : 0,
      borderBottomRightRadius: isWeb ? t.radii.xl : 0,
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
      // A drag handle only reads as a bottom sheet; hide it on the web card.
      opacity: isWeb ? 0 : 1,
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
    photo: { width: '100%', height: 220, borderRadius: t.radii.lg, backgroundColor: t.colors.surfaceElevated },
    addPhoto: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.lg,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.border,
      backgroundColor: t.colors.surfaceElevated,
    },
    addPhotoText: { ...t.typography.bodyBold, color: t.colors.accentEmphasis },
    workoutRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
    workoutName: { ...t.typography.body, color: t.colors.textPrimary, flex: 1 },
    workoutBurn: { ...t.typography.caption, color: t.colors.energy },
  });
}
