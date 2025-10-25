import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'weekly' | 'custom';
  target_days: number;
  is_active: boolean;
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
  completions: HabitCompletion[];
  loading: boolean;
  createHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreak: (habitId: string) => number;
  refreshHabits: () => Promise<void>;
  refreshCompletions: () => Promise<void>;
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
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHabits();
      loadCompletions();
    } else {
      setHabits([]);
      setCompletions([]);
      setLoading(false);
    }
  }, [user]);

  async function loadHabits() {
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
  }

  async function loadCompletions() {
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
  }

  async function createHabit(habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
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
        .insert({ ...habit, user_id: user.id })
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
    const today = new Date();
    let streak = 0;
    const currentDate = new Date(today);

    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (isCompleted(habitId, dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  const value: HabitsContextType = {
    habits,
    completions,
    loading,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    getStreak,
    refreshHabits: loadHabits,
    refreshCompletions: loadCompletions,
  };

  return (
    <HabitsContext.Provider value={value}>
      {children}
    </HabitsContext.Provider>
  );
}
