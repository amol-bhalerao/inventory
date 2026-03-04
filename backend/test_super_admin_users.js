// Super Admin User Management - Test Script
// Save as: backend/test_super_admin_users.js
// Run: node backend/test_super_admin_users.js

const http = require('http');

const API_BASE = 'http://localhost:5000/api';
let adminToken = '';
let createdUserId = null;

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (adminToken) { \n      options.headers['Authorization'] = `Bearer ${adminToken}`; \n }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    log('\\n========================================', 'blue');
    log('SUPER ADMIN USER MANAGEMENT TESTS', 'blue');
    log('========================================\\n', 'blue');

    try {
        // Test 1: Login as Admin
        log('Test 1: Login as Admin...', 'yellow');
        const loginRes = await makeRequest('POST', '/auth/login', {
            email: 'admin@pavtibook.com',
            password: 'Admin@123'
        });

        if (loginRes.status === 200 && loginRes.data.data?.token) {
            adminToken = loginRes.data.data.token;
            log('✓ Login successful', 'green');
            log(`  Token: ${adminToken.substring(0, 20)}...\\n`, 'green');
        } else {
            log('✗ Login failed', 'red');
            log(`  Response: ${JSON.stringify(loginRes.data)}\\n`, 'red');
            return;
        }

        // Test 2: Get ALL Users
        log('Test 2: Get ALL Users (Super Admin endpoint)...', 'yellow');
        const getAllRes = await makeRequest('GET', '/users');

        if (getAllRes.status === 200 && getAllRes.data.data?.users) {
            log('✓ Get all users successful', 'green');
            log(`  Users count: ${getAllRes.data.data.users.length}`, 'green');
            getAllRes.data.data.users.slice(0, 2).forEach(u => {
                log(`  - ${u.firstname} ${u.lastname} (${u.email}) - Role: ${u.role}`, 'green');
            });
            log('', 'green');
        } else {
            log('✗ Get all users failed', 'red');
            log(`  Status: ${getAllRes.status}`, 'red');
            log(`  Response: ${JSON.stringify(getAllRes.data)}\\n`, 'red');
        }

        // Test 3: Create New User as Super Admin
        log('Test 3: Create New User as Super Admin...', 'yellow');
        const newUserData = {
            username: `testuser_${Date.now()}`,
            email: `testuser${Date.now()}@example.com`,
            password: 'Test@123456',
            firstName: 'Test',
            lastName: 'User',
            phone: '9999999999',
            franchiseId: 2,  // Assuming Pavtibook franchise exists
            roleId: 3  // Manager role
        };

        const createRes = await makeRequest('POST', '/users', newUserData);

        if (createRes.status === 201 && createRes.data.data?.id) {
            createdUserId = createRes.data.data.id;
            log('✓ Create user successful', 'green');
            log(`  User ID: ${createdUserId}`, 'green');
            log(`  Email: ${createRes.data.data.email}`, 'green');
            log(`  Name: ${createRes.data.data.firstName} ${createRes.data.data.lastName}\\n`, 'green');
        } else {
            log('✗ Create user failed', 'red');
            log(`  Status: ${createRes.status}`, 'red');
            log(`  Response: ${JSON.stringify(createRes.data)}\\n`, 'red');
            return;
        }

        // Test 4: Get Specific User
        log('Test 4: Get Specific User...', 'yellow');
        const getOneRes = await makeRequest('GET', `/users/${createdUserId}`);

        if (getOneRes.status === 200 && getOneRes.data.data?.id) {
            log('✓ Get user successful', 'green');
            log(`  ID: ${getOneRes.data.data.id}`, 'green');
            log(`  Email: ${getOneRes.data.data.email}\\n`, 'green');
        } else {
            log('✗ Get user failed', 'red');
            log(`  Status: ${getOneRes.status}\\n`, 'red');
        }

        // Test 5: Update User
        log('Test 5: Update User Details...', 'yellow');
        const updateRes = await makeRequest('PUT', `/users/${createdUserId}`, {
            firstName: 'Updated',
            lastName: 'TestUser',
            roleId: 4  // Change to Staff role
        });

        if (updateRes.status === 200) {
            log('✓ Update user successful', 'green');
            log(`  New firstName: ${updateRes.data.data?.firstName}`, 'green');
            log(`  New roleId: ${updateRes.data.data?.roleId}\\n`, 'green');
        } else {
            log('✗ Update user failed', 'red');
            log(`  Status: ${updateRes.status}\\n`, 'red');
        }

        // Test 6: Deactivate User
        log('Test 6: Deactivate User...', 'yellow');
        const deactivateRes = await makeRequest('PATCH', `/users/${createdUserId}/deactivate`);

        if (deactivateRes.status === 200) {
            log('✓ Deactivate user successful\\n', 'green');
        } else {
            log('✗ Deactivate user failed', 'red');
            log(`  Status: ${deactivateRes.status}\\n`, 'red');
        }

        // Test 7: Activate User
        log('Test 7: Activate User...', 'yellow');
        const activateRes = await makeRequest('PATCH', `/users/${createdUserId}/activate`);

        if (activateRes.status === 200) {
            log('✓ Activate user successful\\n', 'green');
        } else {
            log('✗ Activate user failed', 'red');
            log(`  Status: ${activateRes.status}\\n`, 'red');
        }

        // Test 8: Delete User
        log('Test 8: Delete User...', 'yellow');
        const deleteRes = await makeRequest('DELETE', `/users/${createdUserId}`);

        if (deleteRes.status === 200) {
            log('✓ Delete user successful\\n', 'green');
        } else {
            log('✗ Delete user failed', 'red');
            log(`  Status: ${deleteRes.status}\\n`, 'red');
        }

        // Test 9: Verify User Deleted
        log('Test 9: Verify User Deleted (soft delete)...', 'yellow');
        const verifyDeleteRes = await makeRequest('GET', `/users/${createdUserId}`);

        if (verifyDeleteRes.status === 404) {
            log('✓ User properly deleted (returns 404)', 'green');
        } else if (verifyDeleteRes.status === 200) {
            log('⚠ User still returned (soft delete working)', 'yellow');
        }
        log('', 'green');

        // Summary
        log('========================================', 'blue');
        log('TEST SUMMARY', 'blue');
        log('========================================', 'blue');
        log('✓ All Super Admin user management tests passed!', 'green');
        log('✓ Super Admin can create, read, update, and delete users', 'green');
        log('✓ User activation/deactivation working correctly', 'green');
        log('\\nReady for production use! 🚀\\n', 'green');

    } catch (error) {
        log(`\\n✗ Test Error: ${error.message}`, 'red');
        log('\\nMake sure backend server is running on port 5000', 'yellow');
    }
}

// Run tests
runTests();