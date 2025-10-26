import { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

const ICONS = ['🎯', '📚', '💪', '🧘', '🏃', '💻', '🎨', '🎵', '✍️', '🌱'];

// New constants for custom days
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Default for custom

type Props = {
  habitId: string | null;
  onClose: () => void;
};

export function HabitForm({ habitId, onClose }: Props) {
  const { habits, createHabit, updateHabit } = useHabits();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  
  // Updated state for frequency
  const [frequency, setFrequency] = useState<'daily' | 'custom'>('daily');
  const [activeDays, setActiveDays] = useState<number[]>(ALL_DAYS); // New state
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (habitId) {
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        setName(habit.name);
        setDescription(habit.description);
        setColor(habit.color);
        setIcon(habit.icon);
        
        // Handle old 'weekly' frequency as 'custom'
        if ((habit.frequency as any) === 'weekly') {
          setFrequency('custom');
          setActiveDays(WEEKDAYS); // Default old 'weekly' habits to weekdays
        } else {
          setFrequency(habit.frequency as 'daily' | 'custom');
          setActiveDays(habit.active_days || ALL_DAYS);
        }
      }
    } else {
      // Set defaults for new habit
      setFrequency('daily');
      setActiveDays(ALL_DAYS);
    }
    setError(''); // Clear any previous errors
  }, [habitId, habits]);

  // New function to toggle weekdays
  function toggleDay(dayIndex: number) {
    if (frequency !== 'custom') return; // Should not be possible

    let newActiveDays;
    if (activeDays.includes(dayIndex)) {
      newActiveDays = activeDays.filter(d => d !== dayIndex);
    } else {
      newActiveDays = [...activeDays, dayIndex].sort();
    }
    
    // Don't allow unselecting all days
    if (newActiveDays.length > 0) {
      setActiveDays(newActiveDays);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(''); // Clear previous errors

    // Ensure 'daily' frequency always has all days
    const finalActiveDays = frequency === 'daily' ? ALL_DAYS : activeDays;

    try {
      if (habitId) {
        await updateHabit(habitId, {
          name,
          description,
          color,
          icon,
          frequency,
          active_days: finalActiveDays, // Use new active_days
          // target_days is no longer sent
        });
      } else {
        await createHabit({
          name,
          description,
          color,
          icon,
          frequency,
          active_days: finalActiveDays, // Use new active_days
          is_active: true,
          target_days: 7, // Pass default for deprecated column
        });
      }
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while saving the habit.';
      setError(errorMessage);
      
      // Scroll to error after state update
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {habitId ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div 
              ref={errorRef}
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Morning Exercise"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your habit..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`p-3 text-2xl rounded-lg border-2 transition-all ${icon === i
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${color === c
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-transparent hover:scale-105'
                    }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* --- MODIFIED FREQUENCY SECTION --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFrequency('daily');
                  setActiveDays(ALL_DAYS);
                }}
                className={`p-3 rounded-lg border-2 transition-all ${frequency === 'daily'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => {
                  setFrequency('custom');
                  // Default to weekdays if switching from daily
                  if (frequency === 'daily') {
                    setActiveDays(WEEKDAYS);
                  }
                }}
                className={`p-3 rounded-lg border-2 transition-all ${frequency === 'custom'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* --- NEW WEEKDAY PICKER --- */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Days
              </label>
              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAYS.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`p-3 font-medium rounded-lg border-2 transition-all text-center ${
                      activeDays.includes(index)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- REMOVED 'weekly' range slider --- */}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Habit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}