import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Button from './ui/Button';
import { Theme, ThemeContext } from '../theme';

interface Props {
  children: React.ReactNode;
  /** shown in the fallback, e.g. "Nutrition" */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle crashes in its subtree so one broken screen shows a
 * recoverable fallback instead of taking down the whole app. Wraps each tab's
 * stack (see MainTabNavigator) — a crash in one tab leaves the others usable.
 *
 * Class component because React only exposes error boundaries via
 * componentDidCatch / getDerivedStateFromError.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  static contextType = ThemeContext;

  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaced to Metro/console; a real deployment would forward to Sentry etc.
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    // ThemeContext defaults to darkTheme, so this is populated even above the
    // provider; the `?` and fallback styles stay purely defensive.
    const theme = this.context as Theme | undefined;
    const styles = theme ? createStyles(theme) : fallbackStyles;

    return (
      <View style={styles.container}>
        <View style={styles.iconBadge}>
          <AlertTriangle size={28} color={theme?.colors.danger ?? '#FF453A'} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {this.props.label ? `The ${this.props.label} screen hit a snag.` : 'This screen hit a snag.'} You
          can retry without restarting the app.
        </Text>
        <Button label="Try again" onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.spacing.xxl,
      backgroundColor: t.colors.background,
    },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: t.radii.xl,
      backgroundColor: t.colors.dangerMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.lg,
    },
    title: { ...t.typography.h2, color: t.colors.textPrimary, marginBottom: t.spacing.sm },
    message: {
      ...t.typography.body,
      color: t.colors.textSecondary,
      textAlign: 'center',
      marginBottom: t.spacing.xl,
    },
    button: { minWidth: 160 },
  });
}

const fallbackStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0B0B0F' },
  iconBadge: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  message: { fontSize: 15, color: '#9B9BA5', textAlign: 'center', marginBottom: 24 },
  button: { minWidth: 160 },
});
