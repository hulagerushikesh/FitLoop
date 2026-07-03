import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchExerciseLibrary, addCustomExercise } from '../../services/workouts';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import ScreenContainer from '../../components/ScreenContainer';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import { MUSCLE_GROUP_OPTIONS } from '../../constants/workoutTemplates';
import type { Exercise, MuscleGroup } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseLibrary'>;

export default function ExerciseLibraryScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const selectMode = route.params?.selectMode ?? false;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    fetchExerciseLibrary(user.id)
      .then(setExercises)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load exercises'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const grouped = useMemo(() => {
    const filtered = exercises.filter((e) =>
      e.name.toLowerCase().includes(query.trim().toLowerCase())
    );
    const groups: Record<string, Exercise[]> = {};
    for (const e of filtered) {
      groups[e.muscle_group] = groups[e.muscle_group] ?? [];
      groups[e.muscle_group].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [exercises, query]);

  const onPressRow = (exercise: Exercise) => {
    if (selectMode) {
      navigation.navigate({
        name: 'RoutineBuilder',
        params: { selectedExerciseId: exercise.id },
        merge: true,
      });
    } else {
      navigation.navigate('ExerciseDetail', { exerciseId: exercise.id });
    }
  };

  const onAddCustom = async () => {
    if (!user || !newName.trim() || !newMuscleGroup) return;
    setSaving(true);
    setError(null);
    try {
      await addCustomExercise(user.id, { name: newName.trim(), muscle_group: newMuscleGroup });
      setNewName('');
      setNewMuscleGroup(undefined);
      setShowAddForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add exercise');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search exercises"
          placeholderTextColor={COLORS.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={grouped}
        keyExtractor={([group]) => group}
        renderItem={({ item: [group, items] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{group.replace('_', ' ')}</Text>
            {items.map((exercise) => (
              <View key={exercise.id} style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => onPressRow(exercise)}>
                  <Text style={styles.rowText}>{exercise.name}</Text>
                  {exercise.equipment ? <Text style={styles.rowSub}>{exercise.equipment}</Text> : null}
                </Pressable>
                {selectMode ? (
                  <Pressable
                    style={styles.infoButton}
                    onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: exercise.id })}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
        ListFooterComponent={
          <View style={styles.addSection}>
            {showAddForm ? (
              <>
                <TextField placeholder="Exercise name" value={newName} onChangeText={setNewName} />
                <OptionPicker
                  options={MUSCLE_GROUP_OPTIONS}
                  selected={newMuscleGroup}
                  onSelect={setNewMuscleGroup}
                />
                <Button
                  label="Save exercise"
                  onPress={onAddCustom}
                  disabled={!newName.trim() || !newMuscleGroup}
                  loading={saving}
                  style={styles.saveButton}
                />
              </>
            ) : (
              <Pressable style={styles.addButton} onPress={() => setShowAddForm(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                <Text style={styles.addButtonText}>Add custom exercise</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
  },
  searchIcon: { marginRight: SPACING.sm },
  search: { flex: 1, paddingVertical: SPACING.md, fontSize: 16, color: COLORS.textPrimary },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  section: { marginTop: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.sm },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: { flex: 1, paddingVertical: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoButton: { padding: SPACING.sm },
  rowText: { ...TYPOGRAPHY.body, color: COLORS.textPrimary },
  rowSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  addSection: { marginTop: SPACING.xl },
  addButton: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md },
  addButtonText: { color: COLORS.accent, fontWeight: '600', fontSize: 15 },
  saveButton: { marginTop: SPACING.sm },
  error: { color: COLORS.danger, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, ...TYPOGRAPHY.caption },
});
