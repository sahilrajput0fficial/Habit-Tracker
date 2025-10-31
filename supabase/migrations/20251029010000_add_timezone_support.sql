-- Add timezone support to profiles and UTC storage for reminders

-- Add timezone fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS timezone_manual boolean DEFAULT false;

COMMENT ON COLUMN profiles.timezone IS 'IANA timezone identifier for the user (e.g., America/Los_Angeles)';
COMMENT ON COLUMN profiles.timezone_manual IS 'Whether the user manually set/overrode their timezone';

-- Add a column to store the next reminder run time in UTC
ALTER TABLE habits
ADD COLUMN IF NOT EXISTS next_reminder_at_utc timestamptz;

COMMENT ON COLUMN habits.next_reminder_at_utc IS 'Next scheduled reminder run time in UTC, computed from user local time + timezone';
