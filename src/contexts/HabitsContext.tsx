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
  frequency: 'daily' | 'custom';
  active_days: number[];
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

type HabitHistory = {
  id: string;
  habit_id: string;
  user_id: string;
  habit_name: string;
  action: 'created' | 'updated' | 'deleted';
  changes: Record<string, any>;
  created_at: string;
};

type HabitsContextType = {
  habits: Habit[];
  prebuiltHabits: PrebuiltHabit[];
  completions: HabitCompletion[];
  history: HabitHistory[];
  loading: boolean;
  createHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'target_days'> & { target_days?: number }) => Promise<Habit>;
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
  loadHistory: () => Promise<void>;
  fetchPrebuiltHabits: () => Promise<PrebuiltHabit[]>;
  createPrebuiltHabit: (habit: Omit<PrebuiltHabit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<PrebuiltHabit>;
  updatePrebuiltHabit: (id: string, updates: Partial<PrebuiltHabit>) => Promise<void>;
  deletePrebuiltHabit: (id: string) => Promise<void>;
  seedDefaultPrebuiltHabits: () => Promise<void>;
};

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) throw new Error('useHabits must be used within a HabitsProvider');
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
  const [history, setHistory] = useState<HabitHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
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
      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Error loading completions:', error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('habit_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, [user]);

  const setupNotifications = useCallback(() => {
    if (!notificationManager.isSupported()) return;
    notificationManager.requestPermission().then(permission => {
      if (permission.granted) {
        notificationManager.cancelAllScheduledNotifications();
        habits.forEach(habit => {
          if (habit.reminders_enabled && habit.reminder_time && !isHabitSnoozed(habit.id)) {
            if (habit.browser_notifications)
              scheduleHabitReminder(habit.id, habit.name, habit.reminder_time);
            if (user?.email && habit.email_notifications)
              scheduleEmailReminder(habit.id, habit.name, user.email, habit.reminder_time);
          }
        });
      }
    });
  }, [habits, user?.email]);

  useEffect(() => {
    if (user) {
      loadHabits();
      loadCompletions();
      loadHistory();
      fetchPrebuiltHabits();
    } else {
      setHabits([]);
      setCompletions([]);
      setHistory([]);
      setPrebuiltHabits([]);
      notificationManager.cancelAllScheduledNotifications();
      setLoading(false);
    }
  }, [user, loadHabits, loadCompletions, loadHistory]);

  useEffect(() => {
    if (user && habits.length > 0) setupNotifications();
  }, [habits, user, setupNotifications]);

  // ——— Habit CRUD Functions ——— //
  async function createHabit(habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'target_days'> & { target_days?: number }) {
    if (!user) throw new Error('You must be logged in to create a habit.');
    const trimmedName = habit.name.trim().toLowerCase();
    if (habits.find(h => h.name.trim().toLowerCase() === trimmedName))
      throw new Error('A habit with this name already exists.');
    const { data, error } = await supabase
      .from('habits')
      .insert({
        ...habit,
        user_id: user.id,
        active_days: habit.frequency === 'daily' ? [0,1,2,3,4,5,6] : habit.active_days,
        target_days: 7,
      })
      .select()
      .single();
    if (error) throw error;
    setHabits([data, ...habits]);
    return data;
  }

  async function updateHabit(id: string, updates: Partial<Habit>) {
    if (updates.name) {
      const name = updates.name.trim().toLowerCase();
      if (habits.find(h => h.id !== id && h.name.trim().toLowerCase() === name))
        throw new Error('A habit with this name already exists.');
    }
    if (updates.frequency === 'daily') updates.active_days = [0,1,2,3,4,5,6];
    const { error } = await supabase.from('habits').update(updates).eq('id', id);
    if (error) throw error;
    setHabits(habits.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habits').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    setHabits(habits.filter(h => h.id !== id));
    cancelHabitReminder(id);
  }

  async function toggleCompletion(habitId: string, date: string) {
    if (!user) return;
    const existing = completions.find(c => c.habit_id === habitId && c.completed_date === date);
    if (existing) {
      const { error } = await supabase.from('habit_completions').delete().eq('id', existing.id);
      if (error) throw error;
      setCompletions(completions.filter(c => c.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('habit_completions')
        .insert({ habit_id: habitId, user_id: user.id, completed_date: date })
        .select()
        .single();
      if (error) throw error;
      setCompletions([...completions, data]);
    }
  }

  function isCompleted(habitId: string, date: string): boolean {
    return completions.some(c => c.habit_id === habitId && c.completed_date === date);
  }

  function getStreak(habitId: string): number {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    const activeDays = habit.frequency === 'daily' ? [0,1,2,3,4,5,6] : (habit.active_days || []);
    let streak = 0;
    let current = new Date();
    for (let i = 0; i < 365; i++) {
      const dow = current.getDay();
      if (activeDays.includes(dow)) {
        const dateStr = current.toISOString().split('T')[0];
        if (isCompleted(habitId, dateStr)) streak++;
        else break;
      }
      current.setDate(current.getDate() - 1);
    }
    return streak;
  }

  async function snoozeHabit(habitId: string, durationMinutes: number) {
    const until = new Date();
    until.setMinutes(until.getMinutes() + durationMinutes);
    const { error } = await supabase.from('habits').update({ snoozed_until: until.toISOString(), snooze_duration: durationMinutes }).eq('id', habitId);
    if (error) throw error;
    setHabits(habits.map(h => h.id === habitId ? { ...h, snoozed_until: until.toISOString(), snooze_duration: durationMinutes } : h));
    cancelHabitReminder(habitId);
  }

  async function unsnoozeHabit(habitId: string) {
    const { error } = await supabase.from('habits').update({ snoozed_until: null, snooze_duration: null }).eq('id', habitId);
    if (error) throw error;
    setHabits(habits.map(h => h.id === habitId ? { ...h, snoozed_until: null, snooze_duration: null } : h));
    const habit = habits.find(h => h.id === habitId);
    if (habit && habit.reminders_enabled && habit.reminder_time && habit.browser_notifications)
      scheduleHabitReminder(habit.id, habit.name, habit.reminder_time);
  }

  function isHabitSnoozed(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.snoozed_until) return false;
    return new Date(habit.snoozed_until) > new Date();
  }

  // ——— Prebuilt Habit Functions ——— //
  async function fetchPrebuiltHabits() {
    if (!user) return [];
    const { data, error } = await supabase
      .from('prebuilt_habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setPrebuiltHabits(data || []);
    return data || [];
  }

  async function createPrebuiltHabit(habit: Omit<PrebuiltHabit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) throw new Error('You must be logged in to create a prebuilt habit.');
    const { data, error } = await supabase.from('prebuilt_habits').insert({ ...habit, user_id: user.id }).select().single();
    if (error) throw error;
    setPrebuiltHabits([data, ...prebuiltHabits]);
    return data;
  }

  async function updatePrebuiltHabit(id: string, updates: Partial<PrebuiltHabit>) {
    const { error } = await supabase.from('prebuilt_habits').update(updates).eq('id', id);
    if (error) throw error;
    setPrebuiltHabits(prebuiltHabits.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  async function deletePrebuiltHabit(id: string) {
    const { error } = await supabase.from('prebuilt_habits').delete().eq('id', id);
    if (error) throw error;
    setPrebuiltHabits(prebuiltHabits.filter(h => h.id !== id));
  }

  async function seedDefaultPrebuiltHabits() {
    if (!user) return;
    const { data: existing, error: checkError } = await supabase
      .from('prebuilt_habits')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true);
    if (checkError) throw checkError;
    if (existing && existing.length > 0) return;

    const defaults = [
      { name: 'Drink Water', description: 'Stay hydrated', color: '#3b82f6', icon: '💧', frequency: 'daily' as const, target_days: 7, category: 'Health', is_default: true },
      { name: 'Exercise', description: '30 minutes of physical activity', color: '#ef4444', icon: '💪', frequency: 'daily' as const, target_days: 5, category: 'Fitness', is_default: true },
    ];

    const { data, error } = await supabase.from('prebuilt_habits').insert(defaults.map(h => ({ ...h, user_id: user.id }))).select();
    if (error) throw error;
    setPrebuiltHabits([...data, ...prebuiltHabits]);
  }

  const value: HabitsContextType = {
    habits,
    prebuiltHabits,
    completions,
    history,
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
    loadHistory,
    fetchPrebuiltHabits,
    createPrebuiltHabit,
    updatePrebuiltHabit,
    deletePrebuiltHabit,
    seedDefaultPrebuiltHabits,
  };

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}
