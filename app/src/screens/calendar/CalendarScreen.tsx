import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useAuth } from '../../hooks/useAuth';
import { fetchMonthSummary, fetchSessionsForDate } from '../../services/calendar';
import ScreenContainer from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { DailySummary, WorkoutSession } from '../../types/database';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// UTC, to match how dates are written everywhere else in the app: Postgres's
// `current_date` defaults (session_date, logged_date, recorded_at) and the
// app's own `today()` helpers (services/profile.ts, services/nutrition.ts)
// both use UTC via toISOString(). Using local time here would make "today"
// disagree with the data for any user not in UTC.
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
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

function formatDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
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
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);
  const [daySessions, setDaySessions] = useState<WorkoutSession[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingMonth(true);
    fetchMonthSummary(user.id, year, month)
      .then((rows) => setSummaries(Object.fromEntries(rows.map((r) => [r.day, r]))))
      .finally(() => setLoadingMonth(false));
  }, [user, year, month]);

  useEffect(() => {
    if (!user) return;
    setLoadingDetail(true);
    fetchSessionsForDate(user.id, selectedDate)
      .then(setDaySessions)
      .finally(() => setLoadingDetail(false));
  }, [user, selectedDate]);

  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);

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

  const selectedSummary = summaries[selectedDate];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goPrevMonth} style={styles.navButton}>
            <ChevronLeft size={22} color={t.colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          <Pressable onPress={goNextMonth} style={styles.navButton}>
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
          <ActivityIndicator color={t.colors.accent} style={{ marginVertical: t.spacing.xl }} />
        ) : (
          weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((date, di) => {
                if (!date) return <View key={di} style={styles.dayCell} />;
                const summary = summaries[date];
                const isSelected = date === selectedDate;
                const isToday = date === today;
                const dayNum = Number(date.slice(-2));
                return (
                  <Pressable
                    key={di}
                    style={[styles.dayCell, styles.dayCellFilled, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.dayNumText,
                        isToday && styles.dayNumTextToday,
                        isSelected && styles.dayNumTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {summary && summary.workout_count > 0 ? (
                      <View style={[styles.dot, isSelected && styles.dotSelected]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}

        <Card style={styles.detailCard}>
          <Text style={styles.detailTitle}>{formatDateLong(selectedDate)}</Text>
          {loadingDetail ? (
            <ActivityIndicator color={t.colors.accent} style={{ marginTop: t.spacing.md }} />
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{selectedSummary?.calories_consumed ?? 0}</Text>
                  <Text style={styles.statLabel}>kcal in</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: t.colors.energy }]}>{selectedSummary?.calories_burned ?? 0}</Text>
                  <Text style={styles.statLabel}>kcal burned</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: t.colors.protein }]}>{selectedSummary?.protein_g ?? 0}g</Text>
                  <Text style={styles.statLabel}>protein</Text>
                </View>
              </View>

              <Text style={styles.detailSubtitle}>Workouts</Text>
              {daySessions.length === 0 ? (
                <Text style={styles.detailEmpty}>No workout logged</Text>
              ) : (
                daySessions.map((s) => (
                  <Text key={s.id} style={styles.detailListItem}>
                    {s.name}
                  </Text>
                ))
              )}
            </>
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
  container: { padding: t.spacing.lg, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.md },
  navButton: { padding: t.spacing.sm },
  monthLabel: { ...t.typography.h2, color: t.colors.textPrimary },
  weekdayRow: { flexDirection: 'row', marginBottom: t.spacing.xs },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, color: t.colors.textTertiary, fontFamily: FONTS.bold },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellFilled: { borderRadius: t.radii.md },
  dayCellSelected: { backgroundColor: t.colors.accent },
  dayNumText: { fontSize: 14, color: t.colors.textPrimary },
  dayNumTextToday: { color: t.colors.accent, fontFamily: FONTS.extrabold },
  dayNumTextSelected: { color: t.colors.onAccent, fontFamily: FONTS.extrabold },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.colors.accent, marginTop: 2 },
  dotSelected: { backgroundColor: t.colors.onAccent },
  detailCard: { marginTop: t.spacing.xxl },
  detailTitle: { ...t.typography.h3, color: t.colors.textPrimary, marginBottom: t.spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: t.spacing.xl },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: FONTS.extrabold, color: t.colors.textPrimary },
  statLabel: { fontSize: 11, color: t.colors.textSecondary, marginTop: 2 },
  detailSubtitle: { ...t.typography.label, color: t.colors.textSecondary, textTransform: 'uppercase', marginTop: t.spacing.md, marginBottom: t.spacing.xs },
  detailListItem: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.xs },
  detailEmpty: { ...t.typography.caption, color: t.colors.textTertiary },
});
}
