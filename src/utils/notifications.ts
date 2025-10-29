// Notification utilities for habit reminders
import { nextDateTimeInZone } from './timeUtils';

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
    time: string, // HH:MM format (local intended time)
    options: NotificationOptions | undefined,
    skipIfSnoozed: boolean | undefined,
    timeZone: string
  ): void {
    // Clear any existing notification with this ID
    this.cancelScheduledNotification(id);

    // If skipIfSnoozed is true and habit is snoozed, don't schedule
    if (skipIfSnoozed) {
      // This will be checked by the caller using isHabitSnoozed
      return;
    }

    const now = new Date();
    const scheduledTime = nextDateTimeInZone(time, timeZone);
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

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
  reminderTime: string,
  timeZone: string
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
    },
    undefined,
    timeZone
  );
};

export const cancelHabitReminder = (habitId: string): void => {
  notificationManager.cancelScheduledNotification(`habit-${habitId}`);
};

// Email reminder functions
export const sendEmailReminder = async (reminder: EmailReminder): Promise<boolean> => {
  try {
    // For now, we'll use a simple email service. In production, you'd want to use a proper email service like SendGrid, Mailgun, etc.
    // This is a placeholder implementation that would need to be replaced with actual email sending logic

    const emailData = {
      to: reminder.userEmail,
      subject: `Habit Reminder: ${reminder.habitName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Habit Reminder</h2>
          <p>Hello!</p>
          <p>This is a reminder to complete your habit: <strong>${reminder.habitName}</strong></p>
          <p>Scheduled time: ${formatTime(reminder.reminderTime)}</p>
          <p>Don't forget to stay on track with your goals!</p>
          <br>
          <p>Best regards,<br>Your Habit Tracker</p>
        </div>
      `,
      text: `
        Habit Reminder

        Hello!

        This is a reminder to complete your habit: ${reminder.habitName}
        Scheduled time: ${formatTime(reminder.reminderTime)}

        Don't forget to stay on track with your goals!

        Best regards,
        Your Habit Tracker
      `
    };

    // Placeholder for email sending - replace with actual email service
    console.log('Sending email reminder:', emailData);

    // Simulate email sending (replace with actual API call)
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailData)
    // });

    // For now, just return true to indicate success
    return true;
  } catch (error) {
    console.error('Error sending email reminder:', error);
    return false;
  }
};

export const scheduleEmailReminder = (
  habitId: string,
  habitName: string,
  userEmail: string,
  reminderTime: string,
  timeZone: string
): void => {
  // Calculate next reminder time in the selected timezone
  const now = new Date();
  const scheduledTime = nextDateTimeInZone(reminderTime, timeZone);
  const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

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
    scheduleEmailReminder(habitId, habitName, userEmail, reminderTime, timeZone);
  }, delay);
};

// Helper function to format time
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const hour = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};
