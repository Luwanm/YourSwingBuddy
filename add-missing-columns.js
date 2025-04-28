import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use ws
neonConfig.webSocketConstructor = ws;

// Get the database connection from environment variables
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// SQL to add missing columns to the swing_analyses table if they don't exist
async function addMissingColumnsToSwingAnalyses() {
  console.log('Checking for and adding missing columns to swing_analyses table...');

  try {
    // First, check if the columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'swing_analyses' 
      AND (column_name = 'type' OR column_name = 'source')
    `);

    const columnsToAdd = [];
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('type')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'video'`);
    }
    
    if (!existingColumns.includes('source')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'yolo'`);
    }
    
    if (columnsToAdd.length === 0) {
      console.log('No missing columns found, all required columns exist');
      return true;
    }

    // Add the missing columns
    const alterTableQuery = `
      ALTER TABLE swing_analyses
      ${columnsToAdd.join(', ')}
    `;
    
    await pool.query(alterTableQuery);
    console.log('Successfully added missing columns:', columnsToAdd.join(', '));
    return true;
  } catch (error) {
    console.error('Error adding missing columns:', error);
    return false;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migration
addMissingColumnsToSwingAnalyses()
  .then(success => {
    if (success) {
      console.log('Database migration completed successfully');
      process.exit(0);
    } else {
      console.error('Database migration failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error during migration:', err);
    process.exit(1);
  });