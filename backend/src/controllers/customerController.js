// Customer Controller
const Customer = require('../models/Customer');
const { sendSuccess, sendError } = require('../utils/response');

// Create customer
exports.create = async (req, res) => {
    try {
        const { name, email, phone, gst_number, address, city, state, country, postal_code } = req.body;

        if (!name) {
            return sendError(res, 'Customer name is required', 400);
        }

        // Check if GST number already exists (if provided)
        if (gst_number) {
            const existingCustomer = await Customer.findByGSTNumber(req.user.franchiseId, gst_number);
            if (existingCustomer) {
                return sendError(res, 'Customer with this GST number already exists', 409);
            }
        }

        const customer = await Customer.create({
            franchiseId: req.user.franchiseId,
            name,
            email,
            phone,
            gst_number,
            address,
            city,
            state,
            country,
            postal_code
        });

        sendSuccess(res, 'Customer created successfully', {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            gst_number: customer.gst_number,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            country: customer.country,
            postal_code: customer.postal_code
        }, 201);
    } catch (error) {
        console.error('Create customer error:', error);
        sendError(res, error.message || 'Failed to create customer', 500);
    }
};

// Get all customers
exports.getAll = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const customers = await Customer.findByFranchise(req.user.franchiseId, limit, offset);

        sendSuccess(res, 'Customers retrieved successfully', { customers });
    } catch (error) {
        console.error('Get customers error:', error);
        sendError(res, error.message || 'Failed to get customers', 500);
    }
};

// Get customer by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await Customer.findById(id);

        if (!customer) {
            return sendError(res, 'Customer not found', 404);
        }

        sendSuccess(res, 'Customer retrieved successfully', customer);
    } catch (error) {
        console.error('Get customer error:', error);
        sendError(res, error.message || 'Failed to get customer', 500);
    }
};

// Get customer by GST number
exports.getByGST = async (req, res) => {
    try {
        const { gst_number } = req.params;

        const customer = await Customer.findByGSTNumber(req.user.franchiseId, gst_number);

        if (!customer) {
            return sendError(res, 'Customer with this GST number not found', 404);
        }

        sendSuccess(res, 'Customer retrieved successfully', customer);
    } catch (error) {
        console.error('Get customer by GST error:', error);
        sendError(res, error.message || 'Failed to get customer', 500);
    }
};

// Update customer
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const customer = await Customer.update(id, updates);

        if (!customer) {
            return sendError(res, 'Customer not found', 404);
        }

        sendSuccess(res, 'Customer updated successfully', customer);
    } catch (error) {
        console.error('Update customer error:', error);
        sendError(res, error.message || 'Failed to update customer', 500);
    }
};

// Delete customer
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        await Customer.delete(id);

        sendSuccess(res, 'Customer deleted successfully', null);
    } catch (error) {
        console.error('Delete customer error:', error);
        sendError(res, error.message || 'Failed to delete customer', 500);
    }
};
