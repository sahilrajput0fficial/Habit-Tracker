/*
  # Habit Tracker Database Schema

  ## Overview
  Complete database schema for a full-featured habit tracking application with user authentication,
  habit management, daily completions, and progress tracking.

  ## New Tables
  
  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text) - User email
  - `full_name` (text) - User's display name
  - `avatar_url` (text, optional) - Profile picture URL
  - `theme` (text) - User preference: 'light' or 'dark'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. `habits`
  Core habits table storing all user habits
  - `id` (uuid, primary key) - Unique habit identifier
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `name` (text) - Habit name/title
  - `description` (text, optional) - Detailed description
  - `color` (text) - Visual identifier color (hex code)
  - `icon` (text, optional) - Lucide icon name
  - `frequency` (text) - Target frequency: 'daily', 'weekly', 'custom'
  - `target_days` (integer) - Target days per week for weekly habits
  - `is_active` (boolean) - Whether habit is currently active
  - `created_at` (timestamptz) - Habit creation timestamp
  - `updated_at` (timestamptz) - Last habit update

  ### 3. `habit_completions`
  Daily check-ins and completion records
  - `id` (uuid, primary key) - Unique completion identifier
  - `habit_id` (uuid, foreign key) - References habits(id)
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `completed_date` (date) - Date of completion
  - `notes` (text, optional) - Optional notes for this completion
  - `created_at` (timestamptz) - Completion timestamp

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:
  - Users can only access their own data
  - All operations (SELECT, INSERT, UPDATE, DELETE) require authentication
  - Policies enforce user_id matching for complete data isolation
  
  ### Indexes
  Performance indexes on frequently queried columns:
  - habit_completions: (user_id, completed_date)
  - habits: (user_id, is_active)
  
  ## Features Supported
  1. User authentication and profiles
  2. Habit CRUD operations
  3. Daily check-ins with completion tracking
  4. Historical data for calendar views
  5. Progress analytics and statistics
  6. Multi-device sync via cloud storage
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'target',
  frequency text DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  target_days integer DEFAULT 7 CHECK (target_days >= 1 AND target_days <= 7),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create habit_completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON habit_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON habit_completions(habit_id, completed_date);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Habits policies
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can view own completions"
  ON habit_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON habit_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON habit_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON habit_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop the old frequency CHECK constraint
ALTER TABLE habits
DROP CONSTRAINT habits_frequency_check;

-- Add new constraint for 'daily' and 'custom'
ALTER TABLE habits
ADD CONSTRAINT habits_frequency_check CHECK (frequency IN ('daily', 'custom'));

-- Add the new active_days column.
-- It's an array of small integers (0-6)
-- We'll default it to all days (daily)
ALTER TABLE habits
ADD COLUMN active_days smallint[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[];

-- (Optional) We don't need the target_days column anymore
-- ALTER TABLE habits DROP COLUMN target_days;

-- Update the RLS policy for 'habits' to include the new column
-- Find your existing "Users can insert own habits" policy and modify it
-- (or drop and re-add)
DROP POLICY "Users can insert own habits" ON habits;
CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    array_length(active_days, 1) BETWEEN 1 AND 7 -- Ensure 1-7 days are selected
  );

-- Find and update the "Users can update own habits" policy
DROP POLICY "Users can update own habits" ON habits;
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    array_length(active_days, 1) BETWEEN 1 AND 7 -- Ensure 1-7 days are selected
  );