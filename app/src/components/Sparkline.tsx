import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Theme, useTheme, useThemedStyles } from '../theme';

interface Props {
  /** y-values in chronological order */
  values: number[];
  height?: number;
  width?: number;
  color?: string;
  /** formats the min/max axis labels */
  formatValue?: (v: number) => string;
}

/**
 * Dependency-free mini line chart (SVG polyline) for progression trends —
 * per-exercise history, weight trend, etc. Not an axis-perfect chart; it
 * shows shape, min, max, and the latest point.
 */
export default function Sparkline({
  values,
  height = 72,
  width = 300,
  color,
  formatValue = (v) => String(Math.round(v)),
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const stroke = color ?? theme.colors.accentEmphasis;

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 6;
  const usableH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = padY + (1 - (v - min) / range) * usableH;
    return { x, y };
  });
  const last = points[points.length - 1];

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={last.x} cy={last.y} r={4} fill={stroke} />
      </Svg>
      <View style={styles.labels}>
        <Text style={styles.label}>low {formatValue(min)}</Text>
        <Text style={styles.label}>high {formatValue(max)}</Text>
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: t.spacing.xs },
    label: { ...t.typography.caption, color: t.colors.textTertiary },
  });
}
