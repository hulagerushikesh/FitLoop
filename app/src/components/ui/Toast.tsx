import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { Theme, useTheme, useThemedStyles } from '../../theme';
import { successHaptic, warningHaptic } from '../../utils/haptics';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const AUTO_DISMISS_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (kind === 'success') successHaptic();
    if (kind === 'error') warningHaptic();
    counter.current += 1;
    setToast({ id: counter.current, kind, message });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(onDone);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [slide, onDone]);

  const kindColor =
    toast.kind === 'success'
      ? theme.colors.success
      : toast.kind === 'error'
        ? theme.colors.danger
        : theme.colors.accentEmphasis;
  const Icon =
    toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertTriangle : Info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: slide,
          transform: [
            { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.toast}>
        <Icon size={18} color={kindColor} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: t.spacing.lg,
      right: t.spacing.lg,
      bottom: 96, // clears the tab bar
      alignItems: 'center',
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radii.full,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      maxWidth: 420,
      ...t.shadows.overlay,
    },
    message: { ...t.typography.bodySmall, color: t.colors.textPrimary, flexShrink: 1 },
  });
}
