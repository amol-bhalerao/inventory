require('dotenv').config();
const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');

async function testLogin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pavtibook_db'
        });

        // Get the admin user
        const [users] = await connection.execute(`
      SELECT * FROM users WHERE email = 'admin@pavtibook.com'
    `);

        if (users.length > 0) {
            console.log('✅ Admin user found in database');
            const user = users[0];
            console.log('Email:', user.email);
            console.log('Password hash:', user.password_hash);

            // Test password
            const passwordMatches = await bcryptjs.compare('Admin@123', user.password_hash);
            console.log('Password matches:', passwordMatches);
        } else {
            console.log('❌ Admin user not found');
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
