-- Create prebuilt_habits table for customizable suggested habits
CREATE TABLE IF NOT EXISTS prebuilt_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'target',
  frequency text DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  target_days integer DEFAULT 7 CHECK (target_days >= 1 AND target_days <= 7),
  category text DEFAULT 'General',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prebuilt_habits_user ON prebuilt_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_prebuilt_habits_user_default ON prebuilt_habits(user_id, is_default);

-- Enable Row Level Security
ALTER TABLE prebuilt_habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own prebuilt habits"
  ON prebuilt_habits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prebuilt habits"
  ON prebuilt_habits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prebuilt habits"
  ON prebuilt_habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prebuilt habits"
  ON prebuilt_habits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_prebuilt_habits_updated_at
  BEFORE UPDATE ON prebuilt_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
