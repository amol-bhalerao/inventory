const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('c:/Users/abamo/Desktop/solarwala_inventory/frontend/src/pages/QuotationPrintNew.jsx', 'utf8');
try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    console.log('parsed ok');
} catch (e) {
    console.error('parse error', e.message);
}
