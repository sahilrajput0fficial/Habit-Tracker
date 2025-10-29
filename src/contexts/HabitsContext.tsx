import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { scheduleHabitReminder, cancelHabitReminder, scheduleEmailReminder, notificationManager } from '../utils/notifications';

type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'custom'; // Updated
  active_days: number[]; // Added
  // target_days: number; // No longer used, but keep for now to avoid breaking DB type
  target_days: number;
  is_active: boolean;
  reminder_time: string | null;
  reminders_enabled: boolean;
  browser_notifications: boolean;
  email_notifications: boolean;
  snoozed_until: string | null;
  snooze_duration: number | null;
  created_at: string;
  updated_at: string;
};

type PrebuiltHabit = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'weekly' | 'custom';
  target_days: number;
  category: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type HabitCompletion = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;
  notes: string;
  created_at: string;
};

type HabitsContextType = {
  habits: Habit[];
  prebuiltHabits: PrebuiltHabit[];
  completions: HabitCompletion[];
  loading: boolean;
  createHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'target_days'> & { target_days?: number }) => Promise<Habit>; // Make target_days optional
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreak: (habitId: string) => number;
  snoozeHabit: (habitId: string, durationMinutes: number) => Promise<void>;
  unsnoozeHabit: (habitId: string) => Promise<void>;
  isHabitSnoozed: (habitId: string) => boolean;
  refreshHabits: () => Promise<void>;
  refreshCompletions: () => Promise<void>;
  fetchPrebuiltHabits: () => Promise<PrebuiltHabit[]>;
  createPrebuiltHabit: (habit: Omit<PrebuiltHabit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<PrebuiltHabit>;
  updatePrebuiltHabit: (id: string, updates: Partial<PrebuiltHabit>) => Promise<void>;
  deletePrebuiltHabit: (id: string) => Promise<void>;
  seedDefaultPrebuiltHabits: () => Promise<void>;
};

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export function useHabits() {
  const context = useContext(HabitsContext);
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
}

interface HabitsProviderProps {
  children: ReactNode;
}

