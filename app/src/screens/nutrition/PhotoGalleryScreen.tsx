import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NutritionStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { fetchPhotoLogs } from '../../services/nutrition';
import { supabase } from '../../services/supabase';
import { EmptyState, Skeleton } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';
import type { FoodLog } from '../../types/database';

type Props = NativeStackScreenProps<NutritionStackParamList, 'PhotoGallery'>;

interface GalleryEntry extends FoodLog {
  signedUrl: string | null;
}

export default function PhotoGalleryScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const logs = await fetchPhotoLogs(user.id);
      // meal-photos is a private bucket — one batched signed-URL call.
      const paths = logs.map((l) => l.photo_path!) ?? [];
      const { data: signed } = paths.length
        ? await supabase.storage.from('meal-photos').createSignedUrls(paths, 3600)
        : { data: [] };
      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      setEntries(logs.map((l) => ({ ...l, signedUrl: urlByPath.get(l.photo_path!) ?? null })));
    })()
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingWrap}>
        <View style={styles.loadingGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={150} radius={16} />
          ))}
        </View>
      </ScreenContainer>
    );
  }

  if (entries.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <EmptyState
          icon={Camera}
          title="No meal photos yet"
          message="Photos you log with AI analysis show up here — your visual food diary."
          ctaLabel="Log a meal photo"
          onCtaPress={() => navigation.navigate({ name: 'LogMeal', params: { mode: 'photo' }, merge: true })}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            {item.signedUrl ? (
              <Image source={{ uri: item.signedUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoMissing]} />
            )}
            <View style={styles.caption}>
              <Text style={styles.captionName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.captionMeta}>
                {item.calories} kcal · {item.logged_date}
              </Text>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center' },
    loadingWrap: { padding: t.spacing.xl },
    loadingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md, justifyContent: 'space-between' },
    list: { padding: t.spacing.lg },
    row: { gap: t.spacing.md },
    cell: {
      flex: 1,
      marginBottom: t.spacing.md,
      borderRadius: t.radii.lg,
      overflow: 'hidden',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    photo: { width: '100%', height: 140 },
    photoMissing: { backgroundColor: t.colors.skeleton },
    caption: { padding: t.spacing.sm },
    captionName: { ...t.typography.bodySmall, fontFamily: t.typography.bodyBold.fontFamily, color: t.colors.textPrimary },
    captionMeta: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: 2 },
  });
}
