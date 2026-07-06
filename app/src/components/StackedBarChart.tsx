import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Theme, useTheme, useThemedStyles } from '../theme';

export interface StackedBar {
  label: string;
  /** segment key → value; rendered bottom-up in `segmentOrder` */
  segments: Record<string, number>;
}

interface Props {
  bars: StackedBar[];
  segmentOrder: string[];
  colors: Record<string, string>;
  height?: number;
  /** formats the total shown in the legend tooltip line */
  formatTotal?: (v: number) => string;
}

/** Dependency-free stacked bar chart (weekly volume by muscle group). */
export default function StackedBarChart({
  bars,
  segmentOrder,
  colors,
  height = 160,
  formatTotal = (v) => `${Math.round(v / 1000)}k`,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  if (bars.length === 0) return null;

  const width = 320;
  const gap = 10;
  const barWidth = Math.min(44, (width - gap * (bars.length - 1)) / bars.length);
  const chartWidth = bars.length * barWidth + (bars.length - 1) * gap;
  const maxTotal = Math.max(...bars.map((b) => Object.values(b.segments).reduce((s, v) => s + v, 0)), 1);

  const usedKeys = segmentOrder.filter((k) => bars.some((b) => (b.segments[k] ?? 0) > 0));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {bars.map((bar, i) => {
          const x = i * (barWidth + gap);
          let y = height - 18;
          return usedKeys.map((key) => {
            const value = bar.segments[key] ?? 0;
            if (value <= 0) return null;
            const h = (value / maxTotal) * (height - 26);
            y -= h;
            return (
              <Rect
                key={`${bar.label}-${key}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h - 1, 1)}
                rx={3}
                fill={colors[key] ?? theme.colors.textTertiary}
              />
            );
          });
        })}
      </Svg>
      <View style={styles.labels}>
        {bars.map((bar) => (
          <Text key={bar.label} style={[styles.label, { width: barWidth + gap }]} numberOfLines={1}>
            {bar.label}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {usedKeys.map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors[key] ?? theme.colors.textTertiary }]} />
            <Text style={styles.legendText}>{key.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    labels: { flexDirection: 'row' },
    label: { ...t.typography.caption, fontSize: 10, color: t.colors.textTertiary },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md, marginTop: t.spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { ...t.typography.caption, color: t.colors.textSecondary, textTransform: 'capitalize' },
  });
}
