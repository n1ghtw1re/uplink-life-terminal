// ============================================================
// src/services/noteService.ts
// Service for managing notes
// ============================================================
import { getDB } from '@/lib/db';

export interface Note {
  id: string;
  name:string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class NoteService {
  /**
   * Create a new note
   */
  static async createNote(params: {
    name: string;
    content: string;
  }): Promise<Note> {
    const db = await getDB();
    const now = new Date().toISOString();

    const result = await db.query<Note>(
      `INSERT INTO notes (name, content, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, content, status, created_at, updated_at;`,
      [
        params.name,
        params.content,
        'ACTIVE',
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a note
   */
  static async updateNote(
    noteId: string,
    params: Partial<{
      name: string;
      content: string;
      status: string;
    }>
  ): Promise<Note> {
    const db = await getDB();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(params.name);
    }
    if (params.content !== undefined) {
      updates.push(`content = $${paramIdx++}`);
      values.push(params.content);
    }
    if (params.status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      values.push(params.status);
    }

    updates.push(`updated_at = $${paramIdx++}`);
    values.push(now);

    if (updates.length === 1) {
      // No updates, only updated_at, fetch and return
      const result = await db.query<Note>(
        `SELECT id, name, content, status, created_at, updated_at FROM notes WHERE id = $1;`,
        [noteId]
      );
      return result.rows[0];
    }

    values.push(noteId);
    const result = await db.query<Note>(
      `UPDATE notes
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, name, content, status, created_at, updated_at;`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a note (soft delete)
   */
  static async deleteNote(noteId: string): Promise<void> {
    const db = await getDB();

    await db.exec(
      `UPDATE notes SET status = 'ARCHIVED', updated_at = NOW() WHERE id = '${noteId}';`
    );
  }
}
