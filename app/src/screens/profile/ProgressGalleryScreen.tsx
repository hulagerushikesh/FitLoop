import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { fetchProgressGallery, type ProgressPhotoEntry } from '../../services/analytics';
import { EmptyState, Skeleton } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-07-11" → "Jul 11, 2026" */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function ProgressGalleryScreen() {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [entries, setEntries] = useState<ProgressPhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProgressGallery(user.id)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingWrap}>
        <View style={styles.loadingGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={200} radius={16} />
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
          title="No progress photos yet"
          message="Snap a daily photo from Home or the Calendar — they'll line up here, newest first, so you can watch your progress over time."
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
        ListHeaderComponent={
          <Text style={styles.count}>
            {entries.length} {entries.length === 1 ? 'photo' : 'photos'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            {item.signedUrl ? (
              <Image source={{ uri: item.signedUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoMissing]} />
            )}
            <View style={styles.caption}>
              <Text style={styles.captionDate}>{formatDate(item.taken_at)}</Text>
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
    count: { ...t.typography.caption, color: t.colors.textSecondary, marginBottom: t.spacing.md },
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
    photo: { width: '100%', height: 200 },
    photoMissing: { backgroundColor: t.colors.skeleton },
    caption: { padding: t.spacing.sm },
    captionDate: {
      ...t.typography.bodySmall,
      fontFamily: t.typography.bodyBold.fontFamily,
      color: t.colors.textPrimary,
    },
  });
}
