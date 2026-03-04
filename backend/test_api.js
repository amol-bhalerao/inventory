require('dotenv').config();
const http = require('http');

const postData = JSON.stringify({
    email: 'admin@pavtibook.com',
    password: 'Admin@123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('✅ Login Response:');
            console.log(JSON.stringify(response, null, 2));
        } catch (e) {
            console.log('Raw Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Error:', e.message);
});

req.write(postData);
req.end();
