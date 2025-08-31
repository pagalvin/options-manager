import React, { useState, useEffect } from 'react';
import { Note } from '../types/note';
import * as noteService from '../services/noteService';
import { NotesGrid } from '../components/NotesGrid';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/ui/button';

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const fetchedNotes = await noteService.getAllNotes();
    setNotes(fetchedNotes);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleSave = async (note: Note) => {
    if (note.id) {
      await noteService.updateNote(note.id, note);
    } else {
      await noteService.createNote(note);
    }
    loadNotes();
    setIsEditing(false);
    setSelectedNote(null);
  };

  const handleDeleteNote = async (id: number) => {
    await noteService.deleteNote(id);
    loadNotes();
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsEditing(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Notes</h1>
        <Button onClick={handleNewNote}>New Note</Button>
      </div>
      {isEditing ? (
        <NoteEditor
          note={selectedNote}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <NotesGrid
          notes={notes}
          onSelectNote={handleSelectNote}
          onDeleteNote={handleDeleteNote}
        />
      )}
    </div>
  );
};
