import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dumbbell, Footprints, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react-native';
import { useUnits } from '../../hooks/useUnits';
import { resolveMatchedExercise, type VoiceBatch, type VoiceKind } from '../../engine/voiceLogParsing';
import { Button } from '../ui';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';

// What the modal hands back once the user confirms — fully edited and
// normalized (weights already in kg), ready for the caller to persist.
export type CommitItem =
  | { kind: 'food'; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }
  | { kind: 'workout'; exerciseId: string; exerciseName: string; sets: { weightKg: number | null; reps: number | null }[] }
  | { kind: 'activity'; activityName: string; durationMinutes: number | null; estimatedCalories: number | null };

interface Props {
  visible: boolean;
  batch: VoiceBatch | null;
  /** Library used to resolve/choose matched exercises (workout rows). */
  exercises?: { id: string; name: string }[];
  /** Which kinds this entry point can persist; other kinds are hidden. */
  supportedKinds: VoiceKind[];
  /** Persist every confirmed item at once; caller toasts + reloads + closes. */
  onCommit: (items: CommitItem[]) => Promise<void> | void;
  onClose: () => void;
  /** Unclear fallback (no items): hand the transcript to a manual-entry flow. */
  onRouteFood?: (transcript: string) => void;
  onRouteWorkout?: (transcript: string) => void;
}

type FoodRow = { key: string; kind: 'food'; name: string; calories: string; protein: string; carbs: string; fat: string };
type WorkoutRow = {
  key: string;
  kind: 'workout';
  exerciseName: string;
  selected: { id: string; name: string } | null;
  showPicker: boolean;
  query: string;
  sets: { weight: string; reps: string }[];
};
type ActivityRow = { key: string; kind: 'activity'; activityName: string; duration: string; calories: string };
type Row = FoodRow | WorkoutRow | ActivityRow;

/**
 * Confirmation/edit sheet for a parsed voice batch. Lists EVERY item the user
 * spoke (foods, exercises, activities), each editable, and logs them all with
 * one tap. Nothing is ever saved without that tap — values are only pre-filled.
 * In-tree overlay on web (stays inside the phone frame), real Modal on native.
 */
