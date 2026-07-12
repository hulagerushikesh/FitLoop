import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { parseVoiceLog, type VoiceScope } from '../../services/voiceLog';
import type { VoiceBatch } from '../../engine/voiceLogParsing';
import { tapHaptic, successHaptic, warningHaptic } from '../../utils/haptics';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';

// Tap to start, tap again to stop — one interaction pattern reused everywhere.
// Recording auto-stops at MAX_MS to bound cost/latency of the Gemini audio call;
// generous enough to list several foods/exercises in one go.
const MAX_MS = 60_000;

type Variant = 'fab' | 'icon';

interface Props {
  scope: VoiceScope;
  exerciseLibrary?: { id: string; name: string }[];
  onResult: (batch: VoiceBatch) => void;
  onError?: (message: string) => void;
  variant?: Variant;
  disabled?: boolean;
  /** Optional caption under the FAB (e.g. "Speak a log"). */
  label?: string;
}

function mimeForUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.caf')) return 'audio/x-caf';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.3gp') || lower.endsWith('.3gpp')) return 'audio/3gpp';
  return 'audio/mp4';
}

/** Reads a recorded clip at `uri` into base64, cross-platform. */
async function readAudioBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Native File API isn't available on web; recorder.uri is a blob URL.
    const blob = await (await fetch(uri)).blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read the recording.'));
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(',')[1] ?? '';
  }
  // expo-file-system's modern File API reads the on-disk recording directly.
  const { File } = await import('expo-file-system');
  return new File(uri).base64();
}

export default function VoiceLogButton({
  scope,
  exerciseLibrary = [],
  onResult,
  onError,
  variant = 'icon',
  disabled,
  label,
}: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [processing, setProcessing] = useState(false);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRecording = recorderState.isRecording;
  const busy = processing || disabled;

  // Pulsing halo while recording.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isRecording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  const fail = (message: string) => {
    warningHaptic();
    onError?.(message);
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        fail('Microphone permission is needed to log by voice.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      tapHaptic();
      autoStopRef.current = setTimeout(() => {
        stopAndParse().catch(() => {});
      }, MAX_MS);
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Could not start recording.');
    }
  };

  const stopAndParse = async () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    setProcessing(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording was captured.');
      const base64 = await readAudioBase64(uri);
      if (!base64) throw new Error('The recording was empty — try again.');
      const result = await parseVoiceLog(base64, mimeForUri(uri), scope, exerciseLibrary);
      successHaptic();
      onResult(result);
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Could not process that recording.');
    } finally {
      setProcessing(false);
    }
  };

  const onPress = () => {
    if (busy) return;
    if (isRecording) {
      stopAndParse().catch(() => {});
    } else {
      startRecording().catch(() => {});
    }
  };

  const elapsedSec = Math.floor((recorderState.durationMillis ?? 0) / 1000);
  const remainingSec = Math.max(0, Math.ceil(MAX_MS / 1000) - elapsedSec);
  const isFab = variant === 'fab';
  const iconSize = isFab ? 26 : 18;
  const iconColor = isRecording ? t.colors.onAccent : isFab ? t.colors.onAccent : t.colors.textSecondary;

  const pulseStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  };

  const button = (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={isRecording ? 'Stop recording' : 'Log by voice'}
      style={[
        isFab ? styles.fab : styles.icon,
        isRecording && (isFab ? styles.fabRecording : styles.iconRecording),
        busy && !processing && styles.disabled,
      ]}
    >
      {isRecording ? (
        <Animated.View style={[isFab ? styles.fabPulse : styles.iconPulse, pulseStyle]} pointerEvents="none" />
      ) : null}
      {processing ? (
        <ActivityIndicator color={isFab ? t.colors.onAccent : t.colors.textSecondary} size="small" />
      ) : isRecording ? (
        <Square size={iconSize - 2} color={iconColor} fill={iconColor} />
      ) : (
        <Mic size={iconSize} color={iconColor} />
      )}
    </Pressable>
  );

  if (!isFab) {
    // Inline icon: float a small "Ns" countdown above it while recording so the
    // user can see it's still listening (and how long is left).
    return (
      <View style={styles.iconWrap}>
        {isRecording ? (
          <View style={styles.timerBadge}>
            <Text style={styles.timerBadgeText}>{remainingSec}s</Text>
          </View>
        ) : null}
        {button}
      </View>
    );
  }

  return (
    <View style={styles.fabWrap}>
      {button}
      {label ? (
        <Text style={styles.fabLabel}>
          {processing ? 'Thinking…' : isRecording ? `Listening · ${remainingSec}s` : label}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    // Inline icon (nutrition describe input, workout session)
    iconWrap: { alignItems: 'center' },
    timerBadge: {
      position: 'absolute',
      top: -18,
      backgroundColor: t.colors.danger,
      borderRadius: t.radii.full,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 1,
      zIndex: 1,
    },
    timerBadgeText: { ...t.typography.caption, fontSize: 10, fontFamily: FONTS.bold, color: t.colors.onAccent },
    icon: {
      width: 44,
      height: 44,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    iconRecording: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
    iconPulse: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: t.radii.md,
      backgroundColor: t.colors.danger,
    },
    // Circular FAB (home)
    fabWrap: { alignItems: 'center', gap: t.spacing.xs },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.raised,
    },
    fabRecording: { backgroundColor: t.colors.danger },
    fabPulse: {
      position: 'absolute',
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.danger,
    },
    fabLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    disabled: { opacity: 0.4 },
  });
}
