import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../theme';
import { useUnits } from '../hooks/useUnits';
import {
  STANDARD_BAR_KG,
  STANDARD_BAR_LB,
  STANDARD_PLATES_KG,
  STANDARD_PLATES_LB,
  calculatePlates,
} from '../engine/plateCalculator';
import NumberInput from './ui/NumberInput';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** target total in the user's DISPLAY unit */
  initialWeight?: number;
}

/**
 * "What goes on the bar" helper: given a target total, shows the plates
 * for one side using standard denominations in the user's unit system.
 */
export default function PlateCalculatorSheet({ visible, onClose, initialWeight }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const units = useUnits();
  const imperial = units.unitSystem === 'imperial';
  const barDefault = imperial ? STANDARD_BAR_LB : STANDARD_BAR_KG;
  const plateSizes = imperial ? STANDARD_PLATES_LB : STANDARD_PLATES_KG;

  const [target, setTarget] = useState(initialWeight && initialWeight > 0 ? String(initialWeight) : '');
  const [bar, setBar] = useState(String(barDefault));

  const breakdown = useMemo(() => {
    const targetNum = Number(target);
    const barNum = Number(bar);
    if (!Number.isFinite(targetNum) || !Number.isFinite(barNum) || targetNum <= 0 || barNum <= 0) {
      return null;
    }
    return calculatePlates(targetNum, barNum, plateSizes);
  }, [target, bar, plateSizes]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Plate calculator</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close plate calculator">
              <X size={20} color={t.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.inputs}>
            <NumberInput
              label={`Target (${units.weightUnit})`}
              value={target}
              onChangeText={setTarget}
              step={imperial ? 5 : 2.5}
              style={styles.input}
            />
            <NumberInput
              label={`Bar (${units.weightUnit})`}
              value={bar}
              onChangeText={setBar}
              step={imperial ? 5 : 2.5}
              style={styles.input}
            />
          </View>

          {breakdown == null ? (
            <Text style={styles.hint}>
              {Number(target) > 0 && Number(target) < Number(bar)
                ? 'Target is lighter than the bar.'
                : 'Enter the total weight you want on the bar.'}
            </Text>
          ) : (
            <>
              <Text style={styles.perSideLabel}>Each side</Text>
              <View style={styles.plateRow}>
                {breakdown.perSide.length === 0 ? (
                  <Text style={styles.hint}>Empty bar — no plates needed.</Text>
                ) : (
                  breakdown.perSide.map((plate, i) => (
                    <View key={i} style={[styles.plate, { height: 34 + Math.min(plate, 25) * 1.1 }]}>
                      <Text style={styles.plateText}>{plate}</Text>
                    </View>
                  ))
                )}
              </View>
              {breakdown.remainderPerSide > 0 ? (
                <Text style={styles.remainder}>
                  Closest loadable: {breakdown.achievedTotal}
                  {units.weightUnit} ({breakdown.remainderPerSide}
                  {units.weightUnit}/side short)
                </Text>
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.spacing.xl,
    },
    sheet: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.xl,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: t.spacing.xl,
      ...t.shadows.overlay,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: t.spacing.lg,
    },
    title: { ...t.typography.h3, color: t.colors.textPrimary },
    inputs: { flexDirection: 'row', gap: t.spacing.md, marginBottom: t.spacing.lg },
    input: { flex: 1 },
    perSideLabel: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
    plateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      minHeight: 64,
    },
    plate: {
      width: 30,
      borderRadius: t.radii.sm,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plateText: { fontSize: 11, fontFamily: t.typography.bodyBold.fontFamily, color: t.colors.onAccent },
    hint: { ...t.typography.bodySmall, color: t.colors.textSecondary },
    remainder: { ...t.typography.caption, color: t.colors.warning, marginTop: t.spacing.sm },
  });
}
