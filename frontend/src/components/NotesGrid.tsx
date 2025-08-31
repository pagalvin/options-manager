import React from 'react';
import { Note } from '../types/note';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface NotesGridProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: number) => void;
}

export const NotesGrid: React.FC<NotesGridProps> = ({ notes, onSelectNote, onDeleteNote }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Card key={note.id}>
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">{note.note_type}</p>
            <p className="text-sm text-gray-500">{note.symbol}</p>
            <p className="mt-2">{note.body.substring(0, 100)}...</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-xs text-gray-400">{new Date(note.date_modified).toLocaleDateString()}</p>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => onSelectNote(note)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => onDeleteNote(note.id)}>Delete</Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
