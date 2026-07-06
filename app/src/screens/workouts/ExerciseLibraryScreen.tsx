import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Camera, CirclePlus, Info, Search } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchExerciseLibrary, addCustomExercise } from '../../services/workouts';
import { pickAndUploadImage } from '../../services/images';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { Button, Chip, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import { MUSCLE_GROUP_OPTIONS } from '../../constants/workoutTemplates';
import type { Exercise, MuscleGroup } from '../../types/database';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'ExerciseLibrary'>;

export default function ExerciseLibraryScreen({ navigation, route }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const selectMode = route.params?.selectMode ?? false;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup | undefined>();
  const [newCategory, setNewCategory] = useState<'compound' | 'isolation' | 'cardio' | undefined>();
  const [newEquipment, setNewEquipment] = useState('');
  const [newPhotoPath, setNewPhotoPath] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { showToast } = useToast();
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
      await addCustomExercise(user.id, {
        name: newName.trim(),
        muscle_group: newMuscleGroup,
        category: newCategory ?? null,
        equipment: newEquipment.trim() || null,
        photo_path: newPhotoPath,
      });
      setNewName('');
      setNewMuscleGroup(undefined);
      setNewCategory(undefined);
      setNewEquipment('');
      setNewPhotoPath(null);
      setShowAddForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add exercise');
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async () => {
    if (!user || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const path = await pickAndUploadImage('exercise-photos', user.id, 'exercise');
      if (path) setNewPhotoPath(path);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Photo upload failed', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={t.colors.accentEmphasis} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.searchWrap}>
        <Search size={18} color={t.colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search exercises"
          placeholderTextColor={t.colors.textTertiary}
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
                    <Info size={20} color={t.colors.textSecondary} />
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
                <TextField placeholder="Equipment (optional)" value={newEquipment} onChangeText={setNewEquipment} />
                <View style={styles.categoryRow}>
                  {(['compound', 'isolation', 'cardio'] as const).map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      selected={newCategory === c}
                      onPress={() => setNewCategory(newCategory === c ? undefined : c)}
                      style={styles.categoryChip}
                    />
                  ))}
                </View>
                <Pressable style={styles.photoButton} onPress={onPickPhoto}>
                  <Camera size={16} color={t.colors.accentEmphasis} />
                  <Text style={styles.photoButtonText}>
                    {uploadingPhoto ? 'Uploading…' : newPhotoPath ? 'Photo added ✓' : 'Add photo (optional)'}
                  </Text>
                </Pressable>
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
                <CirclePlus size={18} color={t.colors.accentEmphasis} />
                <Text style={styles.addButtonText}>Add custom exercise</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: t.spacing.lg,
    marginBottom: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    paddingHorizontal: t.spacing.lg,
  },
  searchIcon: { marginRight: t.spacing.sm },
  search: { flex: 1, paddingVertical: t.spacing.md, fontSize: 16, color: t.colors.textPrimary },
  list: { paddingHorizontal: t.spacing.lg, paddingBottom: 40 },
  section: { marginTop: t.spacing.lg },
  sectionTitle: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase', marginBottom: t.spacing.sm },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: { flex: 1, paddingVertical: t.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoButton: { padding: t.spacing.sm },
  rowText: { ...t.typography.body, color: t.colors.textPrimary },
  rowSub: { ...t.typography.caption, color: t.colors.textSecondary },
  addSection: { marginTop: t.spacing.xl },
  addButton: { flexDirection: 'row', gap: t.spacing.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing.md },
  addButtonText: { color: t.colors.accentEmphasis, fontFamily: FONTS.semibold, fontSize: 15 },
  saveButton: { marginTop: t.spacing.sm },
  categoryRow: { flexDirection: 'row', gap: t.spacing.sm, marginBottom: t.spacing.md },
  categoryChip: { flex: 1, justifyContent: 'center' },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    paddingVertical: t.spacing.sm,
    marginBottom: t.spacing.md,
    minHeight: 44,
  },
  photoButtonText: { ...t.typography.bodySmall, color: t.colors.accentEmphasis },
  error: { color: t.colors.danger, marginHorizontal: t.spacing.lg, marginBottom: t.spacing.sm, ...t.typography.caption },
});
}
