import { Note, NoteType } from '../types/note';

export async function fetchNotes(params: { keyDate?: string; symbol?: string; showExpired?: boolean } = {}): Promise<Note[]> {
  const query = new URLSearchParams();
  if (params.keyDate) query.append('keyDate', params.keyDate);
  if (params.symbol) query.append('symbol', params.symbol);
  if (params.showExpired) query.append('showExpired', 'true');
  const res = await fetch(`/api/notes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function fetchNote(id: number): Promise<Note> {
  const res = await fetch(`/api/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

export async function createNote(note: Omit<Note, 'id' | 'date_created' | 'date_modified'>): Promise<Note> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(id: number, note: Partial<Omit<Note, 'id' | 'date_created' | 'date_modified'>>): Promise<Note> {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function deleteNote(id: number): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}

export async function fetchNoteTypes(): Promise<string[]> {
  const res = await fetch('/api/notes/types/all');
  if (!res.ok) throw new Error('Failed to fetch note types');
  return res.json();
}

export async function addNoteType(note_type: string): Promise<string> {
  const res = await fetch('/api/notes/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_type }),
  });
  if (!res.ok) throw new Error('Failed to add note type');
  const data = await res.json();
  return data.note_type;
}
