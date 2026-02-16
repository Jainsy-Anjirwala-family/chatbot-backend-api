const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: { require: true }
});

const initializeTables = async (client) => {
    // 1. DANGER ZONE: This drops your existing mismatched table.
    // We only want to run this ONCE to clean the slate!
    // await client.query('DROP TABLE IF EXISTS users CASCADE;');
    // console.log('🗑️ Old users table dropped');

    // 2. Create the correct table with the password column included
    const createUsersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await client.query(createUsersTableQuery);
    console.log('✅ New users table created successfully');
};

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('📦 Connected to Neon PostgreSQL Database');
        
        // Run our table reset and initialization
        await initializeTables(client);
        
        client.release();
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1); 
    }
};

module.exports = { pool, connectDB };