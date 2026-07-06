import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingDraft } from './OnboardingContext';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { Button, Chip } from '../../components/ui';
import StepProgress from '../../components/StepProgress';
import ScreenContainer from '../../components/ScreenContainer';
import { SEX_OPTIONS } from '../../constants/profileOptions';
import { Theme, useThemedStyles } from '../../theme';
import {
  displayHeight,
  displayWeight,
  heightUnitLabel,
  parseHeight,
  parseWeight,
  weightUnitLabel,
} from '../../utils/units';
import type { UnitSystem } from '../../types/database';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Basics'>;

export default function BasicsStep({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { draft, update } = useOnboardingDraft();
  const unit = draft.unit_system;
  const [age, setAge] = useState(draft.age?.toString() ?? '');
  const [height, setHeight] = useState(
    draft.height_cm != null ? String(displayHeight(draft.height_cm, unit)) : ''
  );
  const [weight, setWeight] = useState(
    draft.weight_kg != null ? String(displayWeight(draft.weight_kg, unit)) : ''
  );

  const ageNum = Number(age);
  // Parse to canonical metric first, then validate against metric bounds so
  // the same limits apply regardless of display unit.
  const heightCm = height === '' ? NaN : parseHeight(Number(height), unit);
  const weightKg = weight === '' ? NaN : parseWeight(Number(weight), unit);
  const valid =
    !!draft.sex &&
    age !== '' &&
    ageNum >= 10 &&
    ageNum <= 120 &&
    Number.isFinite(heightCm) &&
    heightCm >= 50 &&
    heightCm <= 272 &&
    Number.isFinite(weightKg) &&
    weightKg > 0;

  const onSwitchUnit = (next: UnitSystem) => {
    if (next === unit) return;
    // Convert any values already typed so the numbers stay equivalent.
    if (height !== '' && Number.isFinite(Number(height))) {
      const cm = parseHeight(Number(height), unit);
      setHeight(String(displayHeight(cm, next)));
    }
    if (weight !== '' && Number.isFinite(Number(weight))) {
      const kg = parseWeight(Number(weight), unit);
      setWeight(String(displayWeight(kg, next)));
    }
    update({ unit_system: next });
  };

  const onNext = () => {
    update({ age: ageNum, height_cm: heightCm, weight_kg: weightKg });
    navigation.navigate('Activity');
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <StepProgress step={1} total={3} />
          <Text style={styles.title}>Tell us about yourself</Text>

          <Text style={styles.label}>Units</Text>
          <View style={styles.unitRow}>
            <Chip
              label="Metric (kg, cm)"
              selected={unit === 'metric'}
              onPress={() => onSwitchUnit('metric')}
              style={styles.unitChip}
            />
            <Chip
              label="Imperial (lb, in)"
              selected={unit === 'imperial'}
              onPress={() => onSwitchUnit('imperial')}
              style={styles.unitChip}
            />
          </View>

          <Text style={styles.label}>Sex</Text>
          <OptionPicker
            options={SEX_OPTIONS}
            selected={draft.sex}
            onSelect={(value) => update({ sex: value })}
          />

          <TextField label="Age" keyboardType="number-pad" value={age} onChangeText={setAge} placeholder="e.g. 28" />
          <TextField
            label={`Height (${heightUnitLabel(unit)})`}
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
            placeholder={unit === 'imperial' ? 'e.g. 69' : 'e.g. 175'}
          />
          <TextField
            label={`Current weight (${weightUnitLabel(unit)})`}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            placeholder={unit === 'imperial' ? 'e.g. 160' : 'e.g. 72.5'}
          />

          <Button label="Next" onPress={onNext} disabled={!valid} style={styles.button} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: t.spacing.xl, paddingTop: t.spacing.xxxl },
    title: { ...t.typography.h1, color: t.colors.textPrimary, marginBottom: t.spacing.xl },
    label: {
      ...t.typography.label,
      color: t.colors.textSecondary,
      marginBottom: t.spacing.sm,
      marginTop: t.spacing.md,
    },
    unitRow: { flexDirection: 'row', gap: t.spacing.sm },
    unitChip: { flex: 1, justifyContent: 'center' },
    button: { marginTop: t.spacing.xl },
  });
}
