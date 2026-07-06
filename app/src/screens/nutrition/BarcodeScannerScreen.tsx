import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanBarcode } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NutritionStackParamList } from '../../navigation/types';
import { lookupBarcode } from '../../services/foodSearch';
import { Button, EmptyState, useToast } from '../../components/ui';
import ScreenContainer from '../../components/ScreenContainer';
import { Theme, useThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<NutritionStackParamList, 'BarcodeScanner'>;

export default function BarcodeScannerScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookingUp, setLookingUp] = useState(false);
  // Scanners fire the same code many times per second — gate on the first.
  const handledRef = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (handledRef.current || lookingUp) return;
    handledRef.current = true;
    setLookingUp(true);
    try {
      const item = await lookupBarcode(data);
      if (!item) {
        showToast(`No food found for barcode ${data}`, 'error');
        handledRef.current = false;
        return;
      }
      navigation.navigate({
        name: 'LogMeal',
        params: {
          mode: 'manual',
          prefill: {
            name: item.brand ? `${item.name} (${item.brand})` : item.name,
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            food_item_id: item.created_at ? item.id : null,
          },
        },
        merge: true,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Lookup failed', 'error');
      handledRef.current = false;
    } finally {
      setLookingUp(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <ScreenContainer style={styles.center}>
        <EmptyState
          icon={ScanBarcode}
          title="Scanning needs the app"
          message="Barcode scanning uses the camera and works on your phone — on web, search for the food by name instead."
          ctaLabel="Search foods"
          onCtaPress={() => navigation.navigate({ name: 'LogMeal', params: { mode: 'search' }, merge: true })}
        />
      </ScreenContainer>
    );
  }

  if (!permission?.granted) {
    return (
      <ScreenContainer style={styles.center}>
        <EmptyState
          icon={ScanBarcode}
          title="Camera permission needed"
          message="FitLoop only uses the camera while you scan a barcode."
        />
        <Button label="Allow camera" onPress={requestPermission} style={styles.permissionButton} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>{lookingUp ? 'Looking up…' : 'Point at a product barcode'}</Text>
      </View>
    </ScreenContainer>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center', padding: t.spacing.xl },
    permissionButton: { marginTop: t.spacing.lg, alignSelf: 'stretch', marginHorizontal: t.spacing.xl },
    camera: { flex: 1 },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: 240,
      height: 150,
      borderWidth: 3,
      borderColor: t.colors.accent,
      borderRadius: t.radii.lg,
      backgroundColor: 'transparent',
    },
    hint: {
      ...t.typography.bodyBold,
      color: '#FFFFFF',
      marginTop: t.spacing.lg,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowRadius: 6,
    },
  });
}
