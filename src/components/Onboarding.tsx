import { useState } from 'react';
import { Check, Sparkles, Flame, Target, Plus } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';

type DefaultHabit = {
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  target_days: number;
  example_streak: number;
  example_completion_rate: number;
  category: string;
};

const DEFAULT_HABITS: DefaultHabit[] = [
  {
    name: 'Drink Water',
    description: 'Stay hydrated throughout the day',
    color: '#3b82f6',
    icon: '💧',
    frequency: 'daily',
    target_days: 7,
    example_streak: 12,
    example_completion_rate: 85,
    category: 'Health'
  },
  {
    name: 'Exercise',
    description: '30 minutes of physical activity',
    color: '#ef4444',
    icon: '💪',
    frequency: 'daily',
    target_days: 5,
    example_streak: 8,
    example_completion_rate: 78,
    category: 'Fitness'
  },
  {
    name: 'Read for 10 mins',
    description: 'Expand your knowledge daily',
    color: '#10b981',
    icon: '📚',
    frequency: 'daily',
    target_days: 7,
    example_streak: 15,
    example_completion_rate: 92,
    category: 'Learning'
  },
  {
    name: 'Meditation',
    description: '10 minutes of mindfulness',
    color: '#8b5cf6',
    icon: '🧘',
    frequency: 'daily',
    target_days: 6,
    example_streak: 22,
    example_completion_rate: 88,
    category: 'Wellness'
  },
  {
    name: 'Wake up Early',
    description: 'Rise before 7 AM',
    color: '#f59e0b',
    icon: '🌅',
    frequency: 'daily',
    target_days: 7,
    example_streak: 6,
    example_completion_rate: 65,
    category: 'Productivity'
  },
  {
    name: 'No Phone Before Bed',
    description: 'Digital detox before sleep',
    color: '#ec4899',
    icon: '📱',
    frequency: 'daily',
    target_days: 7,
    example_streak: 9,
    example_completion_rate: 72,
    category: 'Wellness'
  },
  {
    name: 'Write in Journal',
    description: 'Reflect on your day',
    color: '#14b8a6',
    icon: '✍️',
    frequency: 'daily',
    target_days: 5,
    example_streak: 18,
    example_completion_rate: 81,
    category: 'Personal'
  },
  {
    name: 'Healthy Breakfast',
    description: 'Start day with nutritious food',
    color: '#f97316',
    icon: '🥑',
    frequency: 'daily',
    target_days: 6,
    example_streak: 14,
    example_completion_rate: 89,
    category: 'Nutrition'
  }
];

export function SuggestedHabits() {
  const { createHabit, habits } = useHabits();
  const [selectedHabits, setSelectedHabits] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Filter out habits that user already has
  const existingHabitNames = new Set(habits.map(h => h.name.toLowerCase()));
  const availableHabits = DEFAULT_HABITS.filter(habit =>
    !existingHabitNames.has(habit.name.toLowerCase())
  );

  const toggleHabit = (index: number) => {
    const newSelected = new Set(selectedHabits);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedHabits(newSelected);
  };

  const handleAddHabits = async () => {
    if (selectedHabits.size === 0) return;

    setLoading(true);
    try {
      console.log('Creating habits:', Array.from(selectedHabits));
      // Create selected habits
      const promises = Array.from(selectedHabits).map(async (index) => {
        const habit = availableHabits[index];
        console.log('Creating habit:', habit.name);
        try {
          const createdHabit = await createHabit({
            name: habit.name,
            description: habit.description,
            color: habit.color,
            icon: habit.icon,
            frequency: habit.frequency,
            target_days: habit.target_days,
            is_active: true,
            reminder_time: null,
            reminders_enabled: false,
            browser_notifications: false,
            email_notifications: false,
            snoozed_until: null,
            snooze_duration: null,
          });
          console.log('Habit created successfully:', createdHabit.name);
          return createdHabit;
        } catch (error) {
          console.error('Failed to create habit:', habit.name, error);
          throw error;
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Created ${successful} habits successfully, ${failed} failed`);

      if (failed > 0) {
        console.warn('Some habits failed to create:', results.filter(r => r.status === 'rejected'));
      }

      // Clear selection after successful creation
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Error adding habits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Suggested Habits
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get inspired by these popular habits. Select any to add them to your routine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {availableHabits.map((habit, index) => {
          const isSelected = selectedHabits.has(index);
          return (
            <div
              key={index}
              onClick={() => toggleHabit(index)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: habit.color + '20' }}
                >
                  {habit.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {habit.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {habit.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Flame className="w-3 h-3" />
                    <span>{habit.example_streak} day streak</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Target className="w-3 h-3" />
                    <span>{habit.example_completion_rate}%</span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${habit.example_completion_rate}%`,
                      backgroundColor: habit.color
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">
                    {habit.category}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {habit.frequency === 'daily' ? 'Daily' : 'Weekly'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedHabits.size > 0 && (
        <div className="flex items-center justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mr-4">
            {selectedHabits.size} habit{selectedHabits.size !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={handleAddHabits}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Selected Habits</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Onboarding component for new users with no habits - shows as a modal
export function Onboarding() {
  const { habits } = useHabits();

  // Only show onboarding modal for users with no habits
  if (habits.length > 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Habit Tracker!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Let's get you started with some popular habits. Choose the ones that interest you.
            </p>
          </div>

          <SuggestedHabits />

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You can always add more habits later from your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
