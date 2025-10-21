import { useState, useEffect } from 'react';
import { supabase, Habit, HabitCompletion } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useHabits() {
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
  }

  async function loadCompletions() {
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
  }

  async function createHabit(habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) return;

    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setHabits([data, ...habits]);
    return data;
  }

  async function updateHabit(id: string, updates: Partial<Habit>) {
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
    let currentDate = new Date(today);

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

  return {
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
}
