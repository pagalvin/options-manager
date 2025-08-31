import React, { useState } from 'react';
import NotesGrid from '../components/NotesGrid';
import NoteEditor from '../components/NoteEditor';
import { Note } from '../types/note';
import { createNote, updateNote } from '../services/noteService';

const NotesPage: React.FC = () => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState('');

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  const handleSave = async (note: Partial<Note>) => {
    if (note.id) {
      await updateNote(note.id, note);
    } else {
      await createNote(note as any);
    }
    setShowEditor(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleNew}>New Note</button>
        <input
          className="border rounded p-2"
          placeholder="Filter by symbol"
          value={filterSymbol}
          onChange={e => setFilterSymbol(e.target.value.toUpperCase())}
        />
      </div>
      {showEditor ? (
        <NoteEditor note={editingNote || undefined} onSave={handleSave} onCancel={handleCancel} />
      ) : (
        <NotesGrid onEdit={handleEdit} filterSymbol={filterSymbol} />
      )}
    </div>
  );
};

export default NotesPage;
