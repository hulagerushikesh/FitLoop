import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingDraft } from './OnboardingContext';
import OptionPicker from '../../components/OptionPicker';
import Button from '../../components/Button';
import StepProgress from '../../components/StepProgress';
import ScreenContainer from '../../components/ScreenContainer';
import { ACTIVITY_OPTIONS } from '../../constants/profileOptions';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Activity'>;

export default function ActivityStep({ navigation }: Props) {
  const { draft, update } = useOnboardingDraft();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StepProgress step={2} total={3} />
        <Text style={styles.title}>How active are you?</Text>
        <OptionPicker
          options={ACTIVITY_OPTIONS}
          selected={draft.activity_level}
          onSelect={(value) => update({ activity_level: value })}
        />
        <Button
          label="Next"
          onPress={() => navigation.navigate('Goal')}
          disabled={!draft.activity_level}
          style={styles.button}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xxl, paddingTop: SPACING.xxxl + SPACING.md },
  title: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.xl },
  button: { marginTop: SPACING.lg },
});
