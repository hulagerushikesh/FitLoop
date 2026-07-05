import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingDraft } from './OnboardingContext';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { Button } from '../../components/ui';
import StepProgress from '../../components/StepProgress';
import ScreenContainer from '../../components/ScreenContainer';
import { SEX_OPTIONS } from '../../constants/profileOptions';
import { Theme, useTheme, useThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Basics'>;

export default function BasicsStep({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
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

function createStyles(t: Theme) {
  return StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: t.spacing.xxl, paddingTop: t.spacing.xxxl + t.spacing.md },
  title: { ...t.typography.h1, color: t.colors.textPrimary, marginBottom: t.spacing.xl },
  label: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm, marginTop: t.spacing.md, textTransform: 'uppercase' },
  button: { marginTop: t.spacing.xl },
});
}