export default function VoiceConfirmModal({
  visible,
  batch,
  exercises = [],
  supportedKinds,
  onCommit,
  onClose,
  onRouteFood,
  onRouteWorkout,
}: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const units = useUnits();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  // Re-seed editable rows whenever a new batch comes in (supported kinds only).
  useEffect(() => {
    if (!batch) return;
    setSaving(false);
    let seq = 0;
    const next: Row[] = [];
    for (const item of batch.items) {
      if (!supportedKinds.includes(item.kind)) continue;
      const key = `r${seq++}`;
      if (item.kind === 'food') {
        next.push({
          key,
          kind: 'food',
          name: item.name,
          calories: String(item.calories),
          protein: String(item.protein_g),
          carbs: String(item.carbs_g),
          fat: String(item.fat_g),
        });
      } else if (item.kind === 'workout') {
        const matched = resolveMatchedExercise(item, exercises);
        next.push({
          key,
          kind: 'workout',
          exerciseName: item.exerciseName,
          selected: matched ?? null,
          showPicker: matched == null,
          query: '',
          sets:
            item.sets.length > 0
              ? item.sets.map((s) => ({
                  weight: s.weightKg != null ? String(units.displayWeight(s.weightKg)) : '',
                  reps: s.reps != null ? String(s.reps) : '',
                }))
              : [{ weight: '', reps: '' }],
        });
      } else {
        next.push({
          key,
          kind: 'activity',
          activityName: item.activityName,
          duration: item.durationMinutes != null ? String(item.durationMinutes) : '',
          calories: item.estimatedCalories != null ? String(item.estimatedCalories) : '',
        });
      }
    }
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? ({ ...r, ...patch } as Row) : r)));
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const patchSet = (key: string, i: number, patch: Partial<{ weight: string; reps: string }>) =>
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.kind === 'workout'
          ? { ...r, sets: r.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }
          : r
      )
    );
  const addSet = (key: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.kind === 'workout'
          ? { ...r, sets: [...r.sets, { weight: r.sets[r.sets.length - 1]?.weight ?? '', reps: '' }] }
          : r
      )
    );
  const removeSet = (key: string, i: number) =>
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.kind === 'workout' && r.sets.length > 1
          ? { ...r, sets: r.sets.filter((_, idx) => idx !== i) }
          : r
      )
    );

  // Every workout row must have an exercise chosen before we can log the batch.
  const unresolvedWorkout = rows.some((r) => r.kind === 'workout' && !r.selected);
  const canCommit = rows.length > 0 && !unresolvedWorkout;

  const commit = async () => {
    const items: CommitItem[] = [];
    for (const r of rows) {
      if (r.kind === 'food') {
        if (!r.name.trim()) continue;
        items.push({
          kind: 'food',
          name: r.name.trim(),
          calories: Number(r.calories) || 0,
          protein_g: Number(r.protein) || 0,
          carbs_g: Number(r.carbs) || 0,
          fat_g: Number(r.fat) || 0,
        });
      } else if (r.kind === 'workout') {
        if (!r.selected) continue;
        const sets = r.sets
          .map((s) => ({
            weightKg: s.weight.trim() ? units.parseWeight(Number(s.weight)) : null,
            reps: s.reps.trim() ? Number(s.reps) : null,
          }))
          .filter((s) => s.reps != null || s.weightKg != null);
        items.push({ kind: 'workout', exerciseId: r.selected.id, exerciseName: r.selected.name, sets });
      } else {
        if (!r.activityName.trim()) continue;
        items.push({
          kind: 'activity',
          activityName: r.activityName.trim(),
          durationMinutes: r.duration.trim() ? Number(r.duration) : null,
          estimatedCalories: r.calories.trim() ? Number(r.calories) : null,
        });
      }
    }
    if (items.length === 0) return;
    setSaving(true);
    try {
      await onCommit(items);
    } finally {
      setSaving(false);
    }
  };

  const isUnclear = !!batch && rows.length === 0;

  const macroInput = (label: string, value: string, onChange: (v: string) => void, decimal = true) => (
    <View style={styles.macroField}>
      <Text style={styles.macroFieldLabel}>{label}</Text>
      <TextInput
        style={styles.macroInput}
        placeholder="0"
        placeholderTextColor={t.colors.textTertiary}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );

  if (!batch) return null;

  const body = (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {isUnclear ? 'Where should this go?' : `Confirm ${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cancel">
            <X size={20} color={t.colors.textSecondary} />
          </Pressable>
        </View>

        {batch.transcript ? <Text style={styles.transcript}>“{batch.transcript}”</Text> : null}

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {isUnclear ? (
            <>
              <Text style={styles.unclearMsg}>{batch.message ?? "Couldn't tell what to log."}</Text>
              {onRouteFood || onRouteWorkout ? (
                <View style={styles.routeRow}>
                  {onRouteFood ? (
                    <Button label="Log as food" variant="secondary" style={styles.routeButton} onPress={() => onRouteFood(batch.transcript)} />
                  ) : null}
                  {onRouteWorkout ? (
                    <Button label="Log as workout" variant="secondary" style={styles.routeButton} onPress={() => onRouteWorkout(batch.transcript)} />
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            rows.map((r) => (
              <View key={r.key} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                    {r.kind === 'food' ? (
                      <UtensilsCrossed size={16} color={t.colors.accentEmphasis} />
                    ) : r.kind === 'workout' ? (
                      <Dumbbell size={16} color={t.colors.accentEmphasis} />
                    ) : (
                      <Footprints size={16} color={t.colors.accentEmphasis} />
                    )}
                    <Text style={styles.itemKind}>{r.kind}</Text>
                  </View>
                  <Pressable onPress={() => removeRow(r.key)} hitSlop={8} accessibilityLabel="Remove item">
                    <Trash2 size={16} color={t.colors.textTertiary} />
                  </Pressable>
                </View>

                {r.kind === 'food' ? (
                  <>
                    <TextInput
                      style={styles.textInput}
                      value={r.name}
                      onChangeText={(v) => patchRow(r.key, { name: v })}
                      placeholder="Food name"
                      placeholderTextColor={t.colors.textTertiary}
                    />
                    <View style={styles.macroRow}>
                      {macroInput('Kcal', r.calories, (v) => patchRow(r.key, { calories: v }), false)}
                      {macroInput('Protein', r.protein, (v) => patchRow(r.key, { protein: v }))}
                      {macroInput('Carbs', r.carbs, (v) => patchRow(r.key, { carbs: v }))}
                      {macroInput('Fat', r.fat, (v) => patchRow(r.key, { fat: v }))}
                    </View>
                  </>
                ) : null}

                {r.kind === 'workout' ? (
                  <>
                    {r.selected && !r.showPicker ? (
                      <Pressable style={styles.selectedExercise} onPress={() => patchRow(r.key, { showPicker: true })}>
                        <Text style={styles.selectedExerciseName}>{r.selected.name}</Text>
                        <Text style={styles.changeLink}>Change</Text>
                      </Pressable>
                    ) : (
                      <>
                        <TextInput
                          style={styles.textInput}
                          value={r.query}
                          onChangeText={(v) => patchRow(r.key, { query: v })}
                          placeholder={r.exerciseName ? `Heard "${r.exerciseName}" — pick a match` : 'Search your exercises'}
                          placeholderTextColor={t.colors.textTertiary}
                        />
                        <View style={styles.pickerList}>
                          {exercises
                            .filter((e) => {
                              const q = r.query.trim().toLowerCase();
                              return q ? e.name.toLowerCase().includes(q) : true;
                            })
                            .slice(0, 30)
                            .map((e) => (
                              <Pressable
                                key={e.id}
                                style={[styles.pickerRow, r.selected?.id === e.id && styles.pickerRowActive]}
                                onPress={() => patchRow(r.key, { selected: e, showPicker: false })}
                              >
                                <Text style={styles.pickerRowText}>{e.name}</Text>
                              </Pressable>
                            ))}
                        </View>
                      </>
                    )}

                    {r.sets.map((s, i) => (
                      <View key={i} style={styles.setRow}>
                        <Text style={styles.setNum}>{i + 1}</Text>
                        <View style={styles.setField}>
                          <Text style={styles.macroFieldLabel}>{units.weightUnit}</Text>
                          <TextInput
                            style={styles.macroInput}
                            value={s.weight}
                            onChangeText={(v) => patchSet(r.key, i, { weight: v })}
                            keyboardType="decimal-pad"
                            placeholder="-"
                            placeholderTextColor={t.colors.textTertiary}
                          />
                        </View>
                        <View style={styles.setField}>
                          <Text style={styles.macroFieldLabel}>Reps</Text>
                          <TextInput
                            style={styles.macroInput}
                            value={s.reps}
                            onChangeText={(v) => patchSet(r.key, i, { reps: v })}
                            keyboardType="number-pad"
                            placeholder="-"
                            placeholderTextColor={t.colors.textTertiary}
                          />
                        </View>
                        <Pressable onPress={() => removeSet(r.key, i)} hitSlop={8} style={styles.setRemove} accessibilityLabel="Remove set">
                          <Trash2 size={14} color={t.colors.textTertiary} />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable style={styles.addSet} onPress={() => addSet(r.key)}>
                      <Plus size={14} color={t.colors.accentEmphasis} />
                      <Text style={styles.addSetText}>Add set</Text>
                    </Pressable>
                  </>
                ) : null}

                {r.kind === 'activity' ? (
                  <>
                    <TextInput
                      style={styles.textInput}
                      value={r.activityName}
                      onChangeText={(v) => patchRow(r.key, { activityName: v })}
                      placeholder="Activity (e.g. Running)"
                      placeholderTextColor={t.colors.textTertiary}
                    />
                    <View style={styles.macroRow}>
                      {macroInput('Minutes', r.duration, (v) => patchRow(r.key, { duration: v }), false)}
                      {macroInput('Est. kcal', r.calories, (v) => patchRow(r.key, { calories: v }), false)}
                    </View>
                  </>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

        {!isUnclear ? (
          <>
            {unresolvedWorkout ? (
              <Text style={styles.hint}>Pick an exercise for each workout to log the batch.</Text>
            ) : null}
            <Button
              label={rows.length > 1 ? `Log all ${rows.length}` : 'Log it'}
              onPress={commit}
              loading={saving}
              disabled={!canCommit}
              style={styles.cta}
            />
          </>
        ) : null}
      </Pressable>
    </Pressable>
  );

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

function createStyles(t: Theme) {
  const isWeb = Platform.OS === 'web';
  return StyleSheet.create({
    webOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.overlay,
      justifyContent: isWeb ? 'center' : 'flex-end',
      alignItems: 'center',
      padding: isWeb ? t.spacing.xl : 0,
    },
    sheet: {
      width: '100%',
      maxWidth: isWeb ? 440 : undefined,
      maxHeight: '88%',
      alignSelf: 'center',
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radii.xl,
      borderTopRightRadius: t.radii.xl,
      borderBottomLeftRadius: isWeb ? t.radii.xl : 0,
      borderBottomRightRadius: isWeb ? t.radii.xl : 0,
      padding: t.spacing.xl,
      paddingBottom: t.spacing.xxl,
      gap: t.spacing.sm,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.border,
      marginBottom: t.spacing.sm,
      opacity: isWeb ? 0 : 1,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...t.typography.h3, color: t.colors.textPrimary },
    transcript: { ...t.typography.body, color: t.colors.textSecondary, fontStyle: 'italic' },
    scroll: { marginTop: t.spacing.xs },
    itemCard: {
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surfaceElevated,
      borderRadius: t.radii.lg,
      padding: t.spacing.md,
      marginBottom: t.spacing.md,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
    itemKind: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase' },
    textInput: {
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      ...t.typography.body,
      color: t.colors.textPrimary,
    },
    macroRow: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm },
    macroField: { flex: 1, minWidth: 0 },
    macroFieldLabel: {
      fontSize: 10,
      fontFamily: FONTS.bold,
      color: t.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    macroInput: {
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.md,
      padding: t.spacing.sm,
      fontSize: 14,
      color: t.colors.textPrimary,
    },
    selectedExercise: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.colors.accent,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    selectedExerciseName: { ...t.typography.bodyBold, color: t.colors.textPrimary, flex: 1 },
    changeLink: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    pickerList: { maxHeight: 150, marginTop: t.spacing.xs },
    pickerRow: { paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.md, borderRadius: t.radii.sm },
    pickerRowActive: { backgroundColor: t.colors.accentMuted },
    pickerRowText: { ...t.typography.body, color: t.colors.textPrimary },
    setRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm, marginTop: t.spacing.sm },
    setNum: { ...t.typography.bodyBold, color: t.colors.textSecondary, width: 14, paddingBottom: t.spacing.sm },
    setField: { flex: 1, minWidth: 0 },
    setRemove: { padding: t.spacing.sm, paddingBottom: t.spacing.sm },
    addSet: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: t.spacing.sm },
    addSetText: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    unclearMsg: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.sm },
    routeRow: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.lg },
    routeButton: { flex: 1 },
    hint: { ...t.typography.caption, color: t.colors.warning, textAlign: 'center', marginTop: t.spacing.sm },
    cta: { marginTop: t.spacing.md },
  });
}
