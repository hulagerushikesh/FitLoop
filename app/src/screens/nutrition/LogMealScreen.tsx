import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NutritionStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { addFoodLog, deleteMeal, fetchMeals, logSavedMeal, saveMeal } from '../../services/nutrition';
import { analyzeMealText, analyzeMealPhoto } from '../../services/aiMeal';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import ScreenContainer from '../../components/ScreenContainer';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutritionOptions';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import type { FoodLogSource, Meal, MealType } from '../../types/database';

type Props = NativeStackScreenProps<NutritionStackParamList, 'LogMeal'>;
type Mode = 'manual' | 'text' | 'photo' | 'saved';

const MODES: { value: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'manual', label: 'Manual', icon: 'create-outline' },
  { value: 'text', label: 'Describe', icon: 'chatbubble-ellipses-outline' },
  { value: 'photo', label: 'Photo', icon: 'camera-outline' },
  { value: 'saved', label: 'Saved', icon: 'bookmark-outline' },
];

export default function LogMealScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'manual');
  const [mealType, setMealType] = useState<MealType>('snack');

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [pendingSource, setPendingSource] = useState<FoodLogSource>('manual');
  const [saveAsMeal, setSaveAsMeal] = useState(false);

  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEstimate = name.trim().length > 0;

  useEffect(() => {
    if (mode !== 'saved' || !user) return;
    setLoadingMeals(true);
    fetchMeals(user.id)
      .then(setMeals)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load saved meals'))
      .finally(() => setLoadingMeals(false));
  }, [mode, user]);

  const resetFields = () => {
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPendingSource('manual');
    setPhotoUri(null);
    setDescription('');
  };

  const onSwitchMode = (m: Mode) => {
    setMode(m);
    resetFields();
    setError(null);
  };

  const onAnalyzeText = async () => {
    if (!description.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const estimate = await analyzeMealText(description.trim());
      setName(estimate.name);
      setCalories(String(estimate.calories));
      setProtein(String(estimate.protein_g));
      setCarbs(String(estimate.carbs_g));
      setFat(String(estimate.fat_g));
      setPendingSource('ai_text');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze that description.');
    } finally {
      setAnalyzing(false);
    }
  };

  const onPickPhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permission needed to access the camera/photo library.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setAnalyzing(true);
    setError(null);
    try {
      const estimate = await analyzeMealPhoto(asset.base64!, asset.mimeType ?? 'image/jpeg');
      setName(estimate.name);
      setCalories(String(estimate.calories));
      setProtein(String(estimate.protein_g));
      setCarbs(String(estimate.carbs_g));
      setFat(String(estimate.fat_g));
      setPendingSource('ai_photo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze that photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const onLog = async () => {
    if (!user || !name.trim() || !calories) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        servings: 1,
        calories: Number(calories),
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        meal_type: mealType,
        source: pendingSource,
      };
      await addFoodLog(user.id, input);
      if (saveAsMeal) {
        await saveMeal(user.id, {
          name: input.name,
          calories: input.calories,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fat_g: input.fat_g,
        });
      }
      navigation.navigate('NutritionHome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log food');
    } finally {
      setSaving(false);
    }
  };

  const onLogSavedMeal = async (meal: Meal) => {
    if (!user) return;
    try {
      await logSavedMeal(user.id, meal, mealType);
      navigation.navigate('NutritionHome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log meal');
    }
  };

  const onDeleteMealPreset = (meal: Meal) => {
    Alert.alert('Delete saved meal?', meal.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(meal.id);
          setMeals((prev) => prev.filter((m) => m.id !== meal.id));
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <Pressable
                key={m.value}
                style={[styles.modeButton, mode === m.value && styles.modeButtonActive]}
                onPress={() => onSwitchMode(m.value)}
              >
                <Ionicons name={m.icon} size={16} color={mode === m.value ? COLORS.accentText : COLORS.textSecondary} />
                <Text style={[styles.modeButtonText, mode === m.value && styles.modeButtonTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Meal</Text>
          <OptionPicker options={MEAL_TYPE_OPTIONS} selected={mealType} onSelect={setMealType} />

          {mode === 'text' ? (
            <>
              <TextField
                label="Describe what you ate"
                placeholder="e.g. 2 fried eggs, a slice of toast, and a black coffee"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Button
                label="Analyze"
                onPress={onAnalyzeText}
                disabled={!description.trim()}
                loading={analyzing}
                variant="secondary"
              />
            </>
          ) : null}

          {mode === 'photo' ? (
            <>
              <Text style={styles.label}>Photo of your meal</Text>
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
              <View style={styles.photoButtons}>
                <Button label="Take photo" onPress={() => onPickPhoto(true)} variant="secondary" style={styles.photoButton} />
                <Button label="Choose from library" onPress={() => onPickPhoto(false)} variant="secondary" style={styles.photoButton} />
              </View>
              {analyzing ? <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.md }} /> : null}
            </>
          ) : null}

          {mode === 'saved' ? (
            loadingMeals ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
            ) : meals.length === 0 ? (
              <Text style={styles.empty}>No saved meals yet — log something and save it for reuse.</Text>
            ) : (
              meals.map((meal) => (
                <View key={meal.id} style={styles.mealRow}>
                  <Pressable style={styles.mealInfo} onPress={() => onLogSavedMeal(meal)}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealMacros}>
                      {meal.calories} kcal · {meal.protein_g}p / {meal.carbs_g}c / {meal.fat_g}f
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => onDeleteMealPreset(meal)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </Pressable>
                </View>
              ))
            )
          ) : null}

          {mode !== 'saved' && (mode === 'manual' || hasEstimate) ? (
            <>
              <Text style={styles.label}>{mode === 'manual' ? 'Food details' : 'Estimated — edit if needed'}</Text>
              <TextField placeholder="Name" value={name} onChangeText={setName} />
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Kcal</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="number-pad"
                    value={calories}
                    onChangeText={setCalories}
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="decimal-pad"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="decimal-pad"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.macroInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="decimal-pad"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>

              <Pressable style={styles.checkboxRow} onPress={() => setSaveAsMeal((v) => !v)}>
                <View style={[styles.checkbox, saveAsMeal && styles.checkboxChecked]}>
                  {saveAsMeal ? <Ionicons name="checkmark" size={14} color={COLORS.accentText} /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Save as a reusable meal</Text>
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label="Log food"
                onPress={onLog}
                disabled={!name.trim() || !calories}
                loading={saving}
                style={styles.logButton}
              />
            </>
          ) : (
            error ? <Text style={styles.error}>{error}</Text> : null
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: SPACING.xxl, paddingBottom: 60 },
  modeRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.xl },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },
  modeButtonActive: { backgroundColor: COLORS.accent },
  modeButtonText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  modeButtonTextActive: { color: COLORS.accentText },
  label: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase' },
  macroRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.md },
  macroField: { flex: 1, minWidth: 0 },
  macroFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  macroInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  photoButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  photoButton: { flex: 1 },
  photoPreview: { width: '100%', height: 200, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  empty: { color: COLORS.textSecondary, marginTop: SPACING.xl, textAlign: 'center', ...TYPOGRAPHY.body },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  mealInfo: { flex: 1 },
  mealName: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary },
  mealMacros: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  deleteButton: { padding: SPACING.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkboxLabel: { ...TYPOGRAPHY.body, color: COLORS.textPrimary },
  logButton: { marginTop: SPACING.xl },
  error: { color: COLORS.danger, marginTop: SPACING.lg, textAlign: 'center', ...TYPOGRAPHY.caption },
});
