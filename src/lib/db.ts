// ============================================================
// src/lib/db.ts
// PGlite — local-first Postgres, persisted to IndexedDB
// Single user, no auth, fully offline
// ============================================================

import { PGlite } from '@electric-sql/pglite';

// ── Singleton ─────────────────────────────────────────────────

let _db: PGlite | null = null;

export async function getDB(): Promise<PGlite> {
  if (_db) return _db;
  // 'idb://' prefix tells PGlite to persist to IndexedDB
  _db = new PGlite('idb://uplink-v2');
  await initSchema(_db);
  return _db;
}

// ── Schema ────────────────────────────────────────────────────

async function initSchema(db: PGlite) {
  await db.exec(`

    CREATE TABLE IF NOT EXISTS profile (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      callsign        TEXT NOT NULL DEFAULT 'OPERATOR',
      display_name    TEXT,
      designation     TEXT,
      avatar          TEXT,
      theme           TEXT NOT NULL DEFAULT 'AMBER',
      custom_class    TEXT,
      birthdate       TEXT,
      location        TEXT,
      origin          TEXT,
      personal_code   TEXT,
      life_goal       TEXT,
      current_focus   TEXT,
      root_access_meaning TEXT,
      before_uplink   TEXT,
      affiliations    TEXT,
      height          TEXT,
      weight          TEXT,
      blood_type      TEXT,
      intel_log       TEXT,
      widget_layout   TEXT,
      active_widgets  TEXT,
      week_start      TEXT NOT NULL DEFAULT 'MONDAY',
      wizard_complete BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO profile (id) VALUES (1) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS stats (
      stat_key    TEXT PRIMARY KEY,
      xp          INTEGER NOT NULL DEFAULT 0,
      level       INTEGER NOT NULL DEFAULT 0,
      streak      INTEGER NOT NULL DEFAULT 0,
      dormant     BOOLEAN NOT NULL DEFAULT FALSE
    );
    INSERT INTO stats (stat_key) VALUES
      ('body'), ('wire'), ('mind'), ('cool'), ('grit'), ('flow'), ('ghost')
    ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS master_progress (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      total_xp    INTEGER NOT NULL DEFAULT 0,
      level       INTEGER NOT NULL DEFAULT 0,
      streak      INTEGER NOT NULL DEFAULT 0,
      shields     INTEGER NOT NULL DEFAULT 0,
      last_checkin TEXT
    );
    INSERT INTO master_progress (id) VALUES (1) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS tool_progress (
      id        INTEGER PRIMARY KEY DEFAULT 1,
      total_xp  INTEGER NOT NULL DEFAULT 0,
      level     INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO tool_progress (id) VALUES (1) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS augment_progress (
      id        INTEGER PRIMARY KEY DEFAULT 1,
      total_xp  INTEGER NOT NULL DEFAULT 0,
      level     INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO augment_progress (id) VALUES (1) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS lifepaths (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT,
      subcategory TEXT,
      active      BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skills (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name          TEXT NOT NULL,
      stat_keys     JSONB NOT NULL DEFAULT '[]',
      default_split JSONB NOT NULL DEFAULT '[100]',
      icon          TEXT NOT NULL DEFAULT 'o',
      xp            INTEGER NOT NULL DEFAULT 0,
      level         INTEGER NOT NULL DEFAULT 0,
      lifepath_id   TEXT,
      subcategory   TEXT,
      is_preset     BOOLEAN NOT NULL DEFAULT FALSE,
      is_custom     BOOLEAN NOT NULL DEFAULT FALSE,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tools (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'software',
      category    TEXT,
      lifepath_id TEXT,
      subcategory TEXT,
      xp          INTEGER NOT NULL DEFAULT 0,
      level       INTEGER NOT NULL DEFAULT 0,
      is_preset   BOOLEAN NOT NULL DEFAULT FALSE,
      is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      url         TEXT,
      description TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tool_lifepaths (
      tool_id     TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      lifepath_id TEXT NOT NULL REFERENCES lifepaths(id) ON DELETE CASCADE,
      PRIMARY KEY (tool_id, lifepath_id)
    );

    CREATE TABLE IF NOT EXISTS augments (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT NOT NULL,
      category    TEXT,
      xp          INTEGER NOT NULL DEFAULT 0,
      level       INTEGER NOT NULL DEFAULT 0,
      is_preset   BOOLEAN NOT NULL DEFAULT FALSE,
      is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      url         TEXT,
      description TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      skill_id          TEXT NOT NULL,
      skill_name        TEXT NOT NULL,
      duration_minutes  INTEGER NOT NULL,
      stat_split        JSONB NOT NULL DEFAULT '[]',
      notes             TEXT,
      is_legacy         BOOLEAN NOT NULL DEFAULT FALSE,
      logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      skill_xp          INTEGER NOT NULL DEFAULT 0,
      stat_xp           JSONB NOT NULL DEFAULT '[]',
      master_xp         INTEGER NOT NULL DEFAULT 0,
      tool_ids          JSONB NOT NULL DEFAULT '[]',
      total_tool_xp     INTEGER NOT NULL DEFAULT 0,
      augment_ids       JSONB NOT NULL DEFAULT '[]',
      total_augment_xp  INTEGER NOT NULL DEFAULT 0,
      course_id         TEXT,
      media_id          TEXT,
      project_id        TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name          TEXT NOT NULL,
      category_id   TEXT NOT NULL,
      quantity_type TEXT NOT NULL,
      description   TEXT,
      primary_stat  TEXT NOT NULL,
      secondary_stat TEXT NOT NULL,
      primary_pct   INTEGER NOT NULL DEFAULT 50,
      secondary_pct INTEGER NOT NULL DEFAULT 50,
      metric_type   TEXT NOT NULL,
      xp            INTEGER NOT NULL DEFAULT 0,
      level         INTEGER NOT NULL DEFAULT 0,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name          TEXT NOT NULL,
      category_id   TEXT NOT NULL,
      description   TEXT,
      primary_stat  TEXT NOT NULL,
      secondary_stat TEXT NOT NULL,
      primary_pct   INTEGER NOT NULL DEFAULT 50,
      secondary_pct INTEGER NOT NULL DEFAULT 50,
      completed_count INTEGER NOT NULL DEFAULT 0,
      active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      workout_id    TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      quantity_label TEXT
    );

    CREATE TABLE IF NOT EXISTS output_logs (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      target_type   TEXT NOT NULL,
      target_id     TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      intensity     INTEGER NOT NULL DEFAULT 5,
      stat_split    JSONB NOT NULL DEFAULT '[]',
      notes         TEXT,
      is_legacy     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS output_log_exercises (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      output_log_id TEXT NOT NULL REFERENCES output_logs(id) ON DELETE CASCADE,
      exercise_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      xp_awarded    INTEGER NOT NULL DEFAULT 0,
      details_json  JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      source      TEXT NOT NULL,
      source_id   TEXT,
      tier        TEXT NOT NULL,
      entity_id   TEXT,
      amount      INTEGER NOT NULL,
      notes       TEXT,
      logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS media (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      type            TEXT NOT NULL,
      title           TEXT NOT NULL,
      creator         TEXT,
      year            INTEGER,
      status          TEXT NOT NULL DEFAULT 'QUEUED',
      linked_stat     TEXT,
      linked_skill_id TEXT,
      rating          INTEGER,
      notes           TEXT,
      is_legacy       BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at    TIMESTAMPTZ,
      pages           INTEGER,
      page_current    INTEGER,
      runtime         INTEGER,
      seasons         INTEGER,
      current_season  INTEGER,
      platform        TEXT,
      issue_count     INTEGER,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name              TEXT NOT NULL,
      provider          TEXT,
      subject           TEXT,
      linked_stats      JSONB NOT NULL DEFAULT '[]',
      default_split     JSONB NOT NULL DEFAULT '[100]',
      linked_skill_ids  JSONB NOT NULL DEFAULT '[]',
      linked_tool_ids   JSONB NOT NULL DEFAULT '[]',
      linked_augment_ids JSONB NOT NULL DEFAULT '[]',
      linked_media_ids  JSONB NOT NULL DEFAULT '[]',
      is_legacy         BOOLEAN NOT NULL DEFAULT FALSE,
      status            TEXT NOT NULL DEFAULT 'QUEUED',
      progress          INTEGER NOT NULL DEFAULT 0,
      cert_earned       BOOLEAN NOT NULL DEFAULT FALSE,
      url               TEXT,
      notes             TEXT,
      is_ongoing        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_sections (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS course_lessons (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      section_id   TEXT NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
      course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'lesson',
      sort_order   INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMPTZ,
      score        REAL,
      passed       BOOLEAN
    );

    CREATE TABLE IF NOT EXISTS projects (
      id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name               TEXT NOT NULL,
      type               TEXT NOT NULL DEFAULT 'other',
      status             TEXT NOT NULL DEFAULT 'ACTIVE',
      description        TEXT,
      linked_skill_ids   JSONB NOT NULL DEFAULT '[]',
      linked_tool_ids    JSONB NOT NULL DEFAULT '[]',
      linked_augment_ids JSONB NOT NULL DEFAULT '[]',
      url                TEXT,
      notes              TEXT,
      completed_at       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_milestones (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      completed_at TIMESTAMPTZ,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name            TEXT NOT NULL,
      issuer          TEXT,
      linked_skill_id TEXT,
      status          TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      issued_at       TIMESTAMPTZ,
      expires_at      TIMESTAMPTZ,
      credential_id   TEXT,
      url             TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


    CREATE TABLE IF NOT EXISTS checkins (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      checked_date  DATE NOT NULL UNIQUE,
      stats_checked JSONB NOT NULL DEFAULT '[]',
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title       TEXT NOT NULL,
      url         TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Misc / Uncategorized',
      tags        JSONB NOT NULL DEFAULT '[]',
      notes       TEXT,
      status      TEXT NOT NULL DEFAULT 'UNREAD',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS socials (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      platform          TEXT NOT NULL,
      account_name      TEXT NOT NULL,
      url               TEXT,
      category          TEXT,
      status            TEXT NOT NULL DEFAULT 'ACTIVE',
      initial_followers INTEGER,
      notes             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS social_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      social_id   TEXT NOT NULL REFERENCES socials(id) ON DELETE CASCADE,
      followers   INTEGER NOT NULL,
      logged_date DATE NOT NULL,
      notes       TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title        TEXT NOT NULL,
      tier         TEXT NOT NULL DEFAULT 'sprint',
      parent_id    TEXT REFERENCES goals(id),
      description  TEXT,
      deadline     TIMESTAMPTZ,
      status       TEXT NOT NULL DEFAULT 'ACTIVE',
      progress     INTEGER NOT NULL DEFAULT 0,
      notes        TEXT,
      completed_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'ACTIVE',
      tags       JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);

CREATE TABLE IF NOT EXISTS background_records (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      organization TEXT NOT NULL,
      date_str     TEXT NOT NULL,
      description  TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bg_records_type ON background_records(type);
  `);

  // ── Migrations — batched for startup performance ─────────────────────────
  // All ALTER TABLE calls use IF NOT EXISTS — fully idempotent, safe every boot.
  // Statements with data dependencies (e.g. fill nulls before SET NOT NULL)
  // are kept in separate sequential batches.

  // ── Batch 1: profile, lifepaths, courses, projects, sessions, resources ──
  await db.exec(`
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS avatar TEXT;
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS height TEXT;
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS weight TEXT;
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS blood_type TEXT;
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS intel_log TEXT;
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS week_start TEXT DEFAULT 'MONDAY';
    ALTER TABLE profile ADD COLUMN IF NOT EXISTS habit_cutoff_time TEXT DEFAULT '06:00';
    ALTER TABLE lifepaths ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS linked_media_ids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_media_ids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_course_ids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_ids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE resources ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE resources ALTER COLUMN url DROP NOT NULL;
  `);

  // ── Batch 2: notes — add columns, fill nulls, then set constraints ───────
  await db.exec(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS status TEXT;
  `);
  await db.exec(`
    UPDATE notes SET name = 'Untitled' WHERE name IS NULL OR name = '';
    UPDATE notes SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
  `);
  await db.exec(`
    ALTER TABLE notes ALTER COLUMN name SET NOT NULL;
    ALTER TABLE notes ALTER COLUMN status SET NOT NULL;
    ALTER TABLE notes ALTER COLUMN status SET DEFAULT 'ACTIVE';
  `);

  // ── Batch 3: level floor resets ──────────────────────────────────────────
  await db.exec(`
    UPDATE master_progress SET level = 0 WHERE total_xp = 0;
    UPDATE tool_progress    SET level = 0 WHERE total_xp = 0;
    UPDATE augment_progress SET level = 0 WHERE total_xp = 0;
    UPDATE skills           SET level = 0 WHERE xp = 0;
    UPDATE stats            SET level = 0 WHERE xp = 0;
    UPDATE tools            SET level = 0 WHERE xp = 0;
    UPDATE augments         SET level = 0 WHERE xp = 0;
  `);

  // ── Batch 4: habits table + all habit column migrations ──────────────────
  await db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name            TEXT NOT NULL,
      stat_key        TEXT NOT NULL,
      frequency_type  TEXT NOT NULL DEFAULT 'DAILY',
      interval_days   INTEGER,
      specific_days   JSONB,
      target_type     TEXT NOT NULL DEFAULT 'BINARY',
      target_value    INTEGER,
      target_period_days INTEGER DEFAULT 7,
      reminder_time   TEXT,
      streak_goal     INTEGER,
      streak_reward   INTEGER NOT NULL DEFAULT 100,
      shields         INTEGER NOT NULL DEFAULT 0,
      current_streak  INTEGER NOT NULL DEFAULT 0,
      longest_streak  INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'ACTIVE',
      paused_until    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS stat_key TEXT;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS frequency_type TEXT DEFAULT 'DAILY';
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS interval_days INTEGER;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS specific_days JSONB;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'BINARY';
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS target_value INTEGER;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS target_period_days INTEGER DEFAULT 7;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_time TEXT;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS streak_goal INTEGER;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS streak_reward INTEGER DEFAULT 100;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS shields INTEGER DEFAULT 0;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;
    ALTER TABLE habits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);

  // ── Batch 5: habit_logs — add columns, fill data, set constraint ─────────
  await db.exec(`
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS habit_id TEXT;
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS logged_for_date TEXT;
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS value INTEGER;
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS logged_date DATE;
  `);
  await db.exec(
    `UPDATE habit_logs SET logged_date = logged_for_date::date WHERE logged_date IS NULL`
  );
  try {
    await db.exec(`ALTER TABLE habit_logs ALTER COLUMN logged_date SET NOT NULL`);
  } catch (e) {
    // May fail if there is still null data — non-fatal
  }
  try {
    await db.exec(`
      UPDATE habits SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
      UPDATE habits SET frequency_type = 'DAILY' WHERE frequency_type IS NULL OR frequency_type = '';
      UPDATE habits SET target_type = 'BINARY' WHERE target_type IS NULL OR target_type = '';
    `);
  } catch (e) {
    console.warn('// HABIT_MIGRATION_WARN:', e);
  }

  // ── Batch 6: planner entries + exceptions ────────────────────────────────
  await db.exec(`
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS date DATE;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS time TEXT;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'NONE';
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_days_of_week JSONB;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_end_type TEXT;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE planner_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS entry_id TEXT;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS occurrence_date DATE;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS date DATE;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS time TEXT;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS completed BOOLEAN;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE planner_exceptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);

  // ── Batch 7: vault, sleep, recovery ──────────────────────────────────────
  await db.exec(`
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS completed_date DATE;
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS metadata JSONB;
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS quality INTEGER;
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE recovery_settings ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 480;
  `);

  // ── Batch 8: ingredients, recipes, intake ────────────────────────────────
  await db.exec(`
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS calories REAL;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS protein_g REAL;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS carbs_g REAL;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS fat_g REAL;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE custom_ingredients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_prepared_meal BOOLEAN DEFAULT FALSE;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 1;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_calories REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_protein_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_carbs_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_fat_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS per_serving_calories REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS per_serving_protein_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS per_serving_carbs_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS per_serving_fat_g REAL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS recipe_id TEXT;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_id TEXT;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_name TEXT;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_source TEXT;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS input_text TEXT;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS grams REAL;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS calories_total REAL DEFAULT 0;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS protein_g_total REAL DEFAULT 0;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS carbs_g_total REAL DEFAULT 0;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS fat_g_total REAL DEFAULT 0;
    ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS recipe_id TEXT;
    ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;
    ALTER TABLE recipe_steps ADD COLUMN IF NOT EXISTS instruction_text TEXT;
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER DEFAULT 2000;
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS protein_percent INTEGER DEFAULT 40;
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS carbs_percent INTEGER DEFAULT 30;
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS fat_percent INTEGER DEFAULT 30;
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE intake_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS anchor_date DATE;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS meal_label TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS source_kind TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS source_id TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS source_name TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS source_origin TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS grams REAL;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS servings REAL;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS input_text TEXT;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS calories REAL DEFAULT 0;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS protein_g REAL DEFAULT 0;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS carbs_g REAL DEFAULT 0;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS fat_g REAL DEFAULT 0;
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE intake_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);

  // ── Batch 9: Performance Indexes ─────────────────────────────────────────
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habits_status ON habits(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_logged_at ON sessions(logged_at);
    CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
    CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
    CREATE INDEX IF NOT EXISTS idx_workouts_name ON workouts(name);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_output_logs_created_at ON output_logs(created_at);
  `);

  await db.exec(`
    ALTER TABLE output_log_exercises ADD COLUMN IF NOT EXISTS details_json JSONB NOT NULL DEFAULT '{}';
  `);

  await db.exec(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS quantity_type TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_stat TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_stat TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_pct INTEGER DEFAULT 50;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_pct INTEGER DEFAULT 50;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS metric_type TEXT;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);

  await db.exec(`
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS primary_stat TEXT;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS secondary_stat TEXT;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS primary_pct INTEGER DEFAULT 50;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS secondary_pct INTEGER DEFAULT 50;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS quantity_label TEXT;
  `);

  // ── Batch 10: background_records sort_order ──────────────────────────────
  await db.exec(`
    ALTER TABLE background_records ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_bg_records_sort ON background_records(type, sort_order);
  `);

  // ── Batch 11: fix old terminal session xp_log entries ───────────────────
  // Old terminal logs had mismatched session IDs between sessions and xp_log
  // This migration rebuilds xp_log entries from session data
  try {
    // Clear old session xp_log entries
    await db.exec(`DELETE FROM xp_log WHERE source = 'session';`);
    
    // Insert skill XP entries
    await db.exec(`
      INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
      SELECT 
        gen_random_uuid()::text,
        'session',
        s.id,
        'skill',
        s.skill_id,
        s.skill_xp,
        s.skill_name,
        s.logged_at
      FROM sessions s WHERE s.skill_xp > 0;
    `);
    
    // Insert master XP entries
    await db.exec(`
      INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
      SELECT 
        gen_random_uuid()::text,
        'session',
        s.id,
        'master',
        'master',
        s.master_xp,
        s.skill_name,
        s.logged_at
      FROM sessions s WHERE s.master_xp > 0;
    `);
    
    // Insert tool XP entries
    await db.exec(`
      INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
      SELECT 
        gen_random_uuid()::text,
        'session',
        s.id,
        'tool',
        tool_id,
        s.total_tool_xp / CASE WHEN jsonb_array_length(s.tool_ids) = 0 THEN 1 ELSE jsonb_array_length(s.tool_ids) END,
        s.skill_name,
        s.logged_at
      FROM sessions s, jsonb_array_elements_text(s.tool_ids) AS tool_id
      WHERE s.total_tool_xp > 0;
    `);
    
    // Insert augment XP entries
    await db.exec(`
      INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
      SELECT 
        gen_random_uuid()::text,
        'session',
        s.id,
        'augment',
        aug_id,
        s.total_augment_xp / CASE WHEN jsonb_array_length(s.augment_ids) = 0 THEN 1 ELSE jsonb_array_length(s.augment_ids) END,
        s.skill_name,
        s.logged_at
      FROM sessions s, jsonb_array_elements_text(s.augment_ids) AS aug_id
      WHERE s.total_augment_xp > 0;
    `);
    
    // Insert stat XP entries from JSONB stat_xp column
    await db.exec(`
      INSERT INTO xp_log (id, source, source_id, tier, entity_id, amount, notes, logged_at)
      SELECT 
        gen_random_uuid()::text,
        'session',
        s.id,
        'stat',
        stat_entry->>'stat',
        (stat_entry->>'amount')::int,
        s.skill_name,
        s.logged_at
      FROM sessions s,
        jsonb_array_elements(s.stat_xp) AS stat_entry
      WHERE s.stat_xp IS NOT NULL 
        AND jsonb_typeof(s.stat_xp) = 'array'
        AND (stat_entry->>'amount')::int > 0;
    `);
  } catch (e) {
    console.error('Migration batch 11 failed:', e);
  }
}
