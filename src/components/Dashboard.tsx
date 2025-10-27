import { useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { Plus, CheckCircle2, Circle, Flame, Calendar, TrendingUp, Menu, Moon, Sun, LogOut, Bell } from 'lucide-react';
import { HabitForm } from './HabitForm';
import { CalendarView } from './CalendarView';
import { ProgressView } from './ProgressView';
import { NotificationsPanel } from './NotificationsPanel';
import { SuggestedHabits, Onboarding } from './Onboarding';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type View = 'dashboard' | 'calendar' | 'progress';

export function Dashboard() {
  const { habits, loading, toggleCompletion, isCompleted, getStreak } = useHabits();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const isDarkMode = theme === 'dark';

  // Force theme application on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter habits to only those active today
  const activeHabitsToday = habits.filter(habit => {
    // Handle old 'weekly' data as 'custom'
    const frequency = (habit.frequency as any) === 'weekly' ? 'custom' : habit.frequency;
    const activeDays = frequency === 'daily' 
      ? [0, 1, 2, 3, 4, 5, 6] 
      : (habit.active_days || []);
    return activeDays.includes(todayDay);
  });

  const completedToday = activeHabitsToday.filter(h => isCompleted(h.id, today)).length;
  const totalActive = activeHabitsToday.length; // Use filtered list

  const reminderCount = habits.filter(h => h.reminders_enabled && h.reminder_time).length;



  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">HT</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Habit Tracker</h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                  >
                    <Bell className="w-5 h-5" />
                    {reminderCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {reminderCount}
                      </span>
                    )}
                  </button>
                  <NotificationsPanel
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Menu className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentView === 'calendar'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentView('progress')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentView === 'progress'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Progress</span>
              </div>
            </button>
          </div>

          {currentView === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Today's Progress</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {completedToday}/{totalActive}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Habits Today</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActive}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Habits</h2>
                <button
                  onClick={() => setShowHabitForm(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Habit</span>
                </button>
              </div>

              {activeHabitsToday.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                  <Circle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {habits.length === 0 ? "No habits yet" : "No habits for today"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {habits.length === 0 
                      ? "Start building better habits by creating your first one"
                      : "Enjoy your day off, or create a new habit!"}
                  </p>
                  <button
                    onClick={() => setShowHabitForm(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Your First Habit</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeHabitsToday.map(habit => {
                    const completed = isCompleted(habit.id, today);
                    const streak = getStreak(habit.id);

                    return (
                      <div
                        key={habit.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: habit.color + '20' }}
                            >
                              <span className="text-2xl">{habit.icon}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{habit.name}</h3>
                              {habit.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{habit.description}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Flame className="w-4 h-4" />
                            <span>{streak} day streak</span>
                          </div>
                          <button
                            onClick={() => toggleCompletion(habit.id, today)}
                            className={`p-2 rounded-lg transition-all ${
                              completed
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              <Circle className="w-6 h-6" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show suggested habits below user habits only if user has habits */}
              {habits.length > 0 && <SuggestedHabits />}
            </>
          )}

          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'progress' && <ProgressView />}
        </div>

        {showHabitForm && (
          <HabitForm
            habitId={editingHabit}
            onClose={() => {
              setShowHabitForm(false);
              setEditingHabit(null);
            }}
          />
        )}

        {/* Show onboarding modal for new users with no habits */}
        <Onboarding />
      </div>
    </div>
  );
}