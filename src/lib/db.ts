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
      widget_layout   TEXT,
      active_widgets  TEXT,
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

    CREATE TABLE IF NOT EXISTS habits (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name            TEXT NOT NULL,
      category        TEXT,
      frequency       TEXT NOT NULL DEFAULT 'daily',
      frequency_days  JSONB,
      stat_primary    TEXT NOT NULL DEFAULT 'grit',
      stat_secondary  TEXT,
      active          BOOLEAN NOT NULL DEFAULT TRUE,
      streak          INTEGER NOT NULL DEFAULT 0,
      shields         INTEGER NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      logged_date DATE NOT NULL,
      completed   BOOLEAN NOT NULL DEFAULT TRUE
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

    CREATE INDEX IF NOT EXISTS idx_sessions_skill  ON sessions(skill_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date   ON sessions(logged_at);
    CREATE INDEX IF NOT EXISTS idx_xp_log_tier     ON xp_log(tier);
    CREATE INDEX IF NOT EXISTS idx_xp_log_entity   ON xp_log(entity_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(logged_date);
    CREATE INDEX IF NOT EXISTS idx_checkins_date   ON checkins(checked_date);

  `);

  // ── Migrations — safe to run repeatedly ─────────────────────────────────
  // ALTER TABLE with IF NOT EXISTS is idempotent — safe on every boot
  await db.exec(
    `ALTER TABLE lifepaths ADD COLUMN IF NOT EXISTS description TEXT`
  );
  await db.exec(
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS linked_media_ids JSONB NOT NULL DEFAULT '[]'`
  );
  await db.exec(
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await db.exec(
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`
  );
  await db.exec(
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_media_ids JSONB NOT NULL DEFAULT '[]'`
  );
  await db.exec(
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_course_ids JSONB NOT NULL DEFAULT '[]'`
  );
  await db.exec(
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_ids JSONB NOT NULL DEFAULT '[]'`
  );
  await db.exec(
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS name TEXT`
  );
  await db.exec(
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS status TEXT`
  );
  // Update existing rows that don't have name/status
  await db.exec(
    `UPDATE notes SET name = 'Untitled' WHERE name IS NULL OR name = ''`
  );
  await db.exec(
    `UPDATE notes SET status = 'ACTIVE' WHERE status IS NULL OR status = ''`
  );
  // Now make them NOT NULL
  await db.exec(
    `ALTER TABLE notes ALTER COLUMN name SET NOT NULL`
  );
  await db.exec(
    `ALTER TABLE notes ALTER COLUMN status SET NOT NULL`
  );
  await db.exec(
    `ALTER TABLE notes ALTER COLUMN status SET DEFAULT 'ACTIVE'`
  );
  // Reset level floors to 0 for new level system (safe — only resets if XP is 0)
  await db.exec(`
    UPDATE master_progress SET level = 0 WHERE total_xp = 0;
    UPDATE tool_progress    SET level = 0 WHERE total_xp = 0;
    UPDATE augment_progress SET level = 0 WHERE total_xp = 0;
    UPDATE skills           SET level = 0 WHERE xp = 0;
    UPDATE stats            SET level = 0 WHERE xp = 0;
    UPDATE tools            SET level = 0 WHERE xp = 0;
    UPDATE augments         SET level = 0 WHERE xp = 0;
  `);
}
