import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import type { ProgressPhoto } from '@lifestyle-os/shared/sync';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ScreenScroll, screenStyles } from '../components/ScreenLayout';
import { addProgressPhoto, getProgressPhotos } from '../db/photos';
import { getSignedPhotoUrl } from '../lib/photoStorage';
import type { ModulesStackParamList } from '../navigation/types';
import { useAppSync } from '../sync/AppSyncContext';
import { colors, spacing } from '../theme/tokens';

type Nav = NativeStackNavigationProp<ModulesStackParamList, 'Photos'>;
type Angle = ProgressPhoto['angle'];

const ANGLES: Angle[] = ['front', 'side', 'back', 'custom'];

type PhotoWithUrl = ProgressPhoto & { url: string | null };

export function PhotosScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { refreshKey, afterLocalWrite } = useAppSync();
  const navigation = useNavigation<Nav>();
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [angle, setAngle] = useState<Angle>('front');
  const [weight, setWeight] = useState('');
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const rows = await getProgressPhotos(db, user.id);
    const withUrls = await Promise.all(
      rows.map(async (p) => ({
        ...p,
        url: await getSignedPhotoUrl(p.storage_path),
      })),
    );
    setPhotos(withUrls);
  }, [db, user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const handlePick = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      await addProgressPhoto(
        db,
        user.id,
        result.assets[0].uri,
        angle,
        weight ? Number(weight) : undefined,
      );
      setWeight('');
      await reload();
      await afterLocalWrite();
      Alert.alert('Saved', 'Progress photo uploaded.');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenScroll>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Modules</Text>
      </Pressable>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Progress photos</Text>
        <Text style={screenStyles.subtitle}>{photos.length} photo(s)</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Add photo</Text>
        <Text style={styles.label}>Angle</Text>
        <View style={styles.angleRow}>
          {ANGLES.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAngle(a)}
              style={[styles.angleBtn, angle === a && styles.angleActive]}
            >
              <Text style={styles.angleText}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          value={weight}
          onChangeText={setWeight}
          placeholder="Weight kg (optional)"
          keyboardType="decimal-pad"
        />
        <Button
          label={uploading ? 'Uploading…' : 'Pick from library'}
          loading={uploading}
          onPress={() => void handlePick()}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Gallery</Text>
        {photos.length === 0 ? (
          <Text style={styles.meta}>No photos yet. Add your first progress shot above.</Text>
        ) : (
          <View style={styles.grid}>
            {photos.map((p) => (
              <View key={p.id} style={styles.thumbWrap}>
                {p.url ? (
                  <Image source={{ uri: p.url }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                )}
                <Text style={styles.thumbMeta}>
                  {p.taken_date} · {p.angle}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing.md },
  backText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  meta: { color: colors.textMuted, fontSize: 14 },
  angleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  angleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  angleActive: { backgroundColor: colors.accent },
  angleText: { color: colors.text, fontSize: 12, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  thumbWrap: { width: '47%' },
  thumb: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: colors.surface },
  thumbPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMeta: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs, textAlign: 'center' },
});
