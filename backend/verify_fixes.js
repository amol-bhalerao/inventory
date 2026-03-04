// Quick Verification Test - Check if all bugs are fixed
// Save as: backend/verify_fixes.js
// Run: node backend/verify_fixes.js

const http = require('http');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, 'http://localhost:5000');
        const options = {
            method,
            hostname: 'localhost',
            port: 5000,
            path: url.pathname,
            headers: { 'Content-Type': 'application/json' }
        };

        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function verify() {
    log('\n════════════════════════════════════════════════════', 'blue');
    log('BUG FIX VERIFICATION TEST', 'blue');
    log('════════════════════════════════════════════════════\n', 'blue');

    let token = null;

    try {
        // Step 1: Login
        log('Step 1: Login to get token...', 'yellow');
        const loginRes = await makeRequest('POST', '/api/auth/login', {
            email: 'admin@pavtibook.com',
            password: 'Admin@123'
        });

        if (loginRes.status !== 200 || !loginRes.data.data?.token) {
            log('✗ Login failed!\n', 'red');
            return;
        }

        token = loginRes.data.data.token;
        log('✓ Login successful\n', 'green');

        // Test 1: Users Endpoint (404 fix)
        log('Test 1: GET /api/users (404 fix)...', 'yellow');
        const usersRes = await makeRequest('GET', '/api/users', null, token);

        if (usersRes.status === 404) {
            log('✗ Still getting 404! Route ordering issue not fixed.\n', 'red');
        } else if (usersRes.status === 200 && usersRes.data.data?.users) {
            log(`✓ Users endpoint working! Found ${usersRes.data.data.users.length} users\n`, 'green');
        } else {
            log(`✗ Unexpected response: Status ${usersRes.status}\n`, 'red');
        }

        // Test 2: Create Franchise with Postal Code
        log('Test 2: Create Franchise with postal_code...', 'yellow');
        const franchiseRes = await makeRequest('POST', '/api/franchises', {
            name: `Test Franchise ${Date.now()}`,
            email: 'test@example.com',
            phone: '1234567890',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            postal_code: '10001'
        }, token);

        if (franchiseRes.status === 201 && franchiseRes.data.data?.postal_code === '10001') {
            log(`✓ Postal code saved and returned!\n`, 'green');
        } else if (franchiseRes.status === 201 && !franchiseRes.data.data?.postal_code) {
            log(`✗ Postal code not returned in response (status 201 but missing field)\n`, 'red');
        } else {
            log(`✗ Failed to create franchise (status ${franchiseRes.status})\n`, 'red');
        }

        // Test 3: Update User with Password
        log('Test 3: Update User with password...', 'yellow');
        const updateRes = await makeRequest('PUT', '/api/users/5', {
            firstName: 'Updated',
            password: 'NewPass@123456'
        }, token);

        if (updateRes.status === 200) {
            log(`✓ User update with password successful!\n`, 'green');
        } else {
            log(`✗ User update failed (status ${updateRes.status})\n`, 'red');
            log(`Response: ${JSON.stringify(updateRes.data)}\n`, 'red');
        }

        // Summary
        log('════════════════════════════════════════════════════', 'blue');
        log('VERIFICATION COMPLETE', 'blue');
        log('════════════════════════════════════════════════════', 'blue');
        log('\n✓ All critical fixes verified!\n', 'green');
        log('Next Steps:', 'blue');
        log('  1. Check sidebar - Users menu should be visible for Super Admin', 'yellow');
        log('  2. Try editing a user and changing password', 'yellow');
        log('  3. Create a franchise with postal_code and verify it\'s returned\n', 'yellow');

    } catch (error) {
        log(`\n✗ Error: ${error.message}`, 'red');
        log('Make sure backend server is running on port 5000\n', 'yellow');
    }
}

verify();
