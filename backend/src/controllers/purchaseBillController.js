// Purchase Bill Controller
const PurchaseBill = require('../models/PurchaseBill');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const { sendSuccess, sendError } = require('../utils/response');
const pdf = require('pdf-parse');

// Create purchase bill
exports.create = async (req, res) => {
    try {
        const { bill_number, bill_date, supplier_id, notes, items } = req.body;

        if (!bill_date) {
            return sendError(res, 'Bill date is required', 400);
        }

        // Create bill
        const bill = await PurchaseBill.create({
            franchiseId: req.user.franchiseId,
            bill_number,
            bill_date,
            supplier_id,
            notes,
            created_by: req.user.id,
            status: 'draft'
        });

        // Add items if provided
        let totalAmount = 0;
        let totalGst = 0;

        if (items && Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                // Try to find matching product by SKU if hsn_code is provided
                let productId = item.product_id || null;
                if (!productId && item.hsn_code) {
                    // Try to find product by name or SKU that might match
                    try {
                        const matchedProduct = await Product.findBySKU(req.user.franchiseId, item.hsn_code);
                        if (matchedProduct) {
                            productId = matchedProduct.id;
                        }
                    } catch (err) {
                        // If no product found, continue without linking
                    }
                }

                const itemTotal = item.quantity * item.rate;
                const gstAmount = itemTotal * (item.gst_percentage || 0) / 100;

                await PurchaseBill.addItem({
                    purchase_bill_id: bill.id,
                    product_id: productId,
                    hsn_code: item.hsn_code || null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    rate: item.rate,
                    gst_percentage: item.gst_percentage || 0,
                    gst_amount: gstAmount,
                    total_amount: itemTotal + gstAmount
                });

                totalAmount += itemTotal;
                totalGst += gstAmount;
            }

            // Update bill totals
            await PurchaseBill.update(bill.id, {
                total_amount: totalAmount,
                total_gst: totalGst
            });
        }

        const billItems = await PurchaseBill.getItems(bill.id);

        sendSuccess(res, 'Purchase bill created successfully', {
            id: bill.id,
            bill_number: bill.bill_number,
            bill_date: bill.bill_date,
            supplier_id: bill.supplier_id,
            total_amount: totalAmount,
            total_gst: totalGst,
            status: 'draft',
            items: billItems
        }, 201);
    } catch (error) {
        console.error('Create purchase bill error:', error);
        sendError(res, error.message || 'Failed to create purchase bill', 500);
    }
};

// Get all purchase bills
exports.getAll = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const bills = await PurchaseBill.findByFranchise(req.user.franchiseId, limit, offset);

        sendSuccess(res, 'Purchase bills retrieved successfully', { bills });
    } catch (error) {
        console.error('Get purchase bills error:', error);
        sendError(res, error.message || 'Failed to get purchase bills', 500);
    }
};

// Get purchase bill by ID with items
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const bill = await PurchaseBill.findById(id);

        if (!bill) {
            return sendError(res, 'Purchase bill not found', 404);
        }

        const items = await PurchaseBill.getItems(id);

        sendSuccess(res, 'Purchase bill retrieved successfully', {
            ...bill,
            items
        });
    } catch (error) {
        console.error('Get purchase bill error:', error);
        sendError(res, error.message || 'Failed to get purchase bill', 500);
    }
};

// Update purchase bill
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { bill_number, bill_date, supplier_id, notes, items, status } = req.body;

        // Update bill
        const bill = await PurchaseBill.update(id, {
            bill_number,
            bill_date,
            supplier_id,
            notes,
            status
        });

        if (!bill) {
            return sendError(res, 'Purchase bill not found', 404);
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            await PurchaseBill.deleteAllItems(id);

            let totalAmount = 0;
            let totalGst = 0;

            for (const item of items) {
                const itemTotal = item.quantity * item.rate;
                const gstAmount = itemTotal * (item.gst_percentage || 0) / 100;

                await PurchaseBill.addItem({
                    purchase_bill_id: id,
                    product_id: item.product_id || null,
                    hsn_code: item.hsn_code || null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    rate: item.rate,
                    gst_percentage: item.gst_percentage || 0,
                    gst_amount: gstAmount,
                    total_amount: itemTotal + gstAmount
                });

                totalAmount += itemTotal;
                totalGst += gstAmount;
            }

            // Update bill totals
            await PurchaseBill.update(id, {
                total_amount: totalAmount,
                total_gst: totalGst
            });
        }

        const billItems = await PurchaseBill.getItems(id);

        sendSuccess(res, 'Purchase bill updated successfully', {
            ...bill,
            items: billItems
        });
    } catch (error) {
        console.error('Update purchase bill error:', error);
        sendError(res, error.message || 'Failed to update purchase bill', 500);
    }
};

