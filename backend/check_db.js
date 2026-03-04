require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkData() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pavtibook_db'
        });

        console.log('📊 Database Check:\n');

        // Check franchises
        const [franchises] = await connection.execute('SELECT * FROM franchises');
        console.log('Franchises:');
        franchises.forEach(f => console.log(`  - ID: ${f.id}, Name: ${f.name}, Email: ${f.email}`));

        // Check roles
        const [roles] = await connection.execute('SELECT * FROM roles');
        console.log('\nRoles:');
        roles.forEach(r => console.log(`  - ID: ${r.id}, Name: ${r.name}`));

        // Check users
        const [users] = await connection.execute('SELECT id, email, franchise_id, password_hash FROM users');
        console.log('\nUsers:');
        users.forEach(u => console.log(`  - ID: ${u.id}, Email: ${u.email}, Franchise: ${u.franchise_id}, Has Pass: ${!!u.password_hash}`));

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkData();
