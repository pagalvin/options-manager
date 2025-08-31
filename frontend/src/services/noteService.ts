import { Note } from '../types/note';

const API_URL = 'http://localhost:3001/api/notes';

export const getAllNotes = async (): Promise<Note[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch notes');
  }
  return response.json();
};

export const getNoteById = async (id: number): Promise<Note> => {
  const response = await fetch(`${API_URL}/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch note');
  }
  return response.json();
};

export const createNote = async (note: Omit<Note, 'id' | 'date_created' | 'date_modified'>): Promise<Note> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });
  if (!response.ok) {
    throw new Error('Failed to create note');
  }
  return response.json();
};

export const updateNote = async (id: number, note: Partial<Omit<Note, 'id' | 'date_created' | 'date_modified'>>): Promise<Note> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });
  if (!response.ok) {
    throw new Error('Failed to update note');
  }
  return response.json();
};

export const deleteNote = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete note');
  }
};
