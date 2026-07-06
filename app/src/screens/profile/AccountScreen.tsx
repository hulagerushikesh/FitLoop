import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { KeyRound, Trash2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { confirm } from '../../utils/confirm';
import MenuRow, { MenuDivider } from '../../components/MenuRow';
import { Card, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Account'>;

export default function AccountScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = async () => {
    if (deleting) return;
    const ok = await confirm({
      title: 'Delete your account?',
      message:
        'This permanently deletes your account and all your data — workouts, food logs, progress. This cannot be undone.',
      confirmLabel: 'Delete forever',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Card style={styles.menuCard}>
          <MenuRow
            icon={KeyRound}
            label="Change password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuDivider />
          <MenuRow
            icon={Trash2}
            label={deleting ? 'Deleting…' : 'Delete account'}
            detail="Permanently removes all your data"
            onPress={onDeleteAccount}
            destructive
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: { padding: t.spacing.xl },
    label: { ...t.typography.label, color: t.colors.textSecondary },
    email: { ...t.typography.bodyBold, color: t.colors.textPrimary, marginTop: t.spacing.xs, marginBottom: t.spacing.xl },
    menuCard: { padding: 0, overflow: 'hidden' },
  });
}
