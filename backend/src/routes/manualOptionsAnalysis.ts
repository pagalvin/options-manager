import express from 'express';
import { ManualOptionsAnalysisService } from '../services/manualOptionsAnalysisService';

const router = express.Router();
const manualOptionsAnalysisService = new ManualOptionsAnalysisService();

// Get all manual options analysis entries
router.get('/', async (req, res) => {
  try {
    const entries = await manualOptionsAnalysisService.getAllEntries();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching manual options analysis entries:', error);
    res.status(500).json({ error: 'Error fetching manual options analysis entries' });
  }
});

// Get entries by security symbol
router.get('/security/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const entries = await manualOptionsAnalysisService.getEntriesBySecurity(symbol);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries by security:', error);
    res.status(500).json({ error: 'Error fetching entries by security' });
  }
});

// Get entry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await manualOptionsAnalysisService.getEntryById(parseInt(id));
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error fetching entry by ID:', error);
    res.status(500).json({ error: 'Error fetching entry' });
  }
});

// Create new entry
router.post('/', async (req, res) => {
  try {
    const entryData = req.body;
    
    // Validate required fields
    if (!entryData.security) {
      return res.status(400).json({ error: 'Security symbol is required' });
    }
    
    const newEntry = await manualOptionsAnalysisService.createEntry(entryData);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating manual options analysis entry:', error);
    res.status(500).json({ error: 'Error creating entry' });
  }
});

// Update entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedEntry = await manualOptionsAnalysisService.updateEntry(parseInt(id), updateData);
    
    if (!updatedEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating manual options analysis entry:', error);
    res.status(500).json({ error: 'Error updating entry' });
  }
});

// Delete entry by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await manualOptionsAnalysisService.deleteEntry(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting manual options analysis entry:', error);
    res.status(500).json({ error: 'Error deleting entry' });
  }
});

// Delete all entries for a security
router.delete('/security/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const deletedCount = await manualOptionsAnalysisService.deleteEntriesBySecurity(symbol);
    
    res.json({ 
      message: `Deleted ${deletedCount} entries for security ${symbol}`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error deleting entries by security:', error);
    res.status(500).json({ error: 'Error deleting entries' });
  }
});

export default router;
