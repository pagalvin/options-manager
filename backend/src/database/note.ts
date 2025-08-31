import pool from '../database';
import { Note } from '../types';

export class NoteDB {
  async getAllNotes(): Promise<Note[]> {
    const result = await pool.query('SELECT * FROM overlord.notes ORDER BY date_modified DESC');
    return result.rows;
  }

  async getNoteById(id: number): Promise<Note | null> {
    const result = await pool.query('SELECT * FROM overlord.notes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createNote(note: Omit<Note, 'id' | 'date_created' | 'date_modified'>): Promise<Note> {
    const { key_date, symbol, note_type, title, body } = note;
    const result = await pool.query(
      'INSERT INTO overlord.notes (key_date, symbol, note_type, title, body) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [key_date || null, symbol, note_type, title, body]
    );
    return result.rows[0];
  }

  async updateNote(id: number, note: Partial<Omit<Note, 'id' | 'date_created' | 'date_modified'>>): Promise<Note | null> {
    const { key_date, symbol, note_type, title, body } = note;
    const result = await pool.query(
      'UPDATE overlord.notes SET key_date = $1, symbol = $2, note_type = $3, title = $4, body = $5, date_modified = NOW() WHERE id = $6 RETURNING *',
      [key_date || null, symbol, note_type, title, body, id]
    );
    return result.rows[0] || null;
  }

  async deleteNote(id: number): Promise<void> {
    await pool.query('DELETE FROM overlord.notes WHERE id = $1', [id]);
  }
}