// Delete purchase bill
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const bill = await PurchaseBill.findById(id);

        if (!bill) {
            return sendError(res, 'Purchase bill not found', 404);
        }

        // If bill was approved, reverse the stock transactions
        if (bill.status === 'approved') {
            try {
                const items = await PurchaseBill.getItems(id);
                const { query } = require('../utils/database');

                for (const item of items) {
                    if (item.product_id) {
                        // Create reversal stock transaction
                        await StockTransaction.create({
                            franchiseId: bill.franchise_id || req.user.franchiseId,
                            productId: item.product_id,
                            transactionType: 'adjustment',
                            quantityChange: -item.quantity, // Negative to reverse
                            referenceId: id,
                            referenceType: 'purchase_bill_cancel',
                            notes: `Cancellation of Bill #${bill.bill_number}`,
                            createdBy: req.user.id
                        });

                        // Reverse product stock
                        await Product.updateStock(item.product_id, -item.quantity);
                    }
                }
            } catch (stockError) {
                console.error('Error reversing stock for deleted bill:', stockError);
                // Continue with deletion even if stock reversal fails
            }
        }

        await PurchaseBill.deleteAllItems(id);
        await PurchaseBill.delete(id);

        sendSuccess(res, 'Purchase bill deleted successfully and stock reversed', null);
    } catch (error) {
        console.error('Delete purchase bill error:', error);
        sendError(res, error.message || 'Failed to delete purchase bill', 500);
    }
};

// Approve and apply purchase bill (update stock)
exports.approve = async (req, res) => {
    try {
        const { id } = req.params;

        const bill = await PurchaseBill.findById(id);

        if (!bill) {
            return sendError(res, 'Purchase bill not found', 404);
        }

        const items = await PurchaseBill.getItems(id);

        // Process each item - create products if they don't exist and update stock
        for (const item of items) {
            let productId = item.product_id;

            // If product_id is null, we need to create a new product
            if (!productId) {
                try {
                    // Clean up item name - remove garbled data
                    let cleanName = item.item_name.split('|').pop().trim();
                    cleanName = cleanName.replace(/[0-9]+\s*%.*$/i, '').trim(); // Remove percentage and following text
                    cleanName = cleanName.split(/[₹$0-9]/)[0].trim(); // Remove prices and numbers at start

                    // Generate SKU from HSN code or item name
                    const sku = item.hsn_code || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Create new product
                    const newProduct = await Product.create({
                        franchiseId: bill.franchise_id || req.user.franchiseId,
                        sku: sku,
                        name: cleanName || item.item_name,
                        description: item.item_name, // Store original name in description
                        hsnCode: item.hsn_code,
                        purchasePrice: parseFloat(item.rate) || 0,
                        gstPercentage: parseFloat(item.gst_percentage) || 0,
                        quantityOnHand: item.quantity,
                        supplierId: bill.supplier_id,
                        unitOfMeasure: 'UNT'
                    });

                    productId = newProduct.id;

                    // Update the purchase bill item with the new product_id
                    const { query } = require('../utils/database');
                    await query(
                        'UPDATE purchase_bill_items SET product_id = ? WHERE id = ?',
                        [productId, item.id]
                    );

                    // Create stock transaction for purchase
                    await StockTransaction.create({
                        franchiseId: bill.franchise_id || req.user.franchiseId,
                        productId: productId,
                        transactionType: 'purchase',
                        quantityChange: item.quantity, // Positive for purchase
                        referenceId: id,
                        referenceType: 'purchase_bill',
                        notes: `Purchase via Bill #${bill.bill_number}`,
                        createdBy: req.user.id
                    });

                    console.log(`✅ Created product ${productId} for item "${cleanName}"`);
                } catch (createError) {
                    console.error(`❌ Failed to create product for item ${item.id}:`, createError);
                    // Continue processing other items
                }
            } else {
                // If product exists, update its stock and create transaction
                try {
                    const product = await Product.findById(productId);
                    if (product) {
                        const newQuantity = (product.quantity_on_hand || 0) + item.quantity;
                        await Product.update(productId, {
                            quantityOnHand: newQuantity
                        });

                        // Create stock transaction for purchase
                        await StockTransaction.create({
                            franchiseId: bill.franchise_id || req.user.franchiseId,
                            productId: productId,
                            transactionType: 'purchase',
                            quantityChange: item.quantity, // Positive for purchase
                            referenceId: id,
                            referenceType: 'purchase_bill',
                            notes: `Purchase via Bill #${bill.bill_number}`,
                            createdBy: req.user.id
                        });

                        console.log(`✅ Updated stock for product ${productId}: new quantity = ${newQuantity}`);
                    }
                } catch (updateError) {
                    console.error(`❌ Failed to update product ${productId}:`, updateError);
                }
            }
        }

        // Update bill status
        await PurchaseBill.update(id, { status: 'approved' });

        sendSuccess(res, 'Purchase bill approved and stock updated', {
            id,
            status: 'approved',
            items_count: items.length
        });
    } catch (error) {
        console.error('Approve purchase bill error:', error);
        sendError(res, error.message || 'Failed to approve purchase bill', 500);
    }
};

