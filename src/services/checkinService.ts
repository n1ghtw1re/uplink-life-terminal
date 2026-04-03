// src/services/checkinService.ts
import { getDB } from '@/lib/db';
import { awardBonusXP } from './xpService';

export async function getTodayCheckin() {
  const db   = await getDB();
  const today = new Date().toISOString().slice(0, 10);
  const res  = await db.query(
    `SELECT * FROM checkins WHERE checked_date = $1 LIMIT 1;`, [today]
  );
  return res.rows[0] ?? null;
}

export async function getHabits() {
  const db  = await getDB();
  const res = await db.query(
    `SELECT * FROM habits WHERE status = 'ACTIVE' ORDER BY name;`
  );
  return res.rows;
}

export async function getHabitLogsToday() {
  const db    = await getDB();
  const today = new Date().toISOString().slice(0, 10);
  const res   = await db.query(
    `SELECT * FROM habit_logs WHERE logged_for_date = $1;`, [today]
  );
  return res.rows;
}

export async function submitCheckin(params: {
  statsChecked: string[];
  habitIds: string[];
  notes?: string;
}) {
  const db    = await getDB();
  const today = new Date().toISOString().slice(0, 10);
  const id    = crypto.randomUUID();

  // Insert checkin
  await db.query(
    `INSERT INTO checkins (id, checked_date, stats_checked, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (checked_date) DO UPDATE
     SET stats_checked = $3, notes = $4;`,
    [id, today, JSON.stringify(params.statsChecked), params.notes ?? null]
  );

  // Update streak
  await db.exec(`
    UPDATE master_progress
    SET streak = streak + 1,
        last_checkin = '${today}'
    WHERE id = 1;
  `);

  // Log habit completions + award GRIT XP
  for (const habitId of params.habitIds) {
    await db.query(
      `INSERT INTO habit_logs (habit_id, logged_for_date, completed)
       VALUES ($1, $2, true)
       ON CONFLICT (habit_id, logged_for_date) DO UPDATE SET completed = true`,
      [habitId, today]
    );
    // Update habit streak
    await db.exec(
      `UPDATE habits SET current_streak = current_streak + 1 WHERE id = '${habitId}';`
    );
    // Award 10 GRIT XP per habit completion
    await awardBonusXP({
      source: 'habit', sourceId: habitId,
      statKey: 'grit', amount: 10,
      notes: 'Habit completion',
    });
  }

  return { success: true };
}