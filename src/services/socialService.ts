// ============================================================
// src/services/socialService.ts
// Service for managing social accounts and follower logs
// ============================================================
import { getDB } from '@/lib/db';
import type { Social, SocialLog } from '@/hooks/useSocials';

export class SocialService {
  /**
   * Create a new social account
   */
  static async createSocial(params: {
    platform: string;
    account_name: string;
    url?: string;
    category?: string;
    initial_followers?: number;
    notes?: string;
  }): Promise<Social> {
    const db = await getDB();

    const result = await db.query<Social>(
      `INSERT INTO socials (platform, account_name, url, category, status, initial_followers, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, platform, account_name, url, category, status, initial_followers, notes, created_at;`,
      [
        params.platform,
        params.account_name,
        params.url || null,
        params.category || null,
        'ACTIVE',
        params.initial_followers || null,
        params.notes || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a social account
   */
  static async updateSocial(
    socialId: string,
    params: Partial<{
      account_name: string;
      url: string;
      category: string;
      notes: string;
      initial_followers: number;
    }>
  ): Promise<Social> {
    const db = await getDB();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.account_name !== undefined) {
      updates.push(`account_name = $${paramIdx++}`);
      values.push(params.account_name);
    }
    if (params.url !== undefined) {
      updates.push(`url = $${paramIdx++}`);
      values.push(params.url);
    }
    if (params.category !== undefined) {
      updates.push(`category = $${paramIdx++}`);
      values.push(params.category);
    }
    if (params.notes !== undefined) {
      updates.push(`notes = $${paramIdx++}`);
      values.push(params.notes);
    }
    if (params.initial_followers !== undefined) {
      updates.push(`initial_followers = $${paramIdx++}`);
      values.push(params.initial_followers);
    }

    if (updates.length === 0) {
      // No updates, fetch and return
      const result = await db.query<Social>(
        `SELECT id, platform, account_name, url, category, status, initial_followers, notes, created_at
         FROM socials WHERE id = $1;`,
        [socialId]
      );
      return result.rows[0];
    }

    values.push(socialId);
    const result = await db.query<Social>(
      `UPDATE socials
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, platform, account_name, url, category, status, initial_followers, notes, created_at;`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a social account (soft delete)
   */
  static async deleteSocial(socialId: string): Promise<void> {
    const db = await getDB();

    await db.exec(
      `UPDATE socials SET status = 'DELETED' WHERE id = '${socialId}';`
    );
  }

  /**
   * Add a follower log entry for a social account
   */
  static async addFollowerLog(params: {
    social_id: string;
    followers: number;
    logged_date: string;
    notes?: string;
  }): Promise<SocialLog> {
    const db = await getDB();

    const result = await db.query<SocialLog>(
      `INSERT INTO social_logs (social_id, followers, logged_date, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, social_id, followers, logged_date, notes;`,
      [
        params.social_id,
        params.followers,
        params.logged_date,
        params.notes || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a follower log entry
   */
  static async updateFollowerLog(
    logId: string,
    params: {
      followers?: number;
      logged_date?: string;
      notes?: string;
    }
  ): Promise<SocialLog> {
    const db = await getDB();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.followers !== undefined) {
      updates.push(`followers = $${paramIdx++}`);
      values.push(params.followers);
    }
    if (params.logged_date !== undefined) {
      updates.push(`logged_date = $${paramIdx++}`);
      values.push(params.logged_date);
    }
    if (params.notes !== undefined) {
      updates.push(`notes = $${paramIdx++}`);
      values.push(params.notes);
    }

    if (updates.length === 0) {
      // No updates, fetch and return
      const result = await db.query<SocialLog>(
        `SELECT id, social_id, followers, logged_date, notes FROM social_logs WHERE id = $1;`,
        [logId]
      );
      return result.rows[0];
    }

    values.push(logId);
    const result = await db.query<SocialLog>(
      `UPDATE social_logs
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, social_id, followers, logged_date, notes;`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a follower log entry
   */
  static async deleteFollowerLog(logId: string): Promise<void> {
    const db = await getDB();

    await db.exec(`DELETE FROM social_logs WHERE id = '${logId}';`);
  }
}
