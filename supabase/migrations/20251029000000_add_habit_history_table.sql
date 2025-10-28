/*
  # Add Habit History Tracking

  ## Overview
  Creates a new table to track all habit-related actions (create, update, delete) 
  for a comprehensive audit trail and history view.

  ## New Table
  
  ### `habit_history`
  Stores historical records of habit actions
  - `id` (uuid, primary key) - Unique history record identifier
  - `habit_id` (uuid) - References the habit (NOT a foreign key to allow orphaned records)
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `habit_name` (text) - Name of the habit at time of action
  - `action` (text) - Type of action: 'created', 'updated', 'deleted'
  - `changes` (jsonb, optional) - JSON object with changed fields for updates
  - `created_at` (timestamptz) - Timestamp of the action

  ## Security
  
  ### Row Level Security (RLS)
  - Users can only view their own history
  - Only authenticated users can access history
  
  ## Features
  1. Complete audit trail of all habit changes
  2. History view for users to track habit lifecycle
  3. Preserves deleted habit information
*/

-- Create habit_history table
CREATE TABLE IF NOT EXISTS habit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS habit_history_user_id_idx ON habit_history(user_id);
CREATE INDEX IF NOT EXISTS habit_history_created_at_idx ON habit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS habit_history_habit_id_idx ON habit_history(habit_id);

-- Enable Row Level Security
ALTER TABLE habit_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own history"
  ON habit_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON habit_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically log habit creation
CREATE OR REPLACE FUNCTION log_habit_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO habit_history (habit_id, user_id, habit_name, action, changes)
  VALUES (
    NEW.id,
    NEW.user_id,
    NEW.name,
    'created',
    jsonb_build_object(
      'description', NEW.description,
      'color', NEW.color,
      'icon', NEW.icon,
      'frequency', NEW.frequency,
      'target_days', NEW.target_days
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to automatically log habit updates
CREATE OR REPLACE FUNCTION log_habit_update()
RETURNS TRIGGER AS $$
DECLARE
  changes_obj jsonb := '{}';
BEGIN
  -- Only log if is_active is still true (not a soft delete)
  IF NEW.is_active = true THEN
    -- Build changes object for modified fields
    IF OLD.name != NEW.name THEN
      changes_obj := jsonb_set(changes_obj, '{name}', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.description != NEW.description THEN
      changes_obj := jsonb_set(changes_obj, '{description}', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF OLD.color != NEW.color THEN
      changes_obj := jsonb_set(changes_obj, '{color}', jsonb_build_object('old', OLD.color, 'new', NEW.color));
    END IF;
    IF OLD.icon != NEW.icon THEN
      changes_obj := jsonb_set(changes_obj, '{icon}', jsonb_build_object('old', OLD.icon, 'new', NEW.icon));
    END IF;
    IF OLD.frequency != NEW.frequency THEN
      changes_obj := jsonb_set(changes_obj, '{frequency}', jsonb_build_object('old', OLD.frequency, 'new', NEW.frequency));
    END IF;
    IF OLD.target_days != NEW.target_days THEN
      changes_obj := jsonb_set(changes_obj, '{target_days}', jsonb_build_object('old', OLD.target_days, 'new', NEW.target_days));
    END IF;

    -- Only insert if there are actual changes
    IF changes_obj != '{}' THEN
      INSERT INTO habit_history (habit_id, user_id, habit_name, action, changes)
      VALUES (NEW.id, NEW.user_id, NEW.name, 'updated', changes_obj);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to automatically log habit deletion (soft delete)
CREATE OR REPLACE FUNCTION log_habit_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if is_active changed from true to false (soft delete)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    INSERT INTO habit_history (habit_id, user_id, habit_name, action, changes)
    VALUES (
      OLD.id,
      OLD.user_id,
      OLD.name,
      'deleted',
      jsonb_build_object(
        'description', OLD.description,
        'color', OLD.color,
        'icon', OLD.icon,
        'frequency', OLD.frequency,
        'target_days', OLD.target_days
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER habit_creation_trigger
  AFTER INSERT ON habits
  FOR EACH ROW
  EXECUTE FUNCTION log_habit_creation();

CREATE TRIGGER habit_update_trigger
  AFTER UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION log_habit_update();

CREATE TRIGGER habit_deletion_trigger
  AFTER UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION log_habit_deletion();