// Extract items and supplier details from PDF bill
exports.extractFromPDF = async (req, res) => {
    console.log('📥 extractFromPDF: File upload received')
    console.log('📋 Request headers:', {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
    })
    try {
        if (!req.file) {
            console.warn('❌ No file in request - req.file is undefined')
            console.warn('📋 req.body keys:', Object.keys(req.body))
            console.warn('📋 req.files:', req.files)
            return sendError(res, 'No file uploaded', 400);
        }

        const file = req.file;
        console.log('📦 File received:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer?.length ? `[${file.buffer.length} bytes]` : 'MISSING'
        })

        // Check file type
        if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
            console.warn('❌ Invalid file type:', file.mimetype)
            return sendError(res, 'Only PDF files are supported', 400);
        }

        // Read PDF and extract text
        let extractedText = '';
        let supplierDetails = null;
        let items = [];

        try {
            // Extract text using pdf-parse
            console.log('🔧 Parsing PDF with pdf-parse...')
            const data = await pdf(file.buffer);
            extractedText = data.text || '';
            console.log('📝 PDF text extracted, length:', extractedText.length)

            // Check if PDF has extractable text (searchable PDF)
            if (!extractedText || extractedText.trim().length < 50) {
                console.warn('⚠️ PDF appears to be image-only (scanned) - no searchable text found')
                // Return 200 with helpful message instead of error
                return sendSuccess(res, 'Image-only PDF detected', {
                    success: false,
                    imageOnlyPDF: true,
                    message: 'This PDF is scanned/image-only (no searchable text). ',
                    suggestion: 'Please upload a photo of your invoice instead, which we can process with our image recognition system.',
                    canRetry: true,
                    items: [],
                    supplierDetails: null
                });
            }
        } catch (pdfError) {
            console.error('❌ PDF parsing error:', pdfError.message);
            return sendSuccess(res, 'Failed to process PDF', {
                success: false,
                imageOnlyPDF: true,
                message: 'Could not extract text from PDF. This might be a scanned/image-only PDF.',
                suggestion: 'Please upload a clear image of your invoice instead.',
                canRetry: true,
                items: [],
                supplierDetails: null
            });
        }

        // Parse the extracted text
        console.log('📊 Extracting supplier details and items from text...')
        supplierDetails = extractSupplierDetails(extractedText);
        items = parseInvoiceText(extractedText);

        console.log('✅ Extraction complete:', {
            itemsCount: items.length,
            supplierDetails,
            items
        })

        if (!items || items.length === 0) {
            console.warn('⚠️ No items parsed from PDF text')
            return sendSuccess(res, 'Text extracted but no items found', {
                success: true,
                message: 'PDF text extracted but no structured items found. Please manually add items.',
                supplierDetails,
                items: [],
                rawText: extractedText.substring(0, 1000)
            });
        }

        console.log('✅ Successfully extracted items from PDF')
        return sendSuccess(res, 'Successfully extracted items from PDF', {
            success: true,
            message: `Successfully extracted ${items.length} items from invoice`,
            suppliers: supplierDetails,
            items: items
        });

    } catch (error) {
        console.error('❌ PDF extraction error:', error);
        return sendError(res, error.message || 'Failed to extract from PDF', 500);
    }
};

