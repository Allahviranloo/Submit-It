import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INACTIVITY_NOTIFICATION_KEY = 'smart-planner-inactivity-notification-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForLocalNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return finalStatus === 'granted';
}

function parseTimeString(timeString: string) {
  const [time, modifier] = timeString.split(' ');
  const [rawHours, rawMinutes] = time.split(':');

  let hours = parseInt(rawHours, 10);
  const minutes = parseInt(rawMinutes, 10);

  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  } else if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  }

  return { hours, minutes };
}

function buildDueDateTime(dueDate: string, dueTime: string) {
  const [year, month, day] = dueDate.split('-').map(Number);
  const { hours, minutes } = parseTimeString(dueTime);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export async function scheduleAssignmentReminderNotification(params: {
  courseName: string;
  assignmentTitle: string;
  dueDate: string;
  dueTime: string;
}) {
  const now = new Date();
  const dueDateTime = buildDueDateTime(params.dueDate, params.dueTime);

  if (dueDateTime <= now) {
    return null;
  }

  let triggerDate = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
  let body = `Hey, your ${params.courseName} ${params.assignmentTitle} is due tomorrow at ${params.dueTime}. You might want to submit it or get started if you haven’t already.`;

  if (triggerDate <= now) {
    triggerDate = new Date(now.getTime() + 60 * 1000); // 1 minute from now
    body = `Hey, your ${params.courseName} ${params.assignmentTitle} is due at ${params.dueTime}. Don’t forget to finish it soon.`;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Assignment reminder',
      body,
      data: {
        type: 'assignment-reminder',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? 'default' : undefined,
    },
  });

  return id;
}

export async function cancelScheduledNotification(notificationId?: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore missing/dead IDs
  }
}

export async function scheduleInactivityReminderNotification() {
  const existingId = await AsyncStorage.getItem(INACTIVITY_NOTIFICATION_KEY);
  if (existingId) {
    await cancelScheduledNotification(existingId);
  }

  const triggerDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Come back and check in',
      body: `Hey, you've got some assignments waiting for you. Why don't we start knocking them off the list one by one?`,
      data: {
        type: 'inactivity-reminder',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? 'default' : undefined,
    },
  });

  await AsyncStorage.setItem(INACTIVITY_NOTIFICATION_KEY, id);
  return id;
}

export async function scheduleTestNotification() {
  const now = new Date();
  const trigger = new Date(now.getTime() + 60 * 1000); // 1 minute

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'TEST Notification',
      body: 'NOTIFICATIONS WORK',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });

  console.log('TEST notification scheduled for:', trigger);
}