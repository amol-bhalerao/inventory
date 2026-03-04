require('dotenv').config();
const http = require('http');

const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiZW1haWwiOiJhZG1pbkBwYXZ0aWJvb2suY29tIiwicm9sZSI6IlN1cGVyIEFkbWluIiwiZnJhbmNoaXNlSWQiOjIsImlhdCI6MTc3MDMyMzgyNCwiZXhwIjoxNzcwOTI4NjI0fQ.r-nolR2ra9kyO0E1_aK9c6mEfOsotHNmmaTuebfz7FA';

async function testAPI() {
    console.log('\n🧪 Testing Franchise CRUD Operations\n');

    // Test 1: Create Franchise
    console.log('1️⃣  CREATE: Adding new franchise...');
    const franchiseData = JSON.stringify({
        name: 'Test Franchise',
        email: 'test.franchise@example.com',
        phone: '+1234567890',
        address: '123 Main Street',
        city: 'TestCity',
        state: 'TestState',
        country: 'TestCountry',
        postal_code: '12345'
    });

    await makeRequest('POST', '/api/franchises', franchiseData, adminToken);

    // Test 2: Get All Franchises
    console.log('\n2️⃣  READ (All): Getting all franchises...');
    await makeRequest('GET', '/api/franchises?limit=10&offset=0', null, adminToken);

    // Test 3: Get Specific Franchise  
    console.log('\n3️⃣  READ (Specific): Getting franchise #3...');
    await makeRequest('GET', '/api/franchises/3', null, adminToken);

    // Test 4: Update Franchise
    console.log('\n4️⃣  UPDATE: Updating franchise...');
    const updateData = JSON.stringify({
        name: 'Updated Test Franchise',
        city: 'UpdatedCity'
    });
    await makeRequest('PUT', '/api/franchises/3', updateData, adminToken);

    // Test 5: Get after update
    console.log('\n5️⃣  READ (After Update): Verifying update...');
    await makeRequest('GET', '/api/franchises/3', null, adminToken);

    // Test 6: Delete
    console.log('\n6️⃣  DELETE: Deleting franchise...');
    await makeRequest('DELETE', '/api/franchises/3', null, adminToken);

    console.log('\n✅ All tests completed!\n');
}

function makeRequest(method, path, body, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.success) {
                        console.log(`   ✅ Success:\n${JSON.stringify(response.data, null, 4).split('\n').slice(0, 8).join('\n')}`);
                    } else {
                        console.log(`   ❌ Error: ${response.message}`);
                    }
                } catch (e) {
                    console.log(`   ⚠️  Response: ${data.substring(0, 100)}`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`   ❌ Request Error: ${e.message}`);
            resolve();
        });

        if (body) req.write(body);
        req.end();
    });
}

testAPI();
