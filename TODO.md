# Habit Tracker - Customizable Prebuilt Habits Implementation

## Overview
Implement customizable prebuilt habits feature allowing users to manage their own set of suggested habits that appear during onboarding.

## Tasks

### 1. Database Migration
- [x] Create new migration file for `prebuilt_habits` table
- [x] Define table schema with fields: id, user_id, name, description, color, icon, frequency, target_days, category, is_default
- [x] Add RLS policies for user data isolation
- [x] Run migration to create table

### 2. Context Updates
- [x] Extend HabitsContext with prebuilt habit CRUD operations
- [x] Add fetchPrebuiltHabits function
- [x] Add createPrebuiltHabit function
- [x] Add updatePrebuiltHabit function
- [x] Add deletePrebuiltHabit function
- [x] Add seedDefaultPrebuiltHabits function

### 3. Onboarding Component
- [x] Modify Onboarding.tsx to fetch prebuilt habits from database
- [x] Implement seeding logic to populate defaults if no prebuilt habits exist
- [x] Update SuggestedHabits component to use fetched data instead of hardcoded array
- [x] Ensure backward compatibility with existing onboarding flow

### 4. Dashboard Management UI
- [x] Add "Manage Prebuilt Habits" button/section in Dashboard
- [x] Create modal or dedicated page for prebuilt habit management
- [x] Display list of current prebuilt habits with edit/delete options
- [x] Add "Add New Prebuilt Habit" functionality

### 5. PrebuiltHabitForm Component
- [x] Create new PrebuiltHabitForm component
- [x] Reuse logic from HabitForm where possible
- [x] Include fields: name, description, color, icon, frequency, target_days, category
- [x] Handle both create and edit modes
- [x] Add form validation

### 6. Testing & Integration
- [x] Test database seeding of default prebuilt habits
- [x] Verify CRUD operations work correctly
- [x] Test onboarding displays fetched prebuilt habits
- [x] Test management UI in dashboard
- [x] Ensure no breaking changes to existing functionality

## Notes
- Prebuilt habits are user-specific and stored in database
- `is_default` field distinguishes seeded habits from user-added ones
- Users can customize, remove, or add to their prebuilt habits list
- Onboarding will show user's personalized prebuilt habits instead of hardcoded ones
