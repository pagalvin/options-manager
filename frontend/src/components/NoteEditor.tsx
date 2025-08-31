import React, { useEffect, useState } from 'react';
import { Note } from '../types/note';
import { fetchNoteTypes, addNoteType } from '../services/noteService';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';

interface NoteEditorProps {
  note?: Partial<Note>;
  onSave: (note: Partial<Note>) => void;
  onCancel: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note = {}, onSave, onCancel }) => {
  const [title, setTitle] = useState(note.title || '');
  const [body, setBody] = useState(note.body || '');
  const [keyDate, setKeyDate] = useState(note.key_date || '');
  const [symbol, setSymbol] = useState(note.symbol || '');
  const [noteType, setNoteType] = useState(note.note_type || '');
  const [noteTypes, setNoteTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');

  useEffect(() => {
    fetchNoteTypes().then(setNoteTypes);
  }, []);

  const handleAddType = async () => {
    if (newType && !noteTypes.includes(newType)) {
      const added = await addNoteType(newType);
      setNoteTypes([...noteTypes, added]);
      setNoteType(added);
      setNewType('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...note,
      title,
      body,
      key_date: keyDate || undefined,
      symbol: symbol || undefined,
      note_type: noteType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">Title</label>
        <input className="w-full border rounded p-2" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">Note Type</label>
        <div className="flex items-center space-x-2">
          <select className="border rounded p-2" value={noteType} onChange={e => setNoteType(e.target.value)} required>
            <option value="">Select type...</option>
            {noteTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input className="border rounded p-2" placeholder="Add new type" value={newType} onChange={e => setNewType(e.target.value)} />
          <button type="button" className="bg-blue-500 text-white px-2 py-1 rounded" onClick={handleAddType}>Add</button>
        </div>
      </div>
      <div>
        <label className="block font-medium">Key Date (optional)</label>
        <input type="date" className="border rounded p-2" value={keyDate} onChange={e => setKeyDate(e.target.value)} />
      </div>
      <div>
        <label className="block font-medium">Symbol (optional)</label>
        <input className="w-full border rounded p-2" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} maxLength={16} />
      </div>
      <div>
        <label className="block font-medium">Body (Markdown supported)</label>
        <SimpleMDE value={body} onChange={setBody} options={{ spellChecker: false }} />
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
        <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default NoteEditor;
