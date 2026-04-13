import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppDataProvider } from '../context/AppDataContext';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  registerForLocalNotificationsAsync,
  scheduleInactivityReminderNotification,
} from '../services/notifications';

function AppBootEffects() {
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const granted = await registerForLocalNotificationsAsync();
      if (mounted && granted) {
        await scheduleInactivityReminderNotification();
      }
    };

    setup();

    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          const granted = await registerForLocalNotificationsAsync();
          if (granted) {
            await scheduleInactivityReminderNotification();
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDataProvider>
        <AppBootEffects />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220,
          }}
        />
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}