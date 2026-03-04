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

        const token = login.body.data.token;

        console.log('Creating quotation with HSN...');
        const today = new Date().toISOString().split('T')[0];
        const quotationPayload = {
            quotationDate: today,
            customerName: 'E2E Test Customer',
            quotationType: 'with_rates',
            notes: 'E2E test quotation HSN',
            terms: 'Standard terms',
            paymentTerms: '50% advance',
            deliveryTime: '2 weeks',
            warranty: '1 year',
            items: [
                { productId: null, productName: 'HSN Item', description: 'HSN item desc', quantity: 2, unitPrice: 500, taxRate: 18, hsn_code: '8414' }
            ]
        };

        const createQuote = await request({ hostname: 'localhost', port: 5000, path: '/api/quotations', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }, quotationPayload);
        console.log('Create quotation:', createQuote.statusCode, createQuote.body.message || createQuote.body);
        console.log('Created item hsn:', createQuote.body.data && createQuote.body.data.items && createQuote.body.data.items[0] && createQuote.body.data.items[0].hsn_code);
        process.exit(0);
    } catch (err) {
        console.error('E2E hsn script error:', err);
        process.exit(1);
    }
})();
