// ============================================================
// src/integrations/supabase/client.ts
// Supabase compatibility shim — maps Supabase API to PGlite
// Allows existing components to work without full rewrite
// ============================================================

import { getDB } from '@/lib/db';

// ── Query builder shim ────────────────────────────────────────

class QueryBuilder {
  private _table: string;
  private _conditions: string[] = [];
  private _selectCols: string = '*';
  private _orderCol?: string;
  private _orderAsc: boolean = true;
  private _limitN?: number;
  private _countOnly: boolean = false;
  private _single: boolean = false;

  constructor(table: string) {
    this._table = table;
  }

  select(cols: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this._countOnly = true;
    else this._selectCols = cols;
    return this;
  }

  eq(col: string, val: any) {
    const escaped = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
    this._conditions.push(`${col} = ${escaped}`);
    return this;
  }

  neq(col: string, val: any) {
    const escaped = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
    this._conditions.push(`${col} != ${escaped}`);
    return this;
  }

  in(col: string, vals: any[]) {
    const escaped = vals.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(',');
    this._conditions.push(`${col} IN (${escaped})`);
    return this;
  }

  contains(col: string, val: any) {
    // JSONB array contains — val is an array
    const escaped = `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    this._conditions.push(`${col} @> ${escaped}::jsonb`);
    return this;
  }

  ilike(col: string, val: string) {
    this._conditions.push(`${col} ILIKE '${val.replace(/'/g, "''")}'`);
    return this;
  }

  is(col: string, val: any) {
    this._conditions.push(`${col} IS ${val === null ? 'NULL' : val}`);
    return this;
  }

  not(col: string, op: string, val: any) {
    const escaped = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
    this._conditions.push(`NOT ${col} ${op} ${escaped}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this._limitN = n;
    return this;
  }

  single() {
    this._single = true;
    this._limitN = 1;
    return this;
  }

  private buildWhere() {
    return this._conditions.length > 0
      ? `WHERE ${this._conditions.join(' AND ')}`
      : '';
  }

  async then(resolve: (val: any) => void, reject?: (err: any) => void) {
    try {
      const db = await getDB();
      if (this._countOnly) {
        const res = await db.query(`SELECT COUNT(*) as count FROM ${this._table} ${this.buildWhere()};`);
        resolve({ data: null, error: null, count: Number((res.rows[0] as any)?.count ?? 0) });
        return;
      }
      const order = this._orderCol ? `ORDER BY ${this._orderCol} ${this._orderAsc ? 'ASC' : 'DESC'}` : '';
      const limit = this._limitN ? `LIMIT ${this._limitN}` : '';
      const sql   = `SELECT ${this._selectCols} FROM ${this._table} ${this.buildWhere()} ${order} ${limit};`;
      const res   = await db.query(sql);
      const data  = this._single ? (res.rows[0] ?? null) : res.rows;
      resolve({ data, error: null });
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }
}

// ── Mutation builder ──────────────────────────────────────────

class MutationBuilder {
  private _table: string;
  private _op: 'insert' | 'update' | 'delete' | 'upsert';
  private _data: any;
  private _conditions: string[] = [];
  private _returning: boolean = false;
  private _onConflict?: string;

  constructor(table: string, op: 'insert' | 'update' | 'delete' | 'upsert', data?: any) {
    this._table = table;
    this._op    = op;
    this._data  = data;
  }

  eq(col: string, val: any) {
    const escaped = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
    this._conditions.push(`${col} = ${escaped}`);
    return this;
  }

  select() { this._returning = true; return this; }
  single() { return this; }
  onConflict(col: string) { this._onConflict = col; return this; }

  private escapeVal(v: any): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  async then(resolve: (val: any) => void, reject?: (err: any) => void) {
    try {
      const db  = await getDB();
      const where = this._conditions.length > 0 ? `WHERE ${this._conditions.join(' AND ')}` : '';

      if (this._op === 'delete') {
        await db.exec(`DELETE FROM ${this._table} ${where};`);
        resolve({ data: null, error: null });
        return;
      }

      if (this._op === 'update') {
        const sets = Object.entries(this._data)
          .map(([k, v]) => `${k} = ${this.escapeVal(v)}`)
          .join(', ');
        await db.exec(`UPDATE ${this._table} SET ${sets} ${where};`);
        resolve({ data: null, error: null });
        return;
      }

      // insert / upsert
      const rows = Array.isArray(this._data) ? this._data : [this._data];
      for (const row of rows) {
        const cols = Object.keys(row).join(', ');
        const vals = Object.values(row).map(v => this.escapeVal(v)).join(', ');
        const conflict = this._op === 'upsert' && this._onConflict
          ? `ON CONFLICT (${this._onConflict}) DO UPDATE SET ${Object.keys(row).filter(k => k !== this._onConflict).map(k => `${k} = EXCLUDED.${k}`).join(', ')}`
          : this._op === 'upsert' ? 'ON CONFLICT DO NOTHING' : '';
        await db.exec(`INSERT INTO ${this._table} (${cols}) VALUES (${vals}) ${conflict};`);
      }
      resolve({ data: null, error: null });
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }
}

// ── Auth shim ─────────────────────────────────────────────────

const auth = {
  signOut: async () => { window.location.reload(); },
  getSession: async () => ({ data: { session: { user: { id: 'local' } } } }),
  onAuthStateChange: (cb: any) => {
    cb('SIGNED_IN', { user: { id: 'local' } });
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// ── RPC shim ──────────────────────────────────────────────────

const rpc = async (fn: string, _params?: any) => {
  console.warn(`supabase.rpc('${fn}') called — RPC shim, no-op`);
  return { data: null, error: null };
};

// ── Main export ───────────────────────────────────────────────

export const supabase = {
  auth,
  rpc,
  from: (table: string) => ({
    select: (cols = '*', opts?: any) => new QueryBuilder(table).select(cols, opts),
    insert: (data: any) => new MutationBuilder(table, 'insert', data),
    update: (data: any) => new MutationBuilder(table, 'update', data),
    delete: () => new MutationBuilder(table, 'delete'),
    upsert: (data: any, opts?: any) => new MutationBuilder(table, 'upsert', data),
  }),
};