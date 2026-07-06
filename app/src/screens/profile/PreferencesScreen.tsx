import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useUnits } from '../../hooks/useUnits';
import { updateProfile } from '../../services/profile';
import { Card, Chip, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useTheme, useThemeMode, useThemedStyles } from '../../theme';
import type { UnitSystem } from '../../types/database';

// AsyncStorage-backed toggles. Phase 7 wires these to real local
// notifications; until then they just persist the user's intent.
export const NOTIFICATION_PREF_KEYS = {
  mealReminder: 'fitloop.notif.mealReminder',
  workoutReminder: 'fitloop.notif.workoutReminder',
  weeklyRecap: 'fitloop.notif.weeklyRecap',
  streakWarning: 'fitloop.notif.streakWarning',
} as const;

const NOTIFICATION_ROWS: { key: keyof typeof NOTIFICATION_PREF_KEYS; label: string; detail: string }[] = [
  { key: 'mealReminder', label: 'Meal reminders', detail: "Evening nudge if you haven't logged food" },
  { key: 'workoutReminder', label: 'Workout reminders', detail: 'On your scheduled training days' },
  { key: 'weeklyRecap', label: 'Weekly recap', detail: 'When your targets are recalibrated' },
  { key: 'streakWarning', label: 'Streak warnings', detail: 'Before your logging streak breaks' },
];

export default function PreferencesScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { refresh } = useProfile();
  const units = useUnits();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { showToast } = useToast();
  const [savingUnits, setSavingUnits] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        NOTIFICATION_ROWS.map(async ({ key }) => {
          const stored = await AsyncStorage.getItem(NOTIFICATION_PREF_KEYS[key]);
          return [key, stored === 'true'] as const;
        })
      );
      setNotifPrefs(Object.fromEntries(entries));
    })();
  }, []);

  const onToggleNotif = (key: keyof typeof NOTIFICATION_PREF_KEYS, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    AsyncStorage.setItem(NOTIFICATION_PREF_KEYS[key], String(value)).catch(() => {});
  };

  const onSwitchUnits = async (next: UnitSystem) => {
    if (!user || next === units.unitSystem || savingUnits) return;
    setSavingUnits(true);
    try {
      await updateProfile(user.id, { unit_system: next });
      await refresh();
      showToast(next === 'imperial' ? 'Switched to lb / in' : 'Switched to kg / cm');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update units', 'error');
    } finally {
      setSavingUnits(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.chipRow}>
          <Chip
            label="Metric (kg, cm)"
            selected={units.unitSystem === 'metric'}
            onPress={() => onSwitchUnits('metric')}
            style={styles.chip}
          />
          <Chip
            label="Imperial (lb, in)"
            selected={units.unitSystem === 'imperial'}
            onPress={() => onSwitchUnits('imperial')}
            style={styles.chip}
          />
        </View>

        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.chipRow}>
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Chip
              key={m}
              label={m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}
              selected={themeMode === m}
              onPress={() => setThemeMode(m)}
              style={styles.chip}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.notifCard}>
          {NOTIFICATION_ROWS.map(({ key, label, detail }, i) => (
            <View key={key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.notifRow}>
                <View style={styles.notifText}>
                  <Text style={styles.notifLabel}>{label}</Text>
                  <Text style={styles.notifDetail}>{detail}</Text>
                </View>
                <Switch
                  value={notifPrefs[key] ?? false}
                  onValueChange={(v) => onToggleNotif(key, v)}
                  trackColor={{ true: t.colors.accent, false: t.colors.surfaceElevated }}
                  thumbColor={t.colors.textPrimary}
                />
              </View>
            </View>
          ))}
        </Card>
        <Text style={styles.notifFootnote}>
          Reminders will start firing once notifications land in an upcoming update — your
          choices here are saved.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl },
    sectionTitle: {
      ...t.typography.label,
      color: t.colors.textSecondary,
      marginBottom: t.spacing.sm,
      marginTop: t.spacing.lg,
    },
    chipRow: { flexDirection: 'row', gap: t.spacing.sm },
    chip: { flex: 1, justifyContent: 'center' },
    notifCard: { padding: 0, overflow: 'hidden' },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      gap: t.spacing.md,
    },
    notifText: { flex: 1 },
    notifLabel: { ...t.typography.bodyBold, color: t.colors.textPrimary },
    notifDetail: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: t.colors.border, marginLeft: t.spacing.lg },
    notifFootnote: { ...t.typography.caption, color: t.colors.textTertiary, marginTop: t.spacing.md },
  });
}
