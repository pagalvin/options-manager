import { NoteDB } from '../database/note';
import { Note } from '../types';

export class NoteService {
  private noteDB: NoteDB;

  constructor() {
    this.noteDB = new NoteDB();
  }

  async getAllNotes(): Promise<Note[]> {
    return await this.noteDB.getAllNotes();
  }

  async getNoteById(id: number): Promise<Note | null> {
    return await this.noteDB.getNoteById(id);
  }

  async createNote(note: Omit<Note, 'id' | 'date_created' | 'date_modified'>): Promise<Note> {
    return await this.noteDB.createNote(note);
  }

  async updateNote(id: number, note: Partial<Omit<Note, 'id' | 'date_created' | 'date_modified'>>): Promise<Note | null> {
    return await this.noteDB.updateNote(id, note);
  }

  async deleteNote(id: number): Promise<void> {
    await this.noteDB.deleteNote(id);
  }
}