// Product Controller
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

// Create product
exports.create = async (req, res) => {
  try {
    const { sku, name, description, category, unit_price, selling_price, quantity_on_hand, reorder_level, supplier_id, unit_of_measure, hsn_code, gst_percentage } = req.body;

    if (!sku || !name) {
      return sendError(res, 'SKU and name are required', 400);
    }

    // Check if SKU already exists
    const existingProduct = await Product.findBySKU(req.user.franchiseId, sku);
    if (existingProduct) {
      return sendError(res, 'SKU already exists', 409);
    }

    // Calculate selling price: default to purchase_price * 1.20 (20% markup)
    const calculatedSellingPrice = selling_price ? parseFloat(selling_price) : (parseFloat(unit_price || 0) * 1.20);

    const product = await Product.create({
      franchiseId: req.user.franchiseId,
      sku,
      name,
      description,
      category,
      unitOfMeasure: unit_of_measure || 'UNT',
      purchasePrice: unit_price || 0,
      sellingPrice: calculatedSellingPrice,
      quantityOnHand: quantity_on_hand || 0,
      reorderLevel: reorder_level || 0,
      supplierId: supplier_id || null,
      hsnCode: hsn_code || null,
      gstPercentage: gst_percentage || 0
    });

    // Return complete product with all fields from database
    sendSuccess(res, 'Product created successfully', {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      unit_price: product.purchase_price,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      supplier_id: product.supplier_id,
      hsn_code: product.hsn_code,
      gst_percentage: product.gst_percentage,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      franchise_id: product.franchise_id,
      supplier_name: product.supplier_name
    }, 201);
  } catch (error) {
    console.error('Create product error:', error);
    sendError(res, error.message || 'Failed to create product', 500);
  }
};

// Get products
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const products = await Product.findByFranchise(req.user.franchiseId, limit, offset);

    // Map all products to include all fields with proper naming
    const mappedProducts = products.map(product => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      unit_price: product.purchase_price,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      supplier_id: product.supplier_id,
      hsn_code: product.hsn_code,
      gst_percentage: product.gst_percentage,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      franchise_id: product.franchise_id,
      supplier_name: product.supplier_name
    }));

    sendSuccess(res, 'Products retrieved successfully', { products: mappedProducts });
  } catch (error) {
    console.error('Get products error:', error);
    sendError(res, error.message || 'Failed to get products', 500);
  }
};

// Get product by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Return complete product with all fields mapped to snake_case
    sendSuccess(res, 'Product retrieved successfully', {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      unit_price: product.purchase_price,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      supplier_id: product.supplier_id,
      hsn_code: product.hsn_code,
      gst_percentage: product.gst_percentage,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      franchise_id: product.franchise_id,
      supplier_name: product.supplier_name
    });
  } catch (error) {
    console.error('Get product error:', error);
    sendError(res, error.message || 'Failed to get product', 500);
  }
};

// Update product
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // Transform snake_case keys to camelCase for model compatibility
    const keyMap = {
      sku: 'sku',
      name: 'name',
      description: 'description',
      category: 'category',
      unit_of_measure: 'unitOfMeasure',
      unit_price: 'purchasePrice',
      purchase_price: 'purchasePrice',
      selling_price: 'sellingPrice',
      quantity_on_hand: 'quantityOnHand',
      reorder_level: 'reorderLevel',
      supplier_id: 'supplierId',
      is_active: 'isActive',
      hsn_code: 'hsnCode',
      gst_percentage: 'gstPercentage'
    };

    Object.entries(req.body).forEach(([key, value]) => {
      const mappedKey = keyMap[key] || key;
      updates[mappedKey] = value;
    });

    const product = await Product.update(id, updates);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Return complete product with all fields mapped to snake_case
    sendSuccess(res, 'Product updated successfully', {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      unit_price: product.purchase_price,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      supplier_id: product.supplier_id,
      hsn_code: product.hsn_code,
      gst_percentage: product.gst_percentage,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      franchise_id: product.franchise_id,
      supplier_name: product.supplier_name
    });
  } catch (error) {
    console.error('Update product error:', error);
    sendError(res, error.message || 'Failed to update product', 500);
  }
};

// Delete product
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    await Product.delete(id);

    sendSuccess(res, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    sendError(res, error.message || 'Failed to delete product', 500);
  }
};

// Get low stock products
exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.getLowStockProducts(req.user.franchiseId);

    sendSuccess(res, 'Low stock products retrieved successfully', { products });
  } catch (error) {
    console.error('Get low stock products error:', error);
    sendError(res, error.message || 'Failed to get low stock products', 500);
  }
};
