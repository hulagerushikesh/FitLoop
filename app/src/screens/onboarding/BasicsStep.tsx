import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingDraft } from './OnboardingContext';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import StepProgress from '../../components/StepProgress';
import ScreenContainer from '../../components/ScreenContainer';
import { SEX_OPTIONS } from '../../constants/profileOptions';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Basics'>;

export default function BasicsStep({ navigation }: Props) {
  const { draft, update } = useOnboardingDraft();
  const [age, setAge] = useState(draft.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(draft.height_cm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(draft.weight_kg?.toString() ?? '');

  const ageNum = Number(age);
  const heightNum = Number(heightCm);
  const weightNum = Number(weightKg);
  const valid =
    !!draft.sex &&
    age !== '' &&
    ageNum >= 10 &&
    ageNum <= 120 &&
    heightCm !== '' &&
    heightNum >= 50 &&
    heightNum <= 272 &&
    weightKg !== '' &&
    weightNum > 0;

  const onNext = () => {
    update({ age: ageNum, height_cm: heightNum, weight_kg: weightNum });
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

          <Text style={styles.label}>Sex</Text>
          <OptionPicker
            options={SEX_OPTIONS}
            selected={draft.sex}
            onSelect={(value) => update({ sex: value })}
          />

          <TextField label="Age" keyboardType="number-pad" value={age} onChangeText={setAge} placeholder="e.g. 28" />
          <TextField
            label="Height (cm)"
            keyboardType="decimal-pad"
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="e.g. 175"
          />
          <TextField
            label="Current weight (kg)"
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="e.g. 72.5"
          />

          <Button label="Next" onPress={onNext} disabled={!valid} style={styles.button} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: SPACING.xxl, paddingTop: SPACING.xxxl + SPACING.md },
  title: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.xl },
  label: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase' },
  button: { marginTop: SPACING.xl },
});
