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
  frequency: 'daily' | 'custom'; // Updated
  active_days: number[]; // Added
  // target_days: number; // No longer used, but keep for now to avoid breaking DB type
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
  createHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'target_days'> & { target_days?: number }) => Promise<Habit>; // Make target_days optional
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
