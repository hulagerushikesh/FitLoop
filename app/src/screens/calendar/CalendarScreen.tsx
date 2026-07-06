import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { fetchMonthSummary, fetchSummaryRange } from '../../services/calendar';
import ScreenContainer from '../../components/ScreenContainer';
import ContributionHeatmap from '../../components/ContributionHeatmap';
import DayDetailSheet from '../../components/DayDetailSheet';
import { Card } from '../../components/ui';
import { dateRange, heatIntensity } from '../../engine/heatmap';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { DailySummary } from '../../types/database';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const HEATMAP_DAYS = 91; // ~13 weeks

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// UTC, to match how dates are written everywhere else in the app: Postgres's
// `current_date` defaults (session_date, logged_date, recorded_at) and the
// app's own `today()` helpers both use UTC via toISOString(). Using local time
// here would make "today" disagree with the data for any user not in UTC.
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function CalendarScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const today = todayString();
  const [todayYear, todayMonth] = today.split('-').map(Number);

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth);
  const [summaries, setSummaries] = useState<Record<string, DailySummary>>({});
  const [heatmap, setHeatmap] = useState<Record<string, DailySummary>>({});
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingMonth(true);
    fetchMonthSummary(user.id, year, month)
      .then((rows) => setSummaries(Object.fromEntries(rows.map((r) => [r.day, r]))))
      .catch(() => setSummaries({}))
      .finally(() => setLoadingMonth(false));
  }, [user, year, month]);

  // Rolling window for the heatmap, independent of the month being browsed.
  useEffect(() => {
    if (!user) return;
    fetchSummaryRange(user.id, daysAgo(HEATMAP_DAYS - 1), today)
      .then((rows) => setHeatmap(Object.fromEntries(rows.map((r) => [r.day, r]))))
      .catch(() => setHeatmap({}));
  }, [user]);

  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);

  const heatmapDates = useMemo(() => dateRange(daysAgo(HEATMAP_DAYS - 1), today), [today]);
  const intensityByDate = useMemo(() => {
    const out: Record<string, number> = {};
    for (const date of heatmapDates) {
      const s = heatmap[date];
      out[date] = heatIntensity({
        caloriesConsumed: s?.calories_consumed ?? 0,
        caloriesBurned: s?.calories_burned ?? 0,
        workoutCount: s?.workout_count ?? 0,
      });
    }
    return out;
  }, [heatmapDates, heatmap]);

  const activeDays = useMemo(
    () => Object.values(intensityByDate).filter((v) => v > 0).length,
    [intensityByDate]
  );

  const goPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const selectedSummary = selectedDate
    ? summaries[selectedDate] ?? heatmap[selectedDate]
    : undefined;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ---- Consistency heatmap ---- */}
        <Card style={styles.heatmapCard}>
          <View style={styles.heatmapHeader}>
            <Text style={styles.heatmapTitle}>Consistency</Text>
            <Text style={styles.heatmapMeta}>
              {activeDays} active {activeDays === 1 ? 'day' : 'days'} · 13 weeks
            </Text>
          </View>
          <ContributionHeatmap
            dates={heatmapDates}
            intensityByDate={intensityByDate}
            today={today}
            selectedDate={selectedDate ?? undefined}
            onDayPress={setSelectedDate}
          />
        </Card>

        {/* ---- Month grid ---- */}
        <View style={styles.header}>
          <Pressable onPress={goPrevMonth} style={styles.navButton} accessibilityLabel="Previous month">
            <ChevronLeft size={22} color={t.colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          <Pressable onPress={goNextMonth} style={styles.navButton} accessibilityLabel="Next month">
            <ChevronRight size={22} color={t.colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.weekdayText}>
              {d}
            </Text>
          ))}
        </View>

        {loadingMonth ? (
          <ActivityIndicator color={t.colors.accentEmphasis} style={{ marginVertical: t.spacing.xl }} />
        ) : (
          weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((date, di) => {
                if (!date) return <View key={di} style={styles.dayCell} />;
                const summary = summaries[date];
                const isToday = date === today;
                const dayNum = Number(date.slice(-2));
                return (
                  <Pressable
                    key={di}
                    style={[styles.dayCell, styles.dayCellFilled]}
                    onPress={() => setSelectedDate(date)}
                    accessibilityLabel={`Open details for ${date}`}
                  >
                    <Text style={[styles.dayNumText, isToday && styles.dayNumTextToday]}>{dayNum}</Text>
                    {summary && summary.workout_count > 0 ? <View style={styles.dot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        <Text style={styles.hint}>Tap any day for its calories, protein, and workouts.</Text>
      </ScrollView>

      <DayDetailSheet
        visible={selectedDate !== null}
        date={selectedDate}
        summary={selectedSummary}
        onClose={() => setSelectedDate(null)}
      />
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.lg, paddingBottom: 60 },
    heatmapCard: { marginBottom: t.spacing.xl },
    heatmapHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: t.spacing.md,
    },
    heatmapTitle: { ...t.typography.h3, color: t.colors.textPrimary },
    heatmapMeta: { ...t.typography.caption, color: t.colors.textSecondary },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.md },
    navButton: { padding: t.spacing.sm },
    monthLabel: { ...t.typography.h2, color: t.colors.textPrimary },
    weekdayRow: { flexDirection: 'row', marginBottom: t.spacing.xs },
    weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, color: t.colors.textTertiary, fontFamily: FONTS.bold },
    weekRow: { flexDirection: 'row' },
    dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayCellFilled: { borderRadius: t.radii.md },
    dayNumText: { fontSize: 14, color: t.colors.textPrimary },
    dayNumTextToday: { color: t.colors.accentEmphasis, fontFamily: FONTS.extrabold },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.colors.accent, marginTop: 2 },
    hint: { ...t.typography.caption, color: t.colors.textTertiary, textAlign: 'center', marginTop: t.spacing.xl },
  });
}
