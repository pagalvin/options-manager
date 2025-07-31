import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { TransactionService } from '../services/transactionService';
import { UploadedTransaction } from '../types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const transactionService = new TransactionService();

// Upload transactions from CSV
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file.originalname, 'Size:', req.file.size);
    
    const results: UploadedTransaction[] = [];
    const fileContent = req.file.buffer.toString();
    console.log('First 500 characters of file:', fileContent.substring(0, 500));
    
    // Detect separator - check if file contains pipes or commas
    const hasPipes = fileContent.includes('|');
    const hasCommas = fileContent.includes(',');
    const separator = hasPipes ? '|' : ',';
    
    console.log('Detected separator:', separator);
    
    const stream = Readable.from(fileContent);

    stream
      .pipe(csv({ separator }))
      .on('data', (data) => {
        console.log('Raw CSV row:', data);
        
        // Handle different possible column names for eTrade CSV
        const transactionDate = data['TransactionDate'] || data['Transaction Date'] || data['Date'];
        
        // Skip header rows and empty rows
        if (transactionDate && transactionDate !== 'TransactionDate' && transactionDate !== 'Transaction Date' && transactionDate !== 'Date' && transactionDate.trim() !== '') {
          console.log('Processing row:', data);
          results.push({
            'Transaction Date': transactionDate,
            'Transaction Type': data['TransactionType'] || data['Transaction Type'] || data['Type'],
            'Security Type': data['SecurityType'] || data['Security Type'] || data['Instrument'],
            'Calculated Symbol': data['Calculated Symbol'] || data['Symbol'] || data['Ticker'],
            'Symbol': data['Symbol'] || data['Ticker'],
            'Quantity': data['Quantity'] || data['Qty'] || '0',
            'Amount': data['Amount'] || data['Net Amount'] || '0',
            'Price': data['Price'] || data['Unit Price'] || '0',
            'Commission': data['Commission'] || data['Fees'] || '0',
            'Strike': data['Strike'] || data['Strike Price'] || '0',
            'Description': data['Description'] || data['Transaction Description'] || '',
          });
        }
      })
      .on('end', async () => {
        try {
          console.log('CSV parsing complete. Total rows found:', results.length);
          const processedCount = await transactionService.uploadTransactions(results);
          console.log('Processed count:', processedCount);
          res.json({
            message: 'Transactions uploaded successfully',
            totalRows: results.length,
            processedCount,
            skippedCount: results.length - processedCount,
          });
        } catch (error) {
          console.error('Error processing transactions:', error);
          res.status(500).json({ error: 'Error processing transactions' });
        }
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Error parsing CSV file' });
      });
  } catch (error) {
    console.error('Error uploading transactions:', error);
    res.status(500).json({ error: 'Error uploading transactions' });
  }
});

// Create a single transaction manually
router.post('/', async (req, res) => {
  try {
    const transaction = req.body;
    const result = await transactionService.createTransaction(transaction);
    res.json(result);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Error creating transaction' });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = req.body;
    const result = await transactionService.updateTransaction(parseInt(id), transaction);
    res.json(result);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Error updating transaction' });
  }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await transactionService.deleteTransaction(parseInt(id));
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Error deleting transaction' });
  }
});

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await transactionService.getAllTransactions();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Error fetching transactions' });
  }
});

// Get transactions by symbol
router.get('/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const transactions = await transactionService.getTransactionsBySymbol(symbol);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions by symbol:', error);
    res.status(500).json({ error: 'Error fetching transactions by symbol' });
  }
});

// Recalculate positions from all transactions
router.post('/recalculate-positions', async (req, res) => {
  try {
    await transactionService.recalculatePositionsFromTransactions();
    res.json({ message: 'Positions recalculated successfully' });
  } catch (error) {
    console.error('Error recalculating positions:', error);
    res.status(500).json({ error: 'Error recalculating positions' });
  }
});

export default router;