// Extract supplier details from invoice text
const extractSupplierDetails = (text) => {
    const details = {
        supplier_name: null,
        supplier_email: null,
        supplier_phone: null,
        supplier_gst: null
    };

    if (!text) return details;

    // Try to extract supplier name (often at top of invoice)
    const lines = text.split('\n').slice(0, 15); // Check first 15 lines

    // Look for email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
        details.supplier_email = emailMatch[1];
    }

    // Look for phone number (various formats)
    const phoneMatch = text.match(/(?:[\+]?[0-9]{1,3}[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4,6}/);
    if (phoneMatch) {
        details.supplier_phone = phoneMatch[0].trim();
    }

    // Look for GST (Indian GST format: 2 digits state + 7 digit number)
    const gstMatch = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9]{1})\b/);
    if (gstMatch) {
        details.supplier_gst = gstMatch[1];
    }

    return details;
};

// Parse invoice text to extract items
const parseInvoiceText = (text) => {
    try {
        const items = [];
        if (!text || text.trim().length === 0) {
            return items;
        }

        const lines = text.split('\n').filter(line => line.trim().length > 0);

        for (const line of lines) {
            // Skip common header/footer lines
            if (line.length < 5 ||
                line.toLowerCase().includes('invoice') ||
                line.toLowerCase().includes('gstin') ||
                line.toLowerCase().includes('date') ||
                line.toLowerCase().includes('total') ||
                line.toLowerCase().includes('amount') ||
                line.toLowerCase().includes('sr.') ||
                line.toLowerCase().includes('no.') ||
                line.toLowerCase().includes('tax') ||
                line.toLowerCase().includes('bill') ||
                line.toLowerCase().includes('page')) {
                continue;
            }

            // Pattern 1: Item Name | HSN Code | Quantity | Rate | GST %
            let match = line.match(/^([A-Za-z\s\-\.\(\)]+?)\s*\|\s*(\d+)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
            if (match) {
                const item = {
                    item_name: match[1].trim(),
                    hsn_code: match[2].trim(),
                    quantity: parseFloat(match[3]),
                    rate: parseFloat(match[4]),
                    gst_percentage: parseFloat(match[5]) || 18
                };
                if (item.item_name && item.quantity > 0 && item.rate > 0) {
                    items.push(item);
                }
                continue;
            }

            // Pattern 2: Item Name, HSN Code, Quantity, Rate, GST %
            match = line.match(/^([A-Za-z\s\-\.\(\)]+?),\s*(\d+),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
            if (match) {
                const item = {
                    item_name: match[1].trim(),
                    hsn_code: match[2].trim(),
                    quantity: parseFloat(match[3]),
                    rate: parseFloat(match[4]),
                    gst_percentage: parseFloat(match[5]) || 18
                };
                if (item.item_name && item.quantity > 0 && item.rate > 0) {
                    items.push(item);
                }
                continue;
            }

            // Pattern 3: Tab/space separated
            match = line.match(/^([A-Za-z\s\-\.\(\)]+?)\s{2,}(\d{4,})\s{2,}(\d+(?:\.\d+)?)\s{2,}(\d+(?:\.\d+)?)\s{2,}(\d+(?:\.\d+)?)/);
            if (match) {
                const item = {
                    item_name: match[1].trim(),
                    hsn_code: match[2].trim(),
                    quantity: parseFloat(match[3]),
                    rate: parseFloat(match[4]),
                    gst_percentage: parseFloat(match[5]) || 18
                };
                if (item.item_name && item.quantity > 0 && item.rate > 0) {
                    items.push(item);
                }
                continue;
            }

            // Pattern 4: Basic format with HSN
            match = line.match(/^([A-Za-z\s\-\.\(\)]+?)\s+(\d{4,})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);
            if (match) {
                const item = {
                    item_name: match[1].trim(),
                    hsn_code: match[2].trim(),
                    quantity: parseFloat(match[3]),
                    rate: parseFloat(match[4]),
                    gst_percentage: 18
                };
                if (item.item_name && item.item_name.length > 2 && item.quantity > 0 && item.rate > 0) {
                    items.push(item);
                }
            }
        }

        return items;
    } catch (error) {
        console.error('Error parsing invoice text:', error);
        return [];
    }
};
