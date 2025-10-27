import { useHabits } from '../hooks/useHabits';
import { Download, TrendingUp, Award, Target } from 'lucide-react';

export function ProgressView() {
  const { habits, completions, getStreak } = useHabits();

  function exportData(format: 'json' | 'csv') {
    const data = habits.map(habit => {
      const frequency = (habit.frequency as any) === 'weekly' ? 'custom' : habit.frequency;
      const activeDaysList = habit.active_days || [];
      const activeDays = frequency === 'daily' ? 'All' : activeDaysList.join(',');

      return {
        name: habit.name,
        description: habit.description,
        frequency: frequency,
        active_days_csv: activeDays,
        active_days_json: activeDaysList,
        streak: getStreak(habit.id),
        totalCompletions: completions.filter(c => c.habit_id === habit.id).length,
        createdAt: habit.created_at,
      };
    });

    if (format === 'json') {
      const jsonData = data.map(d => ({ 
        name: d.name, 
        description: d.description, 
        frequency: d.frequency, 
        active_days: d.active_days_json, 
        streak: d.streak, 
        totalCompletions: d.totalCompletions, 
        createdAt: d.createdAt 
      }));
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      downloadFile(blob, 'habit-tracker-data.json');
    } else {
      const headers = ['Name', 'Description', 'Frequency', 'Active Days (0=Sun)', 'Streak', 'Total Completions', 'Created At'];
      const rows = data.map(d => [
        `"${d.name.replace(/"/g, '""')}"`, // Handle potential commas in names
        `"${d.description.replace(/"/g, '""')}"`,
        d.frequency,
        d.active_days_csv,
        d.streak,
        d.totalCompletions,
        d.createdAt,
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadFile(blob, 'habit-tracker-data.csv');
    }
  }

  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getLast30DaysCompletions(habitId: string): number[] {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const completed = completions.some(c => c.habit_id === habitId && c.completed_date === dateStr);
      days.push(completed ? 1 : 0);
    }
    return days;
  }

  // Updated completion rate logic
  function getCompletionRate(habitId: string): number {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const frequency = (habit.frequency as any) === 'weekly' ? 'custom' : habit.frequency;
    const activeDays = frequency === 'daily' 
      ? [0, 1, 2, 3, 4, 5, 6] 
      : (habit.active_days || []);
    
    if (activeDays.length === 0) return 0;
    
    let activeDaysInPeriod = 0;
    let completedInPeriod = 0;
    let checkDate = new Date();

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dayOfWeek = checkDate.getDay();
      if (activeDays.includes(dayOfWeek)) {
        // This was an active day
        activeDaysInPeriod++;
        const dateStr = checkDate.toISOString().split('T')[0];
        if (completions.some(c => c.habit_id === habitId && c.completed_date === dateStr)) {
          completedInPeriod++;
        }
      }
      // Move to the previous day
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return activeDaysInPeriod > 0 
      ? Math.round((completedInPeriod / activeDaysInPeriod) * 100) 
      : 0; // Avoid division by zero
  }

  const totalCompletions = completions.length;
  const longestStreak = Math.max(...habits.map(h => getStreak(h.id)), 0);
  
  // This average is now correct as it uses the new getCompletionRate
  const averageRate = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + getCompletionRate(h.id), 0) / habits.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Completions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCompletions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{longestStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rate (30d)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Habit Statistics</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {habits.map(habit => {
            const streak = getStreak(habit.id);
            const completionRate = getCompletionRate(habit.id);
            const totalHabitCompletions = completions.filter(c => c.habit_id === habit.id).length;
            const last30Days = getLast30DaysCompletions(habit.id);

            // Get active days for this habit
            const frequency = (habit.frequency as any) === 'weekly' ? 'custom' : habit.frequency;
            const habitActiveDays = frequency === 'daily' 
              ? [0, 1, 2, 3, 4, 5, 6] 
              : (habit.active_days || []);

            return (
              <div key={habit.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: habit.color + '20' }}
                  >
                    {habit.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{habit.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{habit.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Streak</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{streak} days</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Completion Rate</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Completions</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{totalHabitCompletions}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Last 30 Days</p>
                  <div className="flex gap-1">
                    {/* Updated 30-day view logic */}
                    {last30Days.map((completed, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (29 - index));
                      const dayOfWeek = date.getDay();
                      const isActiveDay = habitActiveDays.includes(dayOfWeek);

                      let bgColor;
                      if (!isActiveDay) {
                        bgColor = 'bg-gray-100 dark:bg-gray-800'; // Skipped day
                      } else {
                        bgColor = completed
                          ? 'bg-green-500' // Active and completed
                          : 'bg-gray-200 dark:bg-gray-700'; // Active and missed
                      }

                      return (
                        <div
                          key={index}
                          className={`flex-1 h-8 rounded ${bgColor}`}
                          title={date.toDateString()}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}