import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { Theme, useTheme, useThemedStyles } from '../theme';
import type { MuscleGroup } from '../types/database';

// Regions we can actually draw on the figure.
type Region = 'chest' | 'back' | 'shoulders' | 'arms' | 'forearms' | 'core' | 'legs';

interface Props {
  /** muscle groups the workout covers; those regions light up */
  active: MuscleGroup[];
  size?: number;
  showLabels?: boolean;
}

// Maps our muscle-group enum onto drawable regions. full_body lights everything;
// cardio is represented by the legs (running/cycling drive the legs).
function activeRegions(groups: MuscleGroup[]): Set<Region> {
  const out = new Set<Region>();
  for (const g of groups) {
    switch (g) {
      case 'chest':
        out.add('chest');
        break;
      case 'back':
        out.add('back');
        break;
      case 'shoulders':
        out.add('shoulders');
        break;
      case 'arms':
        out.add('arms');
        break;
      case 'forearms':
        out.add('forearms');
        break;
      case 'core':
        out.add('core');
        break;
      case 'legs':
        out.add('legs');
        break;
      case 'cardio':
        out.add('legs');
        break;
      case 'full_body':
        (['chest', 'back', 'shoulders', 'arms', 'forearms', 'core', 'legs'] as Region[]).forEach((r) => out.add(r));
        break;
    }
  }
  return out;
}

/** A muscle block: rounded rect fill = accent when its region is worked. */
function Block({
  region,
  x,
  y,
  w,
  h,
  active,
  base,
  accent,
}: {
  region: Region;
  x: number;
  y: number;
  w: number;
  h: number;
  active: Set<Region>;
  base: string;
  accent: string;
}) {
  return <Rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2.4} fill={active.has(region) ? accent : base} />;
}

/**
 * Stylized front + back body maps. Muscle groups covered by the current workout
 * are highlighted in the accent colour; everything else stays muted. Built from
 * simple rounded shapes (no external assets), so it scales crisply.
 */
export default function BodyDiagram({ active, size = 130, showLabels = true }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const regions = useMemo(() => activeRegions(active), [active]);

  const silhouette = t.colors.surfaceElevated;
  const muscle = t.colors.border; // muted zone colour
  const accent = t.colors.accent;
  const h = size * 1.9;

  // Shared silhouette (head + limbs) drawn behind the muscle blocks.
  const Silhouette = () => (
    <G>
      <Circle cx={60} cy={26} r={15} fill={silhouette} />
      <Rect x={40} y={44} width={40} height={70} rx={16} fill={silhouette} />
      <Rect x={21} y={50} width={14} height={74} rx={7} fill={silhouette} />
      <Rect x={85} y={50} width={14} height={74} rx={7} fill={silhouette} />
      <Rect x={44} y={112} width={15} height={126} rx={7} fill={silhouette} />
      <Rect x={61} y={112} width={15} height={126} rx={7} fill={silhouette} />
    </G>
  );

  const blockProps = { active: regions, base: muscle, accent };

  return (
    <View style={styles.row}>
      <View style={styles.figure}>
        <Svg width={size} height={h} viewBox="0 0 120 250">
          <Silhouette />
          {/* shoulders (front delts) */}
          <Block region="shoulders" x={34} y={46} w={17} h={15} {...blockProps} />
          <Block region="shoulders" x={69} y={46} w={17} h={15} {...blockProps} />
          {/* chest */}
          <Block region="chest" x={43} y={52} w={16} h={20} {...blockProps} />
          <Block region="chest" x={61} y={52} w={16} h={20} {...blockProps} />
          {/* core */}
          <Block region="core" x={47} y={75} w={26} h={33} {...blockProps} />
          {/* arms (biceps) */}
          <Block region="arms" x={22} y={58} w={12} h={34} {...blockProps} />
          <Block region="arms" x={86} y={58} w={12} h={34} {...blockProps} />
          {/* forearms */}
          <Block region="forearms" x={22} y={94} w={12} h={28} {...blockProps} />
          <Block region="forearms" x={86} y={94} w={12} h={28} {...blockProps} />
          {/* legs (quads + shins) */}
          <Block region="legs" x={45} y={116} w={13} h={118} {...blockProps} />
          <Block region="legs" x={62} y={116} w={13} h={118} {...blockProps} />
        </Svg>
        {showLabels ? <Text style={styles.caption}>Front</Text> : null}
      </View>

      <View style={styles.figure}>
        <Svg width={size} height={h} viewBox="0 0 120 250">
          <Silhouette />
          {/* rear delts */}
          <Block region="shoulders" x={34} y={46} w={17} h={15} {...blockProps} />
          <Block region="shoulders" x={69} y={46} w={17} h={15} {...blockProps} />
          {/* back (lats / upper back) */}
          <Block region="back" x={43} y={52} w={34} h={38} {...blockProps} />
          {/* lower back (core) */}
          <Block region="core" x={48} y={92} w={24} h={16} {...blockProps} />
          {/* arms (triceps) */}
          <Block region="arms" x={22} y={58} w={12} h={34} {...blockProps} />
          <Block region="arms" x={86} y={58} w={12} h={34} {...blockProps} />
          {/* forearms */}
          <Block region="forearms" x={22} y={94} w={12} h={28} {...blockProps} />
          <Block region="forearms" x={86} y={94} w={12} h={28} {...blockProps} />
          {/* legs (glutes / hamstrings / calves) */}
          <Block region="legs" x={45} y={116} w={13} h={118} {...blockProps} />
          <Block region="legs" x={62} y={116} w={13} h={118} {...blockProps} />
        </Svg>
        {showLabels ? <Text style={styles.caption}>Back</Text> : null}
      </View>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'center', gap: t.spacing.lg },
    figure: { alignItems: 'center' },
    caption: { ...t.typography.caption, color: t.colors.textTertiary, marginTop: t.spacing.xs },
  });
}
