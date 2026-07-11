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
import { resolveMatchedExercise, type VoiceLogResult, type VoiceWorkoutSet } from '../../engine/voiceLogParsing';
import { Button } from '../ui';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';

export interface VoiceWorkoutSaveInput {
  exerciseId: string;
  exerciseName: string;
  sets: { weightKg: number | null; reps: number | null }[];
}

interface Props {
  visible: boolean;
  result: VoiceLogResult | null;
  /** Library used to resolve/choose the matched exercise (workout mode). */
  exercises?: { id: string; name: string }[];
  onClose: () => void;
  onSaveFood?: (food: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) => Promise<void> | void;
  onSaveWorkout?: (input: VoiceWorkoutSaveInput) => Promise<void> | void;
  onSaveActivity?: (activity: { activityName: string; durationMinutes: number | null; estimatedCalories: number | null }) => Promise<void> | void;
  /** Unclear fallback routes: hand the transcript to a manual-entry flow. */
  onRouteFood?: (transcript: string) => void;
  onRouteWorkout?: (transcript: string) => void;
}

interface EditableSet {
  weight: string;
  reps: string;
}

/**
 * Confirmation/edit sheet for a parsed voice log. Nothing is ever saved without
 * an explicit tap here — the parsed values are only PRE-FILLED. Rendered as an
 * in-tree overlay on web (so it stays inside the centered phone frame) and a
 * real Modal on native, matching DayDetailSheet.
 */
