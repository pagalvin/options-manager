import express from 'express';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getNoteTypes,
  addNoteType
} from '../database/note';

const router = express.Router();

// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const { keyDate, symbol, showExpired } = req.query;
    const notes = await getNotes({
      keyDate: keyDate as string | undefined,
      symbol: symbol as string | undefined,
      showExpired: showExpired === 'true',
    });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// GET /api/notes/:id
router.get('/:id', async (req, res) => {
  try {
    const note = await getNoteById(Number(req.params.id));
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const note = await createNote(req.body);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    const note = await updateNote(Number(req.params.id), req.body);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteNote(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// GET /api/note-types
router.get('/types/all', async (req, res) => {
  try {
    const types = await getNoteTypes();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

// POST /api/note-types
router.post('/types', async (req, res) => {
  try {
    const type = await addNoteType(req.body.note_type);
    res.status(201).json({ note_type: type });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

export default router;
