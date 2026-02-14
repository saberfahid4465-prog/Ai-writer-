/**
 * Storage Permission Hook
 *
 * Shows a welcome message on first app launch.
 * Since we use scoped storage (documentDirectory) and share sheet,
 * no special permissions are needed on Android 13+.
 */

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@ai_writer_first_launch_done';

export function useStoragePermission() {
  const [permissionGranted] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const firstLaunchDone = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      
      if (!firstLaunchDone) {
        // Show welcome message on first launch
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Welcome to AI Writer!',
            'Generate professional documents in PDF, Word, PowerPoint, and Excel formats using AI.\n\nTap Download or Share to save your files.',
            [
              {
                text: 'Get Started',
                onPress: () => resolve(),
              },
            ],
            { cancelable: false }
          );
        });

        // Mark first launch as done
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      }
    } catch (error) {
      console.error('First launch check error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { permissionGranted, loading };
}
