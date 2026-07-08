const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function syncDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_password || process.env.DB_PASSWORD,
            multipleStatements: true
        });

        const sqlPath = path.join(__dirname, 'database.sql');
        const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

        console.log("Syncing database schema...");
        await connection.query(sqlQuery);
        console.log("Database schema successfully synced and updated.");
        
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error("Error syncing DB:", error);
        process.exit(1);
    }
}

syncDB();