export function HabitsProvider({ children }: HabitsProviderProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [prebuiltHabits, setPrebuiltHabits] = useState<PrebuiltHabit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    try {
      console.log('Loading habits for user:', user?.id);
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading habits:', error);
        throw error;
      }
      console.log('Loaded habits:', data);
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadCompletions = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .gte('completed_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (error) {
        console.error('Error loading completions:', error);
        throw error;
      }
      setCompletions(data || []);
    } catch (error) {
      console.error('Error loading completions:', error);
    }
  }, []);

  const setupNotifications = useCallback(() => {
    if (!notificationManager.isSupported()) {
      console.warn('Notifications not supported in this browser');
      return;
    }

    // Request permission if not already granted
    notificationManager.requestPermission().then(permission => {
      if (permission.granted) {
        // Cancel all existing notifications first
        notificationManager.cancelAllScheduledNotifications();

        // Schedule notifications and email reminders for habits with reminders enabled
        habits.forEach(habit => {
          if (habit.reminders_enabled && habit.reminder_time) {
            // Skip scheduling if habit is currently snoozed
            if (isHabitSnoozed(habit.id)) {
              return;
            }

            if (habit.browser_notifications) {
              scheduleHabitReminder(habit.id, habit.name, habit.reminder_time);
            }
            // Also schedule email reminders if user has email and email notifications are enabled
            if (user?.email && habit.email_notifications) {
              scheduleEmailReminder(habit.id, habit.name, user.email, habit.reminder_time);
            }
          }
        });
      } else {
        console.warn('Notification permission not granted');
      }
    });
  }, [habits, user?.email]);

  useEffect(() => {
    if (user) {
      loadHabits();
      loadCompletions();
      // Also load prebuilt habits so they are visible where needed
      fetchPrebuiltHabits();
    } else {
      setHabits([]);
      setCompletions([]);
      setPrebuiltHabits([]);
      notificationManager.cancelAllScheduledNotifications();
      setLoading(false);
    }
  }, [user, loadHabits, loadCompletions]);

  // Set up notifications when habits change
  useEffect(() => {
    if (user && habits.length > 0) {
      setupNotifications();
    }
  }, [habits, user, setupNotifications]);



  async function createHabit(habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'target_days'> & { target_days?: number }) {
    if (!user) {
      console.error('No user found! Cannot create habit.');
      throw new Error('You must be logged in to create a habit.');
    }

    // Check for duplicate habit name (case-insensitive)
    const trimmedName = habit.name.trim().toLowerCase();
    const duplicate = habits.find(
      h => h.name.trim().toLowerCase() === trimmedName
    );

    if (duplicate) {
      throw new Error('A habit with this name already exists. Please choose a different name.');
    }

    console.log('Creating habit with data:', habit);
    console.log('User ID:', user.id);

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({ ...habit, user_id: user.id ,active_days: habit.frequency === 'daily' ? [0,1,2,3,4,5,6] : habit.active_days,
          target_days: 7})
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating habit:', error);
        throw error;
      }

      console.log('Habit created successfully:', data);
      setHabits([data, ...habits]);
      return data;
    } catch (error) {
      console.error('Exception creating habit:', error);
      throw error;
    }
  }

  async function updateHabit(id: string, updates: Partial<Habit>) {
    // Check for duplicate name when updating (exclude current habit)
    if (updates.name) {
      const trimmedName = updates.name.trim().toLowerCase();
      const duplicate = habits.find(
        h => h.id !== id && h.name.trim().toLowerCase() === trimmedName
      );

      if (duplicate) {
        throw new Error('A habit with this name already exists. Please choose a different name.');
      }
    }
    // Ensure 'daily' habits save with all days
    if (updates.frequency === 'daily') {
      updates.active_days = [0, 1, 2, 3, 4, 5, 6];
    }

    const { error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    setHabits(habits.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    setHabits(habits.filter(h => h.id !== id));

    // Cancel any scheduled notifications for this habit
    cancelHabitReminder(id);
  }

  async function toggleCompletion(habitId: string, date: string) {
    if (!user) return;

    const existing = completions.find(
      c => c.habit_id === habitId && c.completed_date === date
    );

    if (existing) {
      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      setCompletions(completions.filter(c => c.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('habit_completions')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed_date: date,
        })
        .select()
        .single();

      if (error) throw error;
      setCompletions([...completions, data]);
    }
  }

  function isCompleted(habitId: string, date: string): boolean {
    return completions.some(
      c => c.habit_id === habitId && c.completed_date === date
    );
  }

  function getStreak(habitId: string): number {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    // Use active_days, default to all days for 'daily'
    const activeDays = habit.frequency === 'daily' 
      ? [0, 1, 2, 3, 4, 5, 6] 
      : (habit.active_days || []);
    
    if (activeDays.length === 0) return 0; // No active days, no streak

    let streak = 0;
    let currentDate = new Date();

    // 1. Check if today is active and uncompleted. If so, streak is 0.
    const todayDay = currentDate.getDay();
    const todayStr = currentDate.toISOString().split('T')[0];
    if (activeDays.includes(todayDay) && !isCompleted(habitId, todayStr)) {
      return 0; // Today is an active day and it's not done, so streak is 0.
    }
    
    // 2. Loop backwards from today.
    for (let i = 0; i < 365; i++) { // Limit to 1 year
      const dayOfWeek = currentDate.getDay();
      
      if (activeDays.includes(dayOfWeek)) {
        // This is an active day
        const dateStr = currentDate.toISOString().split('T')[0];
        if (isCompleted(habitId, dateStr)) {
          streak++;
        } else {
          // Found a past, active, uncompleted day. Streak ends.
          break;
        }
      }
      // If not an active day, just skip it and check the day before.
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  async function snoozeHabit(habitId: string, durationMinutes: number) {
    const snoozedUntil = new Date();
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + durationMinutes);

    const { error } = await supabase
      .from('habits')
      .update({
        snoozed_until: snoozedUntil.toISOString(),
        snooze_duration: durationMinutes
      })
      .eq('id', habitId);

    if (error) throw error;

    setHabits(habits.map(h =>
      h.id === habitId
        ? { ...h, snoozed_until: snoozedUntil.toISOString(), snooze_duration: durationMinutes }
        : h
    ));

    // Cancel current notification for this habit
    cancelHabitReminder(habitId);
  }

  async function unsnoozeHabit(habitId: string) {
    const { error } = await supabase
      .from('habits')
      .update({
        snoozed_until: null,
        snooze_duration: null
      })
      .eq('id', habitId);

    if (error) throw error;

    setHabits(habits.map(h =>
      h.id === habitId
        ? { ...h, snoozed_until: null, snooze_duration: null }
        : h
    ));

    // Reschedule notification for this habit
    const habit = habits.find(h => h.id === habitId);
    if (habit && habit.reminders_enabled && habit.reminder_time && habit.browser_notifications) {
      scheduleHabitReminder(habit.id, habit.name, habit.reminder_time);
    }
  }

  function isHabitSnoozed(habitId: string): boolean {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.snoozed_until) return false;

    const snoozedUntil = new Date(habit.snoozed_until);
    return snoozedUntil > new Date();
  }

  // Prebuilt habits functions
  async function fetchPrebuiltHabits(): Promise<PrebuiltHabit[]> {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('prebuilt_habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const habits = data || [];
      setPrebuiltHabits(habits);
      return habits;
    } catch (error) {
      console.error('Error fetching prebuilt habits:', error);
      return [];
    }
  }

  async function createPrebuiltHabit(habit: Omit<PrebuiltHabit, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PrebuiltHabit> {
    if (!user) throw new Error('You must be logged in to create a prebuilt habit.');

    try {
      const { data, error } = await supabase
        .from('prebuilt_habits')
        .insert({ ...habit, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setPrebuiltHabits([data, ...prebuiltHabits]);
      return data;
    } catch (error) {
      console.error('Error creating prebuilt habit:', error);
      throw error;
    }
  }

  async function updatePrebuiltHabit(id: string, updates: Partial<PrebuiltHabit>): Promise<void> {
    const { error } = await supabase
      .from('prebuilt_habits')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    setPrebuiltHabits(prebuiltHabits.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  async function deletePrebuiltHabit(id: string): Promise<void> {
    const { error } = await supabase
      .from('prebuilt_habits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setPrebuiltHabits(prebuiltHabits.filter(h => h.id !== id));
  }

  async function seedDefaultPrebuiltHabits(): Promise<void> {
    if (!user) return;

    // Ensure a profile exists for this user to satisfy the foreign key on prebuilt_habits.user_id -> profiles(id)
    try {
      const { data: existingProfile, error: profileSelectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileSelectError) {
        console.warn('Could not verify profile existence before seeding defaults:', profileSelectError);
      }

      if (!existingProfile) {
        const profileInsert = {
          id: user.id,
          // These fields may have defaults; include the safest minimums if present
          // email is commonly present on profiles; ignore if schema differs
          email: (user as any).email ?? undefined,
        } as any;

        const { error: profileUpsertError } = await supabase
          .from('profiles')
          .upsert(profileInsert, { onConflict: 'id', ignoreDuplicates: true });

        if (profileUpsertError) {
          console.warn('Failed to upsert profile before seeding defaults (may already exist or schema differs):', profileUpsertError);
        }
      }
    } catch (e) {
      console.warn('Non-fatal error ensuring profile exists before seeding defaults:', e);
    }

    // First check if default habits already exist for this user
    const { data: existingDefaults, error: checkError } = await supabase
      .from('prebuilt_habits')
      .select('name')
      .eq('user_id', user.id)
      .eq('is_default', true);

    if (checkError) {
      console.error('Error checking existing defaults:', checkError);
      return;
    }

    // If defaults already exist, don't seed again
    if (existingDefaults && existingDefaults.length > 0) {
      console.log('Default prebuilt habits already exist, skipping seeding');
      return;
    }

    const defaultHabits = [
      {
        name: 'Drink Water',
        description: 'Stay hydrated throughout the day',
        color: '#3b82f6',
        icon: '💧',
        frequency: 'daily' as const,
        target_days: 7,
        category: 'Health',
        is_default: true,
      },
      {
        name: 'Exercise',
        description: '30 minutes of physical activity',
        color: '#ef4444',
        icon: '💪',
        frequency: 'daily' as const,
        target_days: 5,
        category: 'Fitness',
        is_default: true,
      },
      {
        name: 'Read for 10 mins',
        description: 'Expand your knowledge daily',
        color: '#10b981',
        icon: '📚',
        frequency: 'daily' as const,
        target_days: 7,
        category: 'Learning',
        is_default: true,
      },
      {
        name: 'Meditation',
        description: '10 minutes of mindfulness',
        color: '#8b5cf6',
        icon: '🧘',
        frequency: 'daily' as const,
        target_days: 6,
        category: 'Wellness',
        is_default: true,
      },
      {
        name: 'Wake up Early',
        description: 'Rise before 7 AM',
        color: '#f59e0b',
        icon: '🌅',
        frequency: 'daily' as const,
        target_days: 7,
        category: 'Productivity',
        is_default: true,
      },
      {
        name: 'No Phone Before Bed',
        description: 'Digital detox before sleep',
        color: '#ec4899',
        icon: '📱',
        frequency: 'daily' as const,
        target_days: 7,
        category: 'Wellness',
        is_default: true,
      },
      {
        name: 'Write in Journal',
        description: 'Reflect on your day',
        color: '#14b8a6',
        icon: '✍️',
        frequency: 'daily' as const,
        target_days: 5,
        category: 'Personal',
        is_default: true,
      },
      {
        name: 'Healthy Breakfast',
        description: 'Start day with nutritious food',
        color: '#f97316',
        icon: '🥑',
        frequency: 'daily' as const,
        target_days: 6,
        category: 'Nutrition',
        is_default: true,
      }
    ];

    try {
      const { data, error } = await supabase
        .from('prebuilt_habits')
        .insert(defaultHabits.map(h => ({ ...h, user_id: user.id })))
        .select();

      if (error) throw error;

      console.log('Successfully seeded default prebuilt habits');
      setPrebuiltHabits(prev => [...(data || []), ...prev]);
    } catch (error) {
      console.error('Error seeding default prebuilt habits:', error);
      throw error;
    }
  }

  const value: HabitsContextType = {
    habits,
    prebuiltHabits,
    completions,
    loading,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    getStreak,
    snoozeHabit,
    unsnoozeHabit,
    isHabitSnoozed,
    refreshHabits: loadHabits,
    refreshCompletions: loadCompletions,
    fetchPrebuiltHabits,
    createPrebuiltHabit,
    updatePrebuiltHabit,
    deletePrebuiltHabit,
    seedDefaultPrebuiltHabits,
  };

  return (
    <HabitsContext.Provider value={value}>
      {children}
    </HabitsContext.Provider>
  );
}
