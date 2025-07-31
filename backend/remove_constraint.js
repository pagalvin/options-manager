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

async function removeUniqueConstraint() {
  const client = await pool.connect();
  try {
    console.log('Removing unique constraint from transactions table...');
    
    await client.query('ALTER TABLE overlord.transactions DROP CONSTRAINT IF EXISTS transactions_unique_key');
    
    console.log('SUCCESS: Unique constraint removed!');
    console.log('You can now delete all transactions before uploading to avoid any duplicate issues.');
    
    console.log('Checking current transaction count...');
    const countResult = await client.query('SELECT COUNT(*) as count FROM overlord.transactions');
    console.log(`Current transaction count: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

removeUniqueConstraint();
