import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { heatmapColumns } from '../engine/heatmap';
import { Theme, useTheme, useThemedStyles } from '../theme';

interface Props {
  /** ordered YYYY-MM-DD dates, oldest first */
  dates: string[];
  /** date → 0..4 intensity */
  intensityByDate: Record<string, number>;
  /** dates that have a progress photo (values ignored) → subtle corner dot */
  photoDates?: Record<string, unknown>;
  today: string;
  selectedDate?: string;
  onDayPress: (date: string) => void;
}

const CELL = 15;
const GAP = 3;
const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

/**
 * GitHub-contribution-style consistency heatmap: one small square per day,
 * columns are weeks (Sun→Sat top→bottom), colour intensity by training load.
 * Horizontally scrollable so a full quarter fits on a phone.
 */
export default function ContributionHeatmap({
  dates,
  intensityByDate,
  photoDates,
  today,
  selectedDate,
  onDayPress,
}: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const columns = useMemo(() => heatmapColumns(dates), [dates]);

  // Level 0 is a faint "empty" surface; 1–4 ramp the accent lime.
  const levelColors = [
    t.colors.surfaceElevated,
    'rgba(203, 255, 61, 0.28)',
    'rgba(203, 255, 61, 0.5)',
    'rgba(203, 255, 61, 0.75)',
    t.colors.accent,
  ];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* weekday gutter */}
        <View style={styles.gutter}>
          {WEEKDAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.weekdayLabel, { height: CELL, marginBottom: GAP }]}>
              {d}
            </Text>
          ))}
        </View>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.column}>
            {col.map((date, ri) => {
              if (!date) return <View key={ri} style={styles.cellSpacer} />;
              const level = intensityByDate[date] ?? 0;
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const hasPhoto = !!photoDates?.[date];
              return (
                <Pressable
                  key={ri}
                  onPress={() => onDayPress(date)}
                  style={[
                    styles.cell,
                    { backgroundColor: levelColors[level] },
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                >
                  {hasPhoto ? <View style={styles.photoDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {levelColors.map((c, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    scroll: { flexDirection: 'row', gap: GAP },
    gutter: { marginRight: GAP },
    weekdayLabel: {
      width: 12,
      fontSize: 9,
      lineHeight: CELL,
      color: t.colors.textTertiary,
      textAlign: 'center',
    },
    column: { gap: GAP },
    cell: { width: CELL, height: CELL, borderRadius: 3, alignItems: 'flex-end' },
    photoDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      margin: 1.5,
      backgroundColor: t.colors.energy,
    },
    cellSpacer: { width: CELL, height: CELL, marginBottom: 0 },
    cellToday: { borderWidth: 1.5, borderColor: t.colors.accentEmphasis },
    cellSelected: { borderWidth: 1.5, borderColor: t.colors.textPrimary },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: t.spacing.md,
      justifyContent: 'flex-end',
    },
    legendText: { ...t.typography.caption, color: t.colors.textTertiary, fontSize: 10 },
    legendCell: { width: 11, height: 11, borderRadius: 2 },
  });
}
