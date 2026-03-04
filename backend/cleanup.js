require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pavtibook_db'
    });

    await connection.execute("DELETE FROM users WHERE email = 'admin@pavtibook.com'");
    console.log('Cleaned up admin user');

    await connection.end();
}

cleanup();
