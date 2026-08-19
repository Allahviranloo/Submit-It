import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INACTIVITY_NOTIFICATION_KEY = 'smart-planner-inactivity-notification-id';

export type ReminderFrequency = 'once' | 'hourly' | 'every-2-hours' | 'daily' | 'every-2-days' | 'weekly';

export const REMINDER_FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'once', label: 'Once (24 hours before)' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'every-2-hours', label: 'Every 2 hours' },
  { value: 'daily', label: 'Every day' },
  { value: 'every-2-days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Every week' },
];

const FREQUENCY_SECONDS: Record<Exclude<ReminderFrequency, 'once'>, number> = {
  hourly: 60 * 60,
  'every-2-hours': 2 * 60 * 60,
  daily: 24 * 60 * 60,
  'every-2-days': 2 * 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
};

export function getReminderFrequencyLabel(frequency: ReminderFrequency) {
  return REMINDER_FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label ?? 'Once';
}

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
  frequency: ReminderFrequency;
}) {
  const now = new Date();
  const dueDateTime = buildDueDateTime(params.dueDate, params.dueTime);

  if (dueDateTime <= now) {
    return [];
  }

  if (params.frequency !== 'once') {
    const intervalMs = FREQUENCY_SECONDS[params.frequency] * 1000;
    const notificationIds: string[] = [];
    // iOS keeps a limited number of pending local notifications. Leave room for
    // general reminders and the inactivity reminder.
    const maximumNotifications = 50;

    for (
      let triggerTime = now.getTime() + intervalMs;
      triggerTime < dueDateTime.getTime() && notificationIds.length < maximumNotifications;
      triggerTime += intervalMs
    ) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Assignment reminder',
          body: `Your ${params.courseName} assignment “${params.assignmentTitle}” is due ${params.dueDate} at ${params.dueTime}.`,
          data: { type: 'assignment-reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
          channelId: Platform.OS === 'android' ? 'default' : undefined,
        },
      });
      notificationIds.push(id);
    }

    if (notificationIds.length === 0) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Assignment reminder',
          body: `Your ${params.courseName} assignment “${params.assignmentTitle}” is due soon at ${params.dueTime}.`,
          data: { type: 'assignment-reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(now.getTime() + 60 * 1000),
          channelId: Platform.OS === 'android' ? 'default' : undefined,
        },
      });
      notificationIds.push(id);
    }

    return notificationIds;
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

  return [id];
}

export async function scheduleGeneralReminderNotification(params: {
  title: string;
  reminderDate: string;
  reminderTime: string;
  frequency: ReminderFrequency;
}) {
  const startDate = buildDueDateTime(params.reminderDate, params.reminderTime);
  if (startDate <= new Date()) return [];

  const content = {
    title: 'Reminder',
    body: params.title,
    data: { type: 'general-reminder' },
    sound: true,
  };

  if (params.frequency === 'once') {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startDate,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });
    return [id];
  }

  const intervalMs = FREQUENCY_SECONDS[params.frequency] * 1000;
  const notificationIds: string[] = [];
  // Schedule from the user's chosen first-alert time. A bounded queue avoids
  // exceeding iOS's pending-local-notification limit.
  for (let triggerTime = startDate.getTime(); notificationIds.length < 50; triggerTime += intervalMs) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTime),
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      },
    });
    notificationIds.push(id);
  }
  return notificationIds;
}

export async function cancelScheduledNotifications(notificationIds?: string[] | string | null) {
  if (!notificationIds) return;
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  await Promise.all(ids.map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore notification IDs that have already fired or been removed.
    }
  }));
}

export const cancelScheduledNotification = cancelScheduledNotifications;

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
