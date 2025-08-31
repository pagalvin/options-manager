import express from 'express';
import { NoteService } from '../services/noteService';

const router = express.Router();
const noteService = new NoteService();

// GET all notes
router.get('/', async (req, res) => {
  try {
    const notes = await noteService.getAllNotes();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).send('Error fetching notes');
  }
});

// GET a single note by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const note = await noteService.getNoteById(id);
    if (note) {
      res.json(note);
    } else {
      res.status(404).send('Note not found');
    }
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).send('Error fetching note');
  }
});

// POST a new note
router.post('/', async (req, res) => {
  try {
    const newNote = await noteService.createNote(req.body);
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).send('Error creating note');
  }
});

// PUT to update a note
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedNote = await noteService.updateNote(id, req.body);
    if (updatedNote) {
      res.json(updatedNote);
    } else {
      res.status(404).send('Note not found');
    }
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).send('Error updating note');
  }
});

// DELETE a note
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await noteService.deleteNote(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).send('Error deleting note');
  }
});

export default router;