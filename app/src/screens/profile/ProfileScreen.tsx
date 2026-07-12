import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BarChart3,
  Calendar,
  Camera,
  Database,
  Images,
  Info,
  Settings2,
  UserCog,
  UserRound,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { fetchLatestGoal } from '../../services/goals';
import { avatarUrl, pickAndUploadAvatar } from '../../services/avatar';
import MenuRow, { MenuDivider } from '../../components/MenuRow';
import { Button, Card, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { FONTS, Theme, useTheme, useThemedStyles } from '../../theme';
import type { Goal } from '../../types/database';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, signOut } = useAuth();
  const { profile, refresh } = useProfile();
  const { showToast } = useToast();
  const [latestGoal, setLatestGoal] = useState<Goal | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchLatestGoal(user.id).then(setLatestGoal);
  }, [user]);

  const photoUrl = avatarUrl(profile?.avatar_path ?? null);

  const onChangePhoto = async () => {
    if (!user || uploading) return;
    setUploading(true);
    try {
      const result = await pickAndUploadAvatar(user.id);
      if (result) {
        await refresh();
        showToast('Profile photo updated');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.avatarWrap} onPress={onChangePhoto} accessibilityLabel="Change profile photo">
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserRound size={34} color={t.colors.textTertiary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={13} color={t.colors.onAccent} />
            </View>
          </Pressable>
          <Text style={styles.email}>{user?.email}</Text>
          {uploading ? <Text style={styles.uploading}>Uploading photo…</Text> : null}
        </View>

        {latestGoal ? (
          <Card style={styles.targetCard} highlighted>
            <Text style={styles.targetLabel}>Your target</Text>
            <Text style={styles.targetCalories}>{latestGoal.calorie_target} kcal/day</Text>
            <Text style={styles.targetMacros}>
              {latestGoal.protein_g}g protein · {latestGoal.carbs_g}g carbs · {latestGoal.fat_g}g fat
            </Text>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Activity</Text>
        <Card style={styles.menuCard}>
          <MenuRow icon={Calendar} label="Calendar" onPress={() => navigation.navigate('CalendarMain')} />
          <MenuDivider />
          <MenuRow icon={BarChart3} label="Analytics" onPress={() => navigation.navigate('AnalyticsMain')} />
          <MenuDivider />
          <MenuRow
            icon={Images}
            label="Progress photos"
            detail="Your daily photos by date"
            onPress={() => navigation.navigate('ProgressGallery')}
          />
        </Card>

        <Text style={styles.sectionTitle}>Settings</Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon={UserCog}
            label="Edit profile"
            detail="Body stats, activity level, goal"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuDivider />
          <MenuRow
            icon={Settings2}
            label="Preferences"
            detail="Units, theme, notifications"
            onPress={() => navigation.navigate('Preferences')}
          />
          <MenuDivider />
          <MenuRow
            icon={UserRound}
            label="Account"
            detail="Password, delete account"
            onPress={() => navigation.navigate('Account')}
          />
          <MenuDivider />
          <MenuRow icon={Database} label="Data" detail="Export your data" onPress={() => navigation.navigate('DataExport')} />
          <MenuDivider />
          <MenuRow icon={Info} label="About" onPress={() => navigation.navigate('About')} />
        </Card>

        <Button label="Log Out" onPress={signOut} variant="destructive" style={styles.logout} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl, paddingBottom: t.spacing.xxxl },
    header: { alignItems: 'center', marginBottom: t.spacing.xl },
    avatarWrap: { marginBottom: t.spacing.md },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: t.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.colors.background,
    },
    email: { ...t.typography.body, color: t.colors.textSecondary },
    uploading: { ...t.typography.caption, color: t.colors.accentEmphasis, marginTop: t.spacing.xs },
    targetCard: { marginBottom: t.spacing.xl },
    targetLabel: { ...t.typography.label, color: t.colors.textSecondary },
    targetCalories: {
      fontSize: 28,
      lineHeight: 34,
      fontFamily: FONTS.extrabold,
      color: t.colors.accentEmphasis,
      marginTop: t.spacing.xs,
    },
    targetMacros: { ...t.typography.body, color: t.colors.textPrimary, marginTop: t.spacing.xs },
    sectionTitle: { ...t.typography.label, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
    menuCard: { padding: 0, marginBottom: t.spacing.xl, overflow: 'hidden' },
    logout: { marginTop: t.spacing.sm },
  });
}
