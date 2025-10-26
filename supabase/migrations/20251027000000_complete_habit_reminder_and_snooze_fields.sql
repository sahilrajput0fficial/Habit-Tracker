-- Complete habit reminder and snooze fields migration
-- This combines all reminder and snooze related field additions

-- Add reminder fields to habits table
ALTER TABLE habits
ADD COLUMN reminder_time time,
ADD COLUMN reminders_enabled boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN habits.reminder_time IS 'Time of day to send reminder notifications (HH:MM format)';
COMMENT ON COLUMN habits.reminders_enabled IS 'Whether reminders are enabled for this habit';

-- Add reminder type fields to habits table
ALTER TABLE habits
ADD COLUMN browser_notifications boolean DEFAULT true,
ADD COLUMN email_notifications boolean DEFAULT false;

-- Update existing records to have browser notifications enabled by default
UPDATE habits SET browser_notifications = true WHERE reminders_enabled = true;

-- Add comments for documentation
COMMENT ON COLUMN habits.browser_notifications IS 'Whether browser notifications are enabled for this habit';
COMMENT ON COLUMN habits.email_notifications IS 'Whether email notifications are enabled for this habit';

-- Add snooze fields to habits table
ALTER TABLE habits
ADD COLUMN snoozed_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN snooze_duration INTEGER; -- Duration in minutes

-- Add comment for clarity
COMMENT ON COLUMN habits.snoozed_until IS 'Timestamp until which notifications are snoozed';
COMMENT ON COLUMN habits.snooze_duration IS 'Duration of snooze in minutes';
