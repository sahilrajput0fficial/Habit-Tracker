# 🧩 RESETUP GUIDE — Supabase Database

This guide explains how to correctly re-run the Supabase database setup when a **new migration file** has been added on top of the existing one.

---

## ⚙️ 1. Background

- The project originally had **one main migration file** located in `supabase/migrations/`.
- A **new migration file** has now been created for an additional feature.(`supabase/migrations/20251027000000_complete_habit_reminder_and_snooze_fields.sql`)
- The goal is to **keep all existing migrations** while ensuring the new migration runs properly.

---

## 🧱METHOD 1

Make sure Supabase CLI is installed and up to date:
```bash
supabase --version
Simply start your local Supabase environment and run all pending migrations:
```

# Start Supabase locally (if not running)
supabase start

# Apply all migrations in order
supabase migration up
This command: Runs all unapplied migrations in the supabase/migrations/ folder.


Once migrations complete, confirm the new schema or table is visible:
```bash
supabase studio
```


## 🧱METHOD 2
# directly copy the code from the migration file and run in supabase sql editor 
20251027000000_complete_habit_reminder_and_snooze_fields.sql