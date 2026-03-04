// Supplier Controller
const Supplier = require('../models/Supplier');
const { sendSuccess, sendError } = require('../utils/response');

// Create supplier
exports.create = async (req, res) => {
  try {
    let { name, contactPerson, contact_person, email, phone, address, city, state, country, postalCode, postal_code, paymentTerms, payment_terms } = req.body;

    if (!name) {
      return sendError(res, 'Supplier name is required', 400);
    }

    // Support both camelCase and snake_case
    const contact = contactPerson || contact_person;
    const postal = postalCode || postal_code;
    const payment = paymentTerms || payment_terms;

    const supplier = await Supplier.create({
      franchiseId: req.user.franchiseId,
      name,
      contactPerson: contact,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode: postal,
      paymentTerms: payment
    });

    sendSuccess(res, 'Supplier created successfully', supplier, 201);
  } catch (error) {
    console.error('Create supplier error:', error);
    sendError(res, error.message || 'Failed to create supplier', 500);
  }
};

// Get all suppliers
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const suppliers = await Supplier.findByFranchise(req.user.franchiseId, limit, offset);

    sendSuccess(res, 'Suppliers retrieved successfully', { suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    sendError(res, error.message || 'Failed to get suppliers', 500);
  }
};

// Get supplier by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    sendSuccess(res, 'Supplier retrieved successfully', supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    sendError(res, error.message || 'Failed to get supplier', 500);
  }
};

// Update supplier
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Convert snake_case to camelCase for consistency
    const convertedUpdates = {};
    Object.entries(updates).forEach(([key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      convertedUpdates[camelKey] = value;
    });

    const supplier = await Supplier.update(id, convertedUpdates);

    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    sendSuccess(res, 'Supplier updated successfully', supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    sendError(res, error.message || 'Failed to update supplier', 500);
  }
};

// Delete supplier
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    await Supplier.delete(id);

    sendSuccess(res, 'Supplier deleted successfully');
  } catch (error) {
    console.error('Delete supplier error:', error);
    sendError(res, error.message || 'Failed to delete supplier', 500);
  }
};

// Search suppliers
exports.search = async (req, res) => {
  try {
    const { term } = req.query;

    if (!term || term.length < 2) {
      return sendError(res, 'Search term must be at least 2 characters', 400);
    }

    const suppliers = await Supplier.search(req.user.franchiseId, term);

    sendSuccess(res, 'Suppliers found', { suppliers });
  } catch (error) {
    console.error('Search suppliers error:', error);
    sendError(res, error.message || 'Failed to search suppliers', 500);
  }
};
