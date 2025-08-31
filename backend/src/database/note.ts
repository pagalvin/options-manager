// Note entity and DB helpers
import pool from '../database';

export interface Note {
  id: number;
  date_created: string;
  date_modified: string;
  key_date?: string;
  symbol?: string;
  note_type: string;
  title: string;
  body: string;
}

export async function getNotes({ keyDate, symbol, showExpired }: { keyDate?: string; symbol?: string; showExpired?: boolean }) {
  let query = `SELECT * FROM overlord.notes WHERE 1=1`;
  const params: any[] = [];
  if (keyDate) {
    query += ` AND (key_date >= $1 OR key_date IS NULL)`;
    params.push(keyDate);
  }
  if (symbol) {
    query += ` AND symbol = $${params.length + 1}`;
    params.push(symbol);
  }
  if (!showExpired) {
    query += ` AND (key_date IS NULL OR key_date >= CURRENT_DATE)`;
  }
  query += ` ORDER BY key_date NULLS LAST, date_created DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getNoteById(id: number) {
  const { rows } = await pool.query('SELECT * FROM overlord.notes WHERE id = $1', [id]);
  return rows[0];
}

export async function createNote(note: Omit<Note, 'id' | 'date_created' | 'date_modified'>) {
  const { key_date, symbol, note_type, title, body } = note;
  const { rows } = await pool.query(
    `INSERT INTO overlord.notes (key_date, symbol, note_type, title, body) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [key_date, symbol, note_type, title, body]
  );
  return rows[0];
}

export async function updateNote(id: number, note: Partial<Omit<Note, 'id' | 'date_created' | 'date_modified'>>) {
  const fields = Object.keys(note);
  const values = Object.values(note);
  if (fields.length === 0) return getNoteById(id);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE overlord.notes SET ${setClause}, date_modified = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0];
}

export async function deleteNote(id: number) {
  await pool.query('DELETE FROM overlord.notes WHERE id = $1', [id]);
  return true;
}

export async function getNoteTypes() {
  const { rows } = await pool.query('SELECT note_type FROM overlord.note_types ORDER BY note_type');
  return rows.map(r => r.note_type);
}

export async function addNoteType(note_type: string) {
  const { rows } = await pool.query('INSERT INTO overlord.note_types (note_type) VALUES ($1) ON CONFLICT DO NOTHING RETURNING note_type', [note_type]);
  return rows[0]?.note_type || note_type;
}
