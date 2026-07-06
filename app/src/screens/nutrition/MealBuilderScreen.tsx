import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Search, UtensilsCrossed, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NutritionStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { searchFoods } from '../../services/foodSearch';
import { createCompositeMeal, type NewMealItemInput } from '../../services/nutrition';
import TextField from '../../components/TextField';
import { Button, Card, EmptyState, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import type { FoodItem } from '../../types/database';

type Props = NativeStackScreenProps<NutritionStackParamList, 'MealBuilder'>;

export default function MealBuilderScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<NewMealItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    // Debounce so we don't hammer the cache/API on every keystroke.
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchFoods(text));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const addItem = (item: FoodItem) => {
    setItems((prev) => [
      ...prev,
      {
        food_item_id: item.created_at ? item.id : null,
        name: item.brand ? `${item.name} (${item.brand})` : item.name,
        servings: 1,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const totals = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories * i.servings,
      protein_g: acc.protein_g + i.protein_g * i.servings,
    }),
    { calories: 0, protein_g: 0 }
  );

  const onSave = async () => {
    if (!user || !name.trim() || items.length === 0) return;
    setSaving(true);
    try {
      await createCompositeMeal(user.id, name.trim(), items);
      showToast(`"${name.trim()}" saved — log it from Saved meals`);
      navigation.goBack();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save meal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Combine foods into a reusable meal — "my usual breakfast" — and log it in one tap from
          Saved meals.
        </Text>

        <TextField label="Meal name" placeholder="e.g. Usual breakfast" value={name} onChangeText={setName} />

        <Text style={styles.label}>Add foods</Text>
        <View style={styles.searchWrap}>
          <Search size={18} color={t.colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search foods"
            placeholderTextColor={t.colors.textTertiary}
            value={query}
            onChangeText={onQueryChange}
          />
        </View>
        {searching ? <Text style={styles.searching}>Searching…</Text> : null}
        {results.map((item) => (
          <Pressable key={item.id} style={styles.resultRow} onPress={() => addItem(item)}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
                {item.brand ? ` · ${item.brand}` : ''}
              </Text>
              <Text style={styles.resultMacros}>
                {item.calories} kcal · {item.protein_g}p / {item.carbs_g}c / {item.fat_g}f per {item.serving_size}
                {item.serving_unit}
              </Text>
            </View>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        ))}

        {items.length === 0 && results.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No foods added yet"
            message="Search above to add the parts of this meal."
          />
        ) : null}

        {items.length > 0 ? (
          <Card style={styles.itemsCard}>
            {items.map((item, i) => (
              <View key={`${item.name}-${i}`} style={styles.itemRow}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultMacros}>
                    {Math.round(item.calories * item.servings)} kcal · {Math.round(item.protein_g * item.servings)}g protein
                  </Text>
                </View>
                <Pressable
                  onPress={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={8}
                  accessibilityLabel={`remove ${item.name}`}
                >
                  <X size={18} color={t.colors.danger} />
                </Pressable>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsText}>
                Total: {Math.round(totals.calories)} kcal · {Math.round(totals.protein_g)}g protein
              </Text>
            </View>
          </Card>
        ) : null}

        <Button
          label="Save meal"
          onPress={onSave}
          disabled={!name.trim() || items.length === 0}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl, paddingBottom: t.spacing.xxxl },
    hint: { ...t.typography.body, color: t.colors.textSecondary, marginBottom: t.spacing.lg },
    label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.lg,
    },
    searchIcon: { marginRight: t.spacing.sm },
    search: { flex: 1, paddingVertical: t.spacing.md, minHeight: 48, ...t.typography.body, color: t.colors.textPrimary },
    searching: { ...t.typography.caption, color: t.colors.textTertiary, marginTop: t.spacing.sm },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      gap: t.spacing.md,
    },
    resultInfo: { flex: 1, minWidth: 0 },
    resultName: { ...t.typography.bodyBold, color: t.colors.textPrimary },
    resultMacros: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    addText: { ...t.typography.bodyBold, color: t.colors.accentEmphasis },
    itemsCard: { marginTop: t.spacing.xl },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.sm,
      gap: t.spacing.md,
    },
    totalsRow: { borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.md, marginTop: t.spacing.sm },
    totalsText: { ...t.typography.bodyBold, color: t.colors.textPrimary },
    saveButton: { marginTop: t.spacing.xl },
  });
}
