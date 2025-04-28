import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

// Configure Neon to use ws
neonConfig.webSocketConstructor = ws;

// Get the database connection from environment variables
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createCreatorUser() {
  try {
    // Fixed credentials for the creator user
    const email = "creator@golfbuddy.com";
    const username = "creator";
    const password = "creator123"; // Simple password for testing
    const role = "creator";
    
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('User already exists. Here are the details:');
      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Role: ${role}`);
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert the new user
    const insertResult = await pool.query(
      'INSERT INTO users (email, username, password, role, analyses_used_this_month, last_analysis_month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [email, username, hashedPassword, role, 0, new Date().getMonth() + 1]
    );
    
    console.log('Creator user created successfully:');
    console.log(`ID: ${insertResult.rows[0].id}`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    
  } catch (error) {
    console.error('Error creating creator user:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
createCreatorUser();