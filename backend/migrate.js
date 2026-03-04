#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pavtibook_db'
};

async function runMigrations() {
    let connection;
    try {
        console.log('🚀 Starting database migrations...\n');

        // Connect to MySQL server first (without database)
        const tempConnection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password || undefined
        });

        // Create database if it doesn't exist
        console.log(`📁 Creating database "${dbConfig.database}" if it doesn't exist...`);
        await tempConnection.execute(
            `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
       DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await tempConnection.end();
        console.log('✅ Database created or already exists.\n');

        // Now connect to the specific database
        connection = await mysql.createConnection(dbConfig);

        // Read and execute all migration files in order
        const migrationsDir = path.join(__dirname, 'src/database/migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort alphabetically to ensure correct order (001_, 002_, etc.)

        for (const migrationFile of migrationFiles) {
            const migrationPath = path.join(migrationsDir, migrationFile);
            console.log(`📂 Processing migration: ${migrationFile}\n`);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            // Split SQL statements by semicolon and execute each one
            const statements = migrationSQL.split(';');
            for (let statement of statements) {
                statement = statement.trim();
                if (statement.length === 0) continue;

                try {
                    console.log(`⏳ Executing: ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
                    await connection.execute(statement);
                } catch (error) {
                    // Ignore "table already exists", "column already exists", and duplicate key warnings
                    if (error.errno === 1050 || error.errno === 1051 || error.errno === 1060) {
                        console.log('⚠️  Table or column already exists - skipping');
                    } else if (error.errno === 1062) {
                        console.log('⚠️  Duplicate entry - skipping');
                    } else {
                        throw error;
                    }
                }
            }
            console.log(`✅ Migration ${migrationFile} completed\n`);
        }

        console.log('\n✅ All database migrations completed successfully!\n');

        // Add seed data
        console.log('🌱 Adding seed data...\n');

        // Check if roles already exist
        const [roles] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        if (roles[0].count === 0) {
            console.log('📝 Inserting default roles...');
            await connection.execute(`
        INSERT INTO roles (id, name, description, is_system_role) VALUES
        (1, 'Super Admin', 'Global system administrator', 1),
        (2, 'Franchise Owner', 'Franchise owner with full control', 1),
        (3, 'Manager', 'Manager with limited control', 0),
        (4, 'Staff', 'Regular staff member', 0)
      `);
            console.log('✅ Roles inserted');
        } else {
            console.log('⚠️  Roles already exist - skipping');
        }

        // Check if default franchise exists
        const [franchises] = await connection.execute(`
      SELECT COUNT(*) as count FROM franchises WHERE email = 'admin@pavtibook.com'
    `);

        if (franchises[0].count === 0) {
            console.log('📝 Inserting default franchise...');
            await connection.execute(`
        INSERT INTO franchises (name, app_name, email, phone, address, city, state, country, postal_code, status, subscription_plan)
        VALUES ('Pavtibook', 'Pavtibook', 'admin@pavtibook.com', '+1234567890', 'Admin Address', 'Admin City', 'Admin State', 'Admin Country', '12345', 'active', 'premium')
      `);
            console.log('✅ Default franchise inserted');
        } else {
            console.log('⚠️  Default franchise already exists - skipping');
        }

        // Delete existing admin@pavtibook.com user if exists
        try {
            await connection.execute("DELETE FROM users WHERE email = 'admin@pavtibook.com'");
        } catch (e) {
            // ignore
        }

        console.log('📝 Creating default admin user...');
        const bcryptjs = require('bcryptjs');
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash('Admin@123', salt);

        // Get Pavtibook franchise (should be ID 2 based on check output, or create it)
        const [franchiseResult] = await connection.execute(`
      SELECT id FROM franchises WHERE email = 'admin@pavtibook.com' LIMIT 1
    `);
        let franchiseId = franchiseResult[0]?.id;

        if (!franchiseId) {
            // Create the franchise if it doesn't exist
            const [insertResult] = await connection.execute(`
        INSERT INTO franchises (name, app_name, email, phone, address, city, state, country, postal_code, status, subscription_plan)
        VALUES ('Pavtibook', 'Pavtibook', 'admin@pavtibook.com', '+1234567890', 'Admin Address', 'Admin City', 'Admin State', 'Admin Country', '12345', 'active', 'premium')
      `);
            franchiseId = insertResult.insertId;
            console.log(`  Created franchise with ID: ${franchiseId}`);
        } else {
            console.log(`  Using existing franchise ID: ${franchiseId}`);
        }

        try {
            await connection.execute(`
        INSERT INTO users (franchise_id, role_id, username, email, password_hash, first_name, last_name, is_active)
        VALUES (?, 1, 'admin_pavtibook', 'admin@pavtibook.com', ?, 'Admin', 'User', 1)
      `, [franchiseId, hashedPassword]);
            console.log('✅ Admin user created');
            console.log('   Email: admin@pavtibook.com');
            console.log('   Password: Admin@123\n');
        } catch (error) {
            if (error.errno === 1062) {
                console.log('⚠️  Admin user already exists\n');
            } else {
                throw error;
            }
        }

        console.log('🎉 All migrations completed successfully!');
        console.log('\n📌 You can now login to the application with:');
        console.log('   Email: admin@pavtibook.com');
        console.log('   Password: Admin@123\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migrations
runMigrations();
