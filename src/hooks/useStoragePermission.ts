/**
 * Storage Permission Hook
 *
 * Requests storage permissions on first app launch for Android.
 * - Android < 13: Requests READ/WRITE_EXTERNAL_STORAGE
 * - Android 13+: Uses scoped storage (no permission needed for app's own files)
 */

import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_REQUESTED_KEY = '@ai_writer_storage_permission_requested';

export function useStoragePermission() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestStoragePermission();
  }, []);

  const requestStoragePermission = async () => {
    // Only needed on Android
    if (Platform.OS !== 'android') {
      setPermissionGranted(true);
      setLoading(false);
      return;
    }

    try {
      // Check if we've already requested permission
      const alreadyRequested = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
      
      // For Android 13+ (API 33+), we don't need traditional storage permissions
      // as we use scoped storage (documentDirectory) and SAF for downloads
      const androidVersion = Platform.Version;
      if (typeof androidVersion === 'number' && androidVersion >= 33) {
        setPermissionGranted(true);
        setLoading(false);
        return;
      }

      // For older Android versions, request storage permissions
      if (!alreadyRequested) {
        // Show explanation first
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Storage Permission',
            'AI Writer needs storage access to save your generated documents (PDF, Word, PowerPoint, Excel) to your device.',
            [
              {
                text: 'Continue',
                onPress: () => resolve(),
              },
            ],
            { cancelable: false }
          );
        });

        // Now request the actual permission
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        const readGranted = granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
        const writeGranted = granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;

        // Mark as requested regardless of outcome
        await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');

        if (readGranted && writeGranted) {
          setPermissionGranted(true);
        } else {
          // Even if denied, the app can still work using documentDirectory
          // and SAF for downloads
          setPermissionGranted(false);
        }
      } else {
        // Already requested before, check current status
        const readStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        const writeStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        setPermissionGranted(readStatus && writeStatus);
      }
    } catch (error) {
      console.error('Permission request error:', error);
      // App can still work without these permissions
      setPermissionGranted(false);
    } finally {
      setLoading(false);
    }
  };

  return { permissionGranted, loading };
}
