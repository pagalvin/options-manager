import React, { useState, useEffect } from 'react';
import { Note } from '../types/note';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface NoteEditorProps {
  note: Note | null;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState('');
  const [symbol, setSymbol] = useState('');
  const [keyDate, setKeyDate] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setNoteType(note.note_type);
      setSymbol(note.symbol || '');
      setKeyDate(note.key_date ? new Date(note.key_date).toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setBody('');
      setNoteType('');
      setSymbol('');
      setKeyDate('');
    }
  }, [note]);

  const handleSave = () => {
    const savedNote = {
      ...note,
      title,
      body,
      note_type: noteType,
      symbol,
      key_date: keyDate,
    } as Note;

    onSave(savedNote);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{note ? 'Edit Note' : 'New Note'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Input
          placeholder="Note Type"
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
        />
        <Input
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <Input
          type="date"
          value={keyDate}
          onChange={(e) => setKeyDate(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
};
