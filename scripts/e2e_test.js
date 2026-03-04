const http = require('http');

function request(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data || '{}');
                    resolve({ statusCode: res.statusCode, body: json });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

(async () => {
    try {
        console.log('Logging in...');
        const login = await request({
            hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@pavtibook.com', password: 'Admin@123' });

        console.log('Login response:', login.statusCode, login.body.message || login.body);
        if (!login.body || !login.body.data || !login.body.data.token) {
            console.error('Login failed, aborting e2e test');
            process.exit(1);
        }
        const token = login.body.data.token;

        // Create a customer
        console.log('Creating test customer...');
        const custPayload = { name: 'E2E Test Customer', email: 'e2e@example.com', phone: '9999999999', gst_number: '', address: 'Test Address', city: 'TestCity', state: 'TestState', postal_code: '560001' };
        const createCust = await request({ hostname: 'localhost', port: 5000, path: '/api/customers', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }, custPayload);
        console.log('Create customer:', createCust.statusCode, createCust.body.message || createCust.body);
        if (!createCust.body || !createCust.body.data || !createCust.body.data.id) {
            console.error('Customer creation failed, aborting');
            process.exit(1);
        }
        const customerId = createCust.body.data.id;

        // Create a quotation
        console.log('Creating test quotation...');
        const today = new Date().toISOString().split('T')[0];
        const quotationPayload = {
            quotationDate: today,
            customerName: 'E2E Test Customer',
            customerId: customerId,
            customerEmail: 'e2e@example.com',
            quotationType: 'with_rates',
            notes: 'E2E test quotation',
            terms: 'Standard terms',
            paymentTerms: '50% advance',
            deliveryTime: '2 weeks',
            warranty: '1 year',
            items: [
                { productId: null, productName: 'Test Item', description: 'Test item desc', quantity: 1, unitPrice: 1000, taxRate: 18 }
            ]
        };

        const createQuote = await request({ hostname: 'localhost', port: 5000, path: '/api/quotations', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }, quotationPayload);
        console.log('Create quotation:', createQuote.statusCode, createQuote.body.message || createQuote.body);
        if (createQuote.statusCode >= 400) {
            console.error('Quotation creation failed:', createQuote.body);
            process.exit(1);
        }

        const created = createQuote.body.data || createQuote.body;
        console.log('E2E success. Quotation id:', created.id || created.id);
        process.exit(0);
    } catch (err) {
        console.error('E2E script error:', err);
        process.exit(1);
    }
})();
