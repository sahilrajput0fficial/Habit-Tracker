import { useHabits } from '../hooks/useHabits';
import { Download, TrendingUp, Award, Target } from 'lucide-react';

export function ProgressView() {
  const { habits, completions, getStreak } = useHabits();

  function exportData(format: 'json' | 'csv') {
    const data = habits.map(habit => ({
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      streak: getStreak(habit.id),
      totalCompletions: completions.filter(c => c.habit_id === habit.id).length,
      createdAt: habit.created_at,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(blob, 'habit-tracker-data.json');
    } else {
      const headers = ['Name', 'Description', 'Frequency', 'Streak', 'Total Completions', 'Created At'];
      const rows = data.map(d => [
        d.name,
        d.description,
        d.frequency,
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

  function getCompletionRate(habitId: string): number {
    const last30 = getLast30DaysCompletions(habitId);
    const completed = last30.filter(d => d === 1).length;
    return Math.round((completed / 30) * 100);
  }

  const totalCompletions = completions.length;
  const longestStreak = Math.max(...habits.map(h => getStreak(h.id)), 0);
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
                    {last30Days.map((completed, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-8 rounded ${
                          completed
                            ? 'bg-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        title={`Day ${index + 1}`}
                      />
                    ))}
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
