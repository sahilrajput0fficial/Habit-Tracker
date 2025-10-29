// Notification utilities for habit reminders

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface EmailReminder {
  habitId: string;
  habitName: string;
  userEmail: string;
  reminderTime: string;
  scheduledFor: Date;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private scheduledNotifications: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window;
  }

  // Get current permission state
  getPermissionState(): NotificationPermissionState {
    if (!this.isSupported()) {
      return { granted: false, denied: false, default: true };
    }

    return {
      granted: Notification.permission === 'granted',
      denied: Notification.permission === 'denied',
      default: Notification.permission === 'default',
    };
  }

  // Request permission from user
  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return { granted: false, denied: false, default: true };
    }

    if (Notification.permission === 'granted') {
      return { granted: true, denied: false, default: false };
    }

    if (Notification.permission === 'denied') {
      return { granted: false, denied: true, default: false };
    }

    try {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default',
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, denied: false, default: true };
    }
  }

  // Show a notification
  showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.warn('Notifications not supported or permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true, // Keep notification visible until user interacts
        ...options,
      });

      // Add snooze functionality
      notification.onclick = () => {
        notification.close();
        // Show snooze options
        this.showSnoozeOptions(title, options);
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Show snooze options
  private showSnoozeOptions(title: string, originalOptions?: NotificationOptions): void {
    // Show multiple snooze notifications at different intervals
    const snoozeTimes = [5, 10, 15, 30]; // minutes

    snoozeTimes.forEach(minutes => {
      setTimeout(() => {
        this.showNotification(`Snoozed Reminder: ${title}`, {
          ...originalOptions,
          body: `Reminder snoozed for ${minutes} minutes`,
          tag: `snooze-${Date.now()}-${minutes}`, // Unique tag for each snooze
        });
      }, minutes * 60 * 1000);
    });
  }

  // Schedule a notification for a specific time
  scheduleNotification(
    id: string,
    title: string,
    time: string, // HH:MM format
    options?: NotificationOptions,
    skipIfSnoozed?: boolean
  ): void {
    // Clear any existing notification with this ID
    this.cancelScheduledNotification(id);

    // If skipIfSnoozed is true and habit is snoozed, don't schedule
    if (skipIfSnoozed) {
      // This will be checked by the caller using isHabitSnoozed
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    const timeoutId = window.setTimeout(() => {
      this.showNotification(title, options);
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timeoutId);
  }

  // Cancel a scheduled notification
  cancelScheduledNotification(id: string): void {
    const timeoutId = this.scheduledNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(id);
    }
  }

  // Cancel all scheduled notifications
  cancelAllScheduledNotifications(): void {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }

  // Get scheduled notifications count
  getScheduledCount(): number {
    return this.scheduledNotifications.size;
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Utility functions for habit reminders
export const scheduleHabitReminder = (
  habitId: string,
  habitName: string,
  reminderTime: string
): void => {
  notificationManager.scheduleNotification(
    `habit-${habitId}`,
    `Time for your habit: ${habitName}`,
    reminderTime,
    {
      body: `Don't forget to complete your habit "${habitName}"`,
      tag: `habit-${habitId}`,
      requireInteraction: false,
      silent: false,
    }
  );
};

export const cancelHabitReminder = (habitId: string): void => {
  notificationManager.cancelScheduledNotification(`habit-${habitId}`);
};

import emailjs from '@emailjs/browser';

// Email reminder functions
export const sendEmailReminder = async (reminder: EmailReminder): Promise<boolean> => {
  try {
    // EmailJS configuration - you'll need to replace these with your actual EmailJS service details
    const serviceId = 'your_service_id'; // Replace with your EmailJS service ID
    const templateId = 'your_template_id'; // Replace with your EmailJS template ID
    const publicKey = 'your_public_key'; // Replace with your EmailJS public key

    // Initialize EmailJS with your public key
    emailjs.init(publicKey);

    const templateParams = {
      to_email: reminder.userEmail,
      subject: `Habit Reminder: ${reminder.habitName}`,
      habit_name: reminder.habitName,
      reminder_time: formatTime(reminder.reminderTime),
      message: 'Don\'t forget to stay on track with your goals!',
    };

    // Send email using EmailJS
    const result = await emailjs.send(serviceId, templateId, templateParams);

    if (result.status === 200) {
      console.log('Email reminder sent successfully:', result.text);
      return true;
    } else {
      console.error('Failed to send email reminder:', result.text);
      return false;
    }
  } catch (error) {
    console.error('Error sending email reminder:', error);
    return false;
  }
};

export const scheduleEmailReminder = (
  habitId: string,
  habitName: string,
  userEmail: string,
  reminderTime: string
): void => {
  // Calculate next reminder time
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  // Schedule the email reminder
  setTimeout(async () => {
    const success = await sendEmailReminder({
      habitId,
      habitName,
      userEmail,
      reminderTime,
      scheduledFor: scheduledTime
    });

    if (success) {
      console.log(`Email reminder sent for habit: ${habitName}`);
    } else {
      console.error(`Failed to send email reminder for habit: ${habitName}`);
    }

    // Reschedule for next day
    scheduleEmailReminder(habitId, habitName, userEmail, reminderTime);
  }, delay);
};

// Helper function to format time
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const hour = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};
