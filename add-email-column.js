import { pool } from './server/db.js';

async function addEmailColumn() {
  try {
    console.log("Connecting to the database...");
    const client = await pool.connect();
    
    try {
      // First check if the column already exists
      const checkColumnSQL = `
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email';
      `;
      
      const checkResult = await client.query(checkColumnSQL);
      
      if (checkResult.rows.length === 0) {
        console.log("Adding email column to users table...");
        
        // Add the email column if it doesn't exist
        await client.query(`ALTER TABLE users ADD COLUMN email TEXT;`);
        console.log("Email column added successfully.");
        
        // Temporarily drop the unique constraint if it exists
        try {
          await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;`);
        } catch (err) {
          console.log("No unique constraint to drop.");
        }
        
        // Update existing users with default emails based on their usernames
        console.log("Adding default emails to existing users...");
        await client.query(`
          UPDATE users 
          SET email = CONCAT(username, '@example.com') 
          WHERE email IS NULL;
        `);
        
        // Make the email column NOT NULL
        console.log("Making email column NOT NULL...");
        await client.query(`ALTER TABLE users ALTER COLUMN email SET NOT NULL;`);
        
        // Add a unique constraint
        console.log("Adding unique constraint on email...");
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);`);
        
        console.log("Migration completed successfully!");
      } else {
        console.log("Email column already exists in users table.");
      }
    } finally {
      client.release();
    }
    
    console.log("Migration finished.");
    process.exit(0);
  } catch (err) {
    console.error("Error during migration:", err);
    process.exit(1);
  }
}

addEmailColumn();