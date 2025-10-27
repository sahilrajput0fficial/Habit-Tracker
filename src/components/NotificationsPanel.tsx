import { Bell, Clock, X, Mail, Pause, Play } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { habits, updateHabit, snoozeHabit, unsnoozeHabit, isHabitSnoozed } = useHabits();

  const reminderHabits = habits.filter(habit => habit.reminders_enabled && habit.reminder_time);

  const handleRemoveReminder = async (habitId: string) => {
    try {
      await updateHabit(habitId, { reminders_enabled: false });
    } catch (error) {
      console.error('Failed to remove reminder:', error);
    }
  };

  const handleSnooze = async (habitId: string, durationMinutes: number) => {
    try {
      await snoozeHabit(habitId, durationMinutes);
    } catch (error) {
      console.error('Failed to snooze habit:', error);
    }
  };

  const handleUnsnooze = async (habitId: string) => {
    try {
      await unsnoozeHabit(habitId);
    } catch (error) {
      console.error('Failed to unsnooze habit:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Reminders</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {reminderHabits.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No reminders set</p>
              <p className="text-sm">Enable reminders in your habit settings</p>
            </div>
          ) : (
            <div className="p-2">
              {reminderHabits.map(habit => (
                <div
                  key={habit.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: habit.color + '20' }}
                  >
                    <span className="text-lg">{habit.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {habit.name}
                        </p>
                        {habit.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {habit.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {(() => {
                                const [hours, minutes] = habit.reminder_time!.split(':').map(Number);
                                const hour = hours % 12 || 12;
                                const ampm = hours < 12 ? 'AM' : 'PM';
                                return `${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>Email</span>
                          </div>
                          {isHabitSnoozed(habit.id) && (
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <Pause className="w-3 h-3" />
                              <span>Snoozed</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {isHabitSnoozed(habit.id) ? (
                          <button
                            onClick={() => handleUnsnooze(habit.id)}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded"
                            title="Resume reminders"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSnooze(habit.id, 60)} // Default to 1 hour snooze
                            className="p-1 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded"
                            title="Snooze for 1 hour"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveReminder(habit.id)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="Remove reminder"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
