// ============================================================
// src/services/exportService.ts
// Full data export — dumps all PGlite tables to JSON
// ============================================================
import { getDB } from '@/lib/db';

const TABLES = [
  'profile', 'stats', 'master_progress', 'tool_progress', 'augment_progress',
  'lifepaths', 'skills', 'tools', 'augments',
  'sessions', 'xp_log',
  'media', 'courses', 'course_sections', 'course_lessons',
  'projects', 'project_milestones', 'certifications',
  'habits', 'habit_logs', 'checkins',
  'planner_entries', 'planner_exceptions',
  'vault_items',
  'sleep_sessions', 'recovery_settings',
  'custom_ingredients',
  'recipes', 'recipe_ingredients', 'recipe_steps',
  'intake_settings', 'intake_logs',
  'resources', 'socials', 'social_logs',
  'goals', 'notes',
];

export async function exportAllData(): Promise<void> {
  const db   = await getDB();
  const dump: Record<string, any[]> = {};

  for (const table of TABLES) {
    try {
      const res = await db.query(`SELECT * FROM ${table};`);
      dump[table] = res.rows;
    } catch {
      dump[table] = []; // table may not exist yet
    }
  }

  const export_data = {
    version:    '1.0',
    exported_at: new Date().toISOString(),
    app:        'UPLINK',
    tables:     dump,
  };

  const json = JSON.stringify(export_data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href     = url;
  a.download = `uplink-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.tables) return { success: false, error: 'Invalid backup file format' };

    const db = await getDB();

    for (const [table, rows] of Object.entries(data.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      if (!TABLES.includes(table)) continue;

      for (const row of rows as Record<string, any>[]) {
        const cols = Object.keys(row);
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'number') return String(v);
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        try {
          await db.exec(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;`
          );
        } catch { /* skip rows that fail */ }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
