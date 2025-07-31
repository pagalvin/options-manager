const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA || 'overlord'
});

async function fixDuplicatesAndConstraint() {
  const client = await pool.connect();
  try {
    console.log('Step 1: Finding and removing duplicate transactions...');
    
    // Find duplicates based on the new constraint we want to create
    const duplicateResult = await client.query(`
      WITH duplicates AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY transaction_date, transaction_type, calculated_symbol, quantity, amount, price, description 
            ORDER BY id
          ) as rn
        FROM overlord.transactions
      )
      SELECT id FROM duplicates WHERE rn > 1
    `);
    
    console.log(`Found ${duplicateResult.rows.length} duplicate transactions`);
    
    if (duplicateResult.rows.length > 0) {
      const idsToDelete = duplicateResult.rows.map(row => row.id);
      console.log('Deleting duplicate IDs:', idsToDelete.slice(0, 10), duplicateResult.rows.length > 10 ? '...' : '');
      
      await client.query('DELETE FROM overlord.transactions WHERE id = ANY($1)', [idsToDelete]);
      console.log(`${duplicateResult.rows.length} duplicates removed successfully`);
    }
    
    console.log('Step 2: Dropping old unique constraint if exists...');
    try {
      await client.query('ALTER TABLE overlord.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_date_calculated_symbol_quantity_amount_key');
    } catch (error) {
      console.log('No existing constraint to drop');
    }
    
    console.log('Step 3: Adding new unique constraint with transaction_type...');
    await client.query(`
      ALTER TABLE overlord.transactions 
      ADD CONSTRAINT transactions_unique_key 
      UNIQUE(transaction_date, transaction_type, calculated_symbol, quantity, amount, price, description)
    `);
    
    console.log('SUCCESS: New unique constraint added! This should allow Sold Short transactions to be imported.');
    
    console.log('Step 4: Checking current transaction count...');
    const countResult = await client.query('SELECT COUNT(*) as count FROM overlord.transactions');
    console.log(`Current transaction count: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDuplicatesAndConstraint();