export default function VoiceConfirmModal({
  visible,
  result,
  exercises = [],
  onClose,
  onSaveFood,
  onSaveWorkout,
  onSaveActivity,
  onRouteFood,
  onRouteWorkout,
}: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const units = useUnits();
  const [saving, setSaving] = useState(false);

  // Food fields
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Workout fields
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [sets, setSets] = useState<EditableSet[]>([]);

  // Activity fields
  const [activityName, setActivityName] = useState('');
  const [duration, setDuration] = useState('');
  const [activityCalories, setActivityCalories] = useState('');

  // Re-seed editable state whenever a new result comes in.
  useEffect(() => {
    if (!result) return;
    setSaving(false);
    setShowPicker(false);
    setExerciseQuery('');
    if (result.type === 'food') {
      setFoodName(result.food.name);
      setCalories(String(result.food.calories));
      setProtein(String(result.food.protein_g));
      setCarbs(String(result.food.carbs_g));
      setFat(String(result.food.fat_g));
    } else if (result.type === 'workout') {
      const matched = resolveMatchedExercise(result.workout, exercises);
      setSelectedExercise(matched ?? null);
      setShowPicker(matched == null);
      const seed: VoiceWorkoutSet[] = result.workout.sets.length > 0 ? result.workout.sets : [{ weightKg: null, reps: null }];
      setSets(
        seed.map((s) => ({
          weight: s.weightKg != null ? String(units.displayWeight(s.weightKg)) : '',
          reps: s.reps != null ? String(s.reps) : '',
        }))
      );
    } else if (result.type === 'activity') {
      setActivityName(result.activity.activityName);
      setDuration(result.activity.durationMinutes != null ? String(result.activity.durationMinutes) : '');
      setActivityCalories(result.activity.estimatedCalories != null ? String(result.activity.estimatedCalories) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    const list = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;
    return list.slice(0, 40);
  }, [exercises, exerciseQuery]);

  if (!result) return null;

  const doSave = async (fn: () => Promise<void> | void) => {
    setSaving(true);
    try {
      await fn();
    } finally {
      setSaving(false);
    }
  };

  const onLogFood = () =>
    doSave(async () => {
      await onSaveFood?.({
        name: foodName.trim(),
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
      });
    });

  const onLogWorkout = () =>
    doSave(async () => {
      if (!selectedExercise) return;
      const parsedSets = sets
        .map((s) => ({
          weightKg: s.weight.trim() ? units.parseWeight(Number(s.weight)) : null,
          reps: s.reps.trim() ? Number(s.reps) : null,
        }))
        .filter((s) => s.reps != null || s.weightKg != null);
      await onSaveWorkout?.({ exerciseId: selectedExercise.id, exerciseName: selectedExercise.name, sets: parsedSets });
    });

  const onLogActivity = () =>
    doSave(async () => {
      await onSaveActivity?.({
        activityName: activityName.trim(),
        durationMinutes: duration.trim() ? Number(duration) : null,
        estimatedCalories: activityCalories.trim() ? Number(activityCalories) : null,
      });
    });

  const updateSet = (i: number, patch: Partial<EditableSet>) =>
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSet = () => setSets((prev) => [...prev, { weight: prev[prev.length - 1]?.weight ?? '', reps: '' }]);
  const removeSet = (i: number) => setSets((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const macroInput = (label: string, value: string, setter: (v: string) => void, decimal = true) => (
    <View style={styles.macroField}>
      <Text style={styles.macroFieldLabel}>{label}</Text>
      <TextInput
        style={styles.macroInput}
        placeholder="0"
        placeholderTextColor={t.colors.textTertiary}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        value={value}
        onChangeText={setter}
      />
    </View>
  );

  let title = 'Confirm log';
  let icon = <UtensilsCrossed size={18} color={t.colors.accentEmphasis} />;
  if (result.type === 'workout') {
    title = 'Confirm workout';
    icon = <Dumbbell size={18} color={t.colors.accentEmphasis} />;
  } else if (result.type === 'activity') {
    title = 'Confirm activity';
    icon = <Footprints size={18} color={t.colors.accentEmphasis} />;
  } else if (result.type === 'unclear') {
    title = 'Where should this go?';
  }

  const body = (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {icon}
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cancel">
            <X size={20} color={t.colors.textSecondary} />
          </Pressable>
        </View>

        {result.transcript ? <Text style={styles.transcript}>“{result.transcript}”</Text> : null}

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {result.type === 'food' ? (
            <>
              <Text style={styles.label}>Food</Text>
              <TextInput
                style={styles.textInput}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="Name"
                placeholderTextColor={t.colors.textTertiary}
              />
              <View style={styles.macroRow}>
                {macroInput('Kcal', calories, setCalories, false)}
                {macroInput('Protein', protein, setProtein)}
                {macroInput('Carbs', carbs, setCarbs)}
                {macroInput('Fat', fat, setFat)}
              </View>
              <Button label="Log food" onPress={onLogFood} loading={saving} disabled={!foodName.trim()} style={styles.cta} />
            </>
          ) : null}

          {result.type === 'workout' ? (
            <>
              <Text style={styles.label}>Exercise</Text>
              {selectedExercise && !showPicker ? (
                <Pressable style={styles.selectedExercise} onPress={() => setShowPicker(true)}>
                  <Text style={styles.selectedExerciseName}>{selectedExercise.name}</Text>
                  <Text style={styles.changeLink}>Change</Text>
                </Pressable>
              ) : (
                <>
                  <TextInput
                    style={styles.textInput}
                    value={exerciseQuery}
                    onChangeText={setExerciseQuery}
                    placeholder="Search your exercises"
                    placeholderTextColor={t.colors.textTertiary}
                  />
                  <View style={styles.pickerList}>
                    {filteredExercises.map((e) => (
                      <Pressable
                        key={e.id}
                        style={[styles.pickerRow, selectedExercise?.id === e.id && styles.pickerRowActive]}
                        onPress={() => {
                          setSelectedExercise(e);
                          setShowPicker(false);
                        }}
                      >
                        <Text style={styles.pickerRowText}>{e.name}</Text>
                      </Pressable>
                    ))}
                    {filteredExercises.length === 0 ? (
                      <Text style={styles.empty}>No matching exercise in your library.</Text>
                    ) : null}
                  </View>
                </>
              )}

              <Text style={styles.label}>Sets</Text>
              {sets.map((s, i) => (
                <View key={i} style={styles.setRow}>
                  <Text style={styles.setNum}>{i + 1}</Text>
                  <View style={styles.setField}>
                    <Text style={styles.macroFieldLabel}>{units.weightUnit}</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={s.weight}
                      onChangeText={(v) => updateSet(i, { weight: v })}
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
                      onChangeText={(v) => updateSet(i, { reps: v })}
                      keyboardType="number-pad"
                      placeholder="-"
                      placeholderTextColor={t.colors.textTertiary}
                    />
                  </View>
                  <Pressable onPress={() => removeSet(i)} hitSlop={8} style={styles.setRemove} accessibilityLabel="Remove set">
                    <Trash2 size={16} color={t.colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addSet} onPress={addSet}>
                <Plus size={16} color={t.colors.accentEmphasis} />
                <Text style={styles.addSetText}>Add set</Text>
              </Pressable>

              <Button
                label="Log workout"
                onPress={onLogWorkout}
                loading={saving}
                disabled={!selectedExercise}
                style={styles.cta}
              />
            </>
          ) : null}

          {result.type === 'activity' ? (
            <>
              <Text style={styles.label}>Activity</Text>
              <TextInput
                style={styles.textInput}
                value={activityName}
                onChangeText={setActivityName}
                placeholder="e.g. Running"
                placeholderTextColor={t.colors.textTertiary}
              />
              <View style={styles.macroRow}>
                {macroInput('Minutes', duration, setDuration, false)}
                {macroInput('Est. kcal', activityCalories, setActivityCalories, false)}
              </View>
              <Button label="Log activity" onPress={onLogActivity} loading={saving} disabled={!activityName.trim()} style={styles.cta} />
            </>
          ) : null}

          {result.type === 'unclear' ? (
            <>
              <Text style={styles.unclearMsg}>{result.message}</Text>
              <View style={styles.routeRow}>
                <Button label="Log as food" variant="secondary" style={styles.routeButton} onPress={() => onRouteFood?.(result.transcript)} />
                <Button label="Log as workout" variant="secondary" style={styles.routeButton} onPress={() => onRouteWorkout?.(result.transcript)} />
              </View>
            </>
          ) : null}
        </ScrollView>
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
      maxHeight: '86%',
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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
    title: { ...t.typography.h3, color: t.colors.textPrimary },
    transcript: { ...t.typography.body, color: t.colors.textSecondary, fontStyle: 'italic' },
    scroll: { marginTop: t.spacing.xs },
    label: {
      ...t.typography.label,
      color: t.colors.textSecondary,
      textTransform: 'uppercase',
      marginTop: t.spacing.md,
      marginBottom: t.spacing.xs,
    },
    textInput: {
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surfaceElevated,
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
      backgroundColor: t.colors.surfaceElevated,
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
      backgroundColor: t.colors.surfaceElevated,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    selectedExerciseName: { ...t.typography.bodyBold, color: t.colors.textPrimary, flex: 1 },
    changeLink: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    pickerList: { maxHeight: 180, marginTop: t.spacing.xs },
    pickerRow: {
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radii.sm,
    },
    pickerRowActive: { backgroundColor: t.colors.accentMuted },
    pickerRowText: { ...t.typography.body, color: t.colors.textPrimary },
    empty: { ...t.typography.caption, color: t.colors.textTertiary, paddingVertical: t.spacing.sm },
    setRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm, marginTop: t.spacing.sm },
    setNum: { ...t.typography.bodyBold, color: t.colors.textSecondary, width: 16, paddingBottom: t.spacing.sm },
    setField: { flex: 1, minWidth: 0 },
    setRemove: { padding: t.spacing.sm, paddingBottom: t.spacing.sm },
    addSet: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: t.spacing.md },
    addSetText: { ...t.typography.caption, color: t.colors.accentEmphasis, fontFamily: FONTS.bold },
    unclearMsg: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.sm },
    routeRow: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.lg },
    routeButton: { flex: 1 },
    cta: { marginTop: t.spacing.xl },
  });
}
