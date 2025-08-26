// Notification utility functions for local habit reminders
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Requests notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}

/**
 * Schedules a local notification for a habit.
 * @param {Object} options
 * @param {string} options.id - Habit ID (for reference)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body/message
 * @param {Date} options.time - Time of day for the notification (Date object)
 * @param {number[]} options.days - Array of weekday numbers (0=Sun, 6=Sat)
 * @returns {Promise<string[]>} - Array of scheduled notification IDs
 */
export async function scheduleHabitNotification({ id, title, message, time, days }) {
  // Cancel any existing notifications for this habit (should be handled by caller)
  const notificationIds = [];
  for (const day of days) {
    // Calculate the next trigger date for this weekday
    const now = new Date();
    let trigger = new Date(now);
    trigger.setHours(time.getHours());
    trigger.setMinutes(time.getMinutes());
    trigger.setSeconds(0);
    // Find the next occurrence of the target weekday
    const dayDiff = (day - now.getDay() + 7) % 7;
    trigger.setDate(now.getDate() + dayDiff + (dayDiff === 0 && trigger < now ? 7 : 0));
    // Schedule the notification
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Habit Reminder',
        body: message || 'Time to build your habit!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        weekday: day + 1, // Expo uses 1=Sun, 7=Sat
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      },
    });
    notificationIds.push(id);
  }
  return notificationIds;
}

/**
 * Cancels a scheduled notification by its ID.
 * @param {string} notificationId
 */
export async function cancelNotification(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
} 