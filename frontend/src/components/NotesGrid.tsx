import React, { useEffect, useState } from 'react';
import { Note } from '../types/note';
import { fetchNotes, deleteNote } from '../services/noteService';
import { FinancialLinks } from './FinancialLinks';

interface NotesGridProps {
  onEdit: (note: Note) => void;
  filterSymbol?: string;
}

const NotesGrid: React.FC<NotesGridProps> = ({ onEdit, filterSymbol }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line
  }, [showExpired, filterSymbol]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const notes = await fetchNotes({
        showExpired,
        symbol: filterSymbol,
      });
      setNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this note?')) return;
    await deleteNote(id);
    loadNotes();
  };

  const thClasses = "text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2 bg-gray-50 sticky top-0 z-10";
  const tdClasses = "px-2 py-2 whitespace-nowrap text-sm";

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center mb-4">
        <label className="mr-4 flex items-center">
          <input type="checkbox" checked={showExpired} onChange={e => setShowExpired(e.target.checked)} className="mr-2" /> Show expired notes
        </label>
      </div>
      {loading ? (
        <div className="text-center py-8">Loading notes...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className={thClasses + " left-0 z-20 bg-white"}>Actions</th>
                <th className={thClasses}>Key Date</th>
                <th className={thClasses}>Symbol</th>
                <th className={thClasses}>Note Type</th>
                <th className={thClasses}>Title</th>
                <th className={thClasses}>Body</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {notes.map((note, idx) => (
                <tr key={note.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className={tdClasses + " sticky left-0 z-10 bg-white"}>
                    <button className="text-blue-600 hover:text-blue-800 mr-2 font-medium" onClick={() => onEdit(note)}>Edit</button>
                    <button className="text-red-600 hover:text-red-800 font-medium" onClick={() => handleDelete(note.id)}>Delete</button>
                  </td>
                  <td className={tdClasses}>{note.key_date || ''}</td>
                  <td className={tdClasses + " font-medium text-blue-600"}>
                    {note.symbol ? <span className="inline-flex items-center"><span>{note.symbol}</span><FinancialLinks security={note.symbol} className="ml-2" /></span> : ''}
                  </td>
                  <td className={tdClasses}>{note.note_type}</td>
                  <td className={tdClasses}>{note.title}</td>
                  <td className={tdClasses}>
                    {note.body.length > 60 ? (
                      <span title={note.body}>{note.body.slice(0, 60)}<span className="text-gray-400">...</span></span>
                    ) : (
                      note.body
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NotesGrid;
