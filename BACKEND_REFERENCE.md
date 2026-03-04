# BACKEND REFERENCE GUIDE

## Project Structure

```
backend/
├── src/
│   ├── server.js              - Main Express server
│   ├── config/
│   │   └── database.js        - MySQL connection
│   ├── controllers/
│   │   ├── authController.js  - Login, register, auth
│   │   ├── franchiseController.js
│   │   ├── productController.js
│   │   ├── invoiceController.js
│   │   ├── quotationController.js
│   │   ├── purchaseOrderController.js
│   │   ├── userController.js
│   │   └── supplierController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Franchise.js
│   │   ├── Product.js
│   │   ├── Invoice.js
│   │   ├── Quotation.js
│   │   ├── PurchaseOrder.js
│   │   └── Supplier.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── franchises.js
│   │   ├── products.js
│   │   ├── invoices.js
│   │   ├── quotations.js
│   │   ├── purchaseOrders.js
│   │   ├── users.js
│   │   └── suppliers.js
│   ├── middleware/
│   │   ├── auth.js            - JWT verification
│   │   ├── authorize.js       - Role-based access
│   │   └── errorHandler.js
│   └── utils/
│       ├── database.js        - Query execution
│       ├── response.js        - API response formatter
│       └── helpers.js         - Utility functions (quotation number)
├── migrate.js                 - Database setup
├── check_db.js               - Database verification
├── test_api.js               - API testing
├── package.json
└── README.md
```

## Database Schema

### Core Tables

#### users
```sql
- id (PK)
- franchise_id (FK)
- username (unique) 
- email (unique)
- password (hashed)
- first_name, last_name
- phone
- role_id (FK to roles)
- is_active (boolean)
- last_login
```

#### franchises
```sql
- id (PK)
- name
- email
- phone
- address, city, state, country, postal_code
- established_date
- created_at, updated_at
- deleted_at (soft delete)
```

#### products
```sql
- id (PK)
- franchise_id (FK)
- sku (unique per franchise)
- name
- category
- description
- cost_price, selling_price
- gst_percentage
- reorder_level
- supplier_id (FK)
- is_active
- created_at, deleted_at
```

#### invoices
```sql
- id (PK)
- franchise_id (FK)
- invoice_number (unique)
- customer_name
- customer_email
- customer_phone
- invoice_date
- due_date
- amount
- tax_amount
- discount_amount
- grand_total
- payment_status ('pending', 'partial', 'paid')
- notes
- is_active
- deleted_at
```

#### invoice_items
```sql
- id (PK)
- invoice_id (FK)
- product_id (FK, nullable)
- product_name
- quantity
- unit_price
- tax_rate
- hsn_code
- line_total
```

#### quotations
```sql
- id (PK)
- franchise_id (FK)
- quotation_number
- customer_id (FK, nullable)
- customer_name
- customer_email
- quotation_date
- valid_until
- quotation_type ('with_rates', 'without_rates')
- letter_body
- payment_terms
- delivery_time
- warranty
- notes
- terms_template_id
- gst_percentage
- discount_amount
- subtotal
- tax_amount
- grand_total
- status ('draft', 'sent', 'accepted', 'rejected')
- deleted_at
```

#### quotation_items
```sql
- id (PK)
- quotation_id (FK)
- product_id (FK, nullable)
- product_name
- description
- quantity
- unit_price
- gst_percentage
- hsn_code
- line_total
```

#### purchase_orders
```sql
- id (PK)
- franchise_id (FK)
- po_number (unique)
- supplier_id (FK)
- po_date
- expected_delivery_date
- status ('pending', 'confirmed', 'shipped', 'delivered')
- amount
- tax_amount
- discount_amount
- grand_total
- notes
- created_at, deleted_at
```

#### purchase_order_items
```sql
- id (PK)
- po_id (FK)
- product_id (FK, nullable)
- product_name
- quantity
- unit_price
- tax_rate
- line_total
```

#### suppliers
```sql
- id (PK)
- franchise_id (FK)
- name
- email
- phone
- address, city, state
- country
- postal_code
- contact_person
- gst_number
- payment_terms
- is_active
- deleted_at
```

## API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login (returns JWT token)
POST   /api/auth/logout        - Logout
GET    /api/auth/profile       - Get current user
POST   /api/auth/change-password
POST   /api/auth/refresh-token
```

### Franchises (Super Admin)
```
GET    /api/franchises         - Get all with pagination
GET    /api/franchises/:id     - Get specific
POST   /api/franchises         - Create
PUT    /api/franchises/:id     - Update
DELETE /api/franchises/:id     - Delete (soft)
```

### Products
```
GET    /api/products           - Get franchise products
GET    /api/products/:id       - Get specific
POST   /api/products           - Create
PUT    /api/products/:id       - Update
DELETE /api/products/:id       - Delete
GET    /api/products/low-stock - Get low stock items
```

### Invoices
```
GET    /api/invoices           - Get franchise invoices
GET    /api/invoices/:id       - Get specific
POST   /api/invoices           - Create
PUT    /api/invoices/:id       - Update
DELETE /api/invoices/:id       - Delete
GET    /api/invoices/report/revenue - Revenue report
```

### Quotations
```
GET    /api/quotations         - Get franchise quotations
GET    /api/quotations/:id     - Get specific
POST   /api/quotations         - Create
PUT    /api/quotations/:id     - Update
DELETE /api/quotations/:id     - Delete
```

### Purchase Orders
```
GET    /api/purchase-orders    - Get franchise POs
GET    /api/purchase-orders/:id - Get specific
POST   /api/purchase-orders    - Create
PUT    /api/purchase-orders/:id - Update
DELETE /api/purchase-orders/:id - Delete
PATCH  /api/purchase-orders/:id/status - Update status
```

### Users
```
GET    /api/users              - Get all users (Super Admin)
GET    /api/users/franchise/:id - Get franchise users
GET    /api/users/:id          - Get specific
POST   /api/users              - Create
PUT    /api/users/:id          - Update
DELETE /api/users/:id          - Delete
PATCH  /api/users/:id/activate - Activate user
PATCH  /api/users/:id/deactivate - Deactivate user
```

### Suppliers
```
GET    /api/suppliers          - Get suppliers
GET    /api/suppliers/:id      - Get specific
POST   /api/suppliers          - Create
PUT    /api/suppliers/:id      - Update
DELETE /api/suppliers/:id      - Delete
```

## Authentication & Authorization

### JWT Token Flow
1. User logs in with email/password
2. Backend hashes password with bcryptjs, verifies against DB
3. If valid, generates JWT token with {userId, franchiseId, role}
4. Token expires in 24 hours
5. Client stores token in localStorage
6. Token sent in every request: `Authorization: Bearer {token}`
7. `verifyToken` middleware validates token on protected routes
8. Token refreshed via `/auth/refresh-token` endpoint

### Roles & Access Control
- **Super Admin**: Access to all endpoints, all franchises
- **Franchise Owner**: Access to own franchise data only
- **Manager**: Limited to products, invoices, reports
- **Staff**: Read-only access to products

### `authorizeRole` Middleware
```javascript
authorizeRole(['Super Admin', 'Franchise Owner'])(req, res, next)
// Checks user.role against allowed roles
```

## Controllers

### Authentication Controller
- `register(username, email, password, franchiseId, roleId)`
- `login(email, password)` → returns token + user data
- `logout()` → clears session
- `getProfile()` → returns current user
- `changePassword(oldPassword, newPassword)`
- `refreshToken(refreshToken)` → new JWT

### Franchise Controller (Super Admin)
- `create(franchiseData)` → returns created franchise
- `getAll(limit, offset)` → paginated list
- `getById(id)` → specific franchise
- `update(id, data)` → update fields
- `delete(id)` → soft delete (marks deleted_at)

### Product Controller
- `create(productData)` → validate SKU uniqueness per franchise
- `getAll(limit, offset)` → franchise-scoped products
- `getById(id)` → specific product
- `update(id, data)` → update fields (name, price, GST, etc.)
- `delete(id)` → soft delete
- `getLowStock()` → products below reorder level

### Invoice Controller
- `create(invoiceData)` → auto-generate invoice number
- `getAll(limit, offset)` → franchise-scoped invoices
- `getById(id)` → includes items array
- `update(id, data)` → update amounts, payment status
- `delete(id)` → soft delete
- `getRevenue()` → revenue report by date range

### Quotation Controller
- `create(quotationData)` → auto-generate quotation number (QT-2025-001)
- `getAll(limit, offset)` → franchise-scoped
- `getById(id)` → includes items and customer details
- `update(id, data)` → update items, letter body, terms template
- `delete(id)` → soft delete
- Features: Letter templates, T&C templates, two types support

### Purchase Order Controller
- `create(poData)` → auto-generate PO number
- `getAll(limit, offset)` → franchise-scoped
- `getById(id)` → includes items
- `update(id, data)` → update items, dates
- `updateStatus(id, status)` → pending → confirmed → shipped → delivered
- `delete(id)` → soft delete

### User Controller
- `create(userData)` → validate email uniqueness, hash password
- `getAll()` → all users (Super Admin only)
- `getByFranchise(franchiseId)` → franchise users
- `getById(id)` → specific user
- `update(id, data)` → update profile/password
- `delete(id)` → soft delete
- `activate(id)` → set is_active = 1
- `deactivate(id)` → set is_active = 0

## Response Format

### Success Response
```javascript
{
  success: true,
  message: "Action completed",
  data: { ...resource },
  timestamp: "2025-01-15T10:30:00Z"
}
```

### Error Response
```javascript
{
  success: false,
  message: "Error description",
  errorCode: "VALIDATION_ERROR",
  details: {...}
}
```

### Pagination
```javascript
{
  success: true,
  data: [...items],
  pagination: {
    limit: 100,
    offset: 0,
    total: 250,
    page: 1,
    totalPages: 3
  }
}
```

## Utilities

### helpers.js
- `generateQuotationNumber(franchiseId)` → format: QT-2025-001
- Gets last quotation number from DB
- Increments serial by 1, pads to 3 digits
- Returns combined with current financial year

### database.js
- `query(sql, params)` → execute SELECT/INSERT queries
- `queryOne(sql, params)` → get single row
- Returns Promise with results
- Handles connection pooling

### response.js
- `sendSuccess(res, message, data, statusCode)`
- `sendError(res, message, statusCode)`
- Consistent response formatting for all endpoints

## Middleware

### verifyToken
```javascript
// Checks Authorization header for valid JWT
// Adds req.user = {id, franchiseId, role}
// Returns 401 if token missing or invalid
```

### authorizeRole
```javascript
// Checks req.user.role against allowed roles
// Returns 403 if role not authorized
authorizeRole(['Super Admin'])(req, res, next)
```

### handleErrors
```javascript
// Global error handler
// Catches all errors and returns consistent error response
// Logs errors to console/file
```

## Database Setup

### Initial Setup
```bash
cd backend
npm install
node migrate.js    # Create tables and seed data
```

### Verify Database
```bash
node check_db.js   # Check connection and tables
```

### Test API
```bash
node test_api.js   # Test auth endpoints
node test_franchises.js  # Test CRUD operations
```

## Key Features Implemented

### Multi-Tenant Architecture
✅ All data scoped to franchise_id
✅ Row-level security via where clauses
✅ Soft deletes (deleted_at timestamp)
✅ Audit logging on key operations

### Authentication
✅ JWT tokens (24-hour expiry)
✅ Password hashing with bcryptjs
✅ Refresh token mechanism
✅ Role-based access control

### Data Validation
✅ Email format validation
✅ Password strength requirements
✅ Unique constraints (SKU per franchise, email)
✅ Required field checking

### Error Handling
✅ Try-catch in all controllers
✅ Consistent error response format
✅ Proper HTTP status codes (200, 201, 400, 401, 403, 500)
✅ User-friendly error messages

### Quotations
✅ Letter templates (editable)
✅ Terms & Conditions templates (3 types)
✅ Two quotation types (with_rates, without_rates)
✅ Auto-calculate totals with GST
✅ Shorter quotation number format (QT-2025-001)

## Recent Changes (Phase 2)

### Quotation Numbering
Changed from: `QT-2025-2026-0001`
Changed to: `QT-2025-001` (shorter, financial year -based)

### Terms Template Support
Added: `terms_template_id` field to quotations table
Added: 3 pre-made T&C templates (Standard, Premium, Basic)
Updated: Quotation response includes selected template content

### GST Handling
✅ Products table includes `gst_percentage`
✅ Quotation items track `gst_percentage`
✅ Auto-calculate item totals with GST
✅ Support for item-level GST variation

### Customer Management
✅ GST number is now optional
✅ No validation error if GST not provided
✅ Duplicate check only for provided GST numbers

## Performance Optimizations

### Database Queries
- Indexed: id, franchise_id, deleted_at
- Indexed: email (users), sku (products), quotation_number
- Using LIMIT/OFFSET for pagination
- Proper foreign key relationships

### Connection Pooling
- MySQL connection pool configured
- Reuses connections across requests
- Configurable pool size

### Caching Opportunities
- Token verification cached by expiry
- Franchise data cached (infrequently changes)
- Product list cached with TTL

## Deployment

### Production Environment
```bash
NODE_ENV=production
DB_HOST=prod-mysql-server
DB_USER=prod_user
DB_PASSWORD=secure_password
JWT_SECRET=long_random_secret
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 5000
CMD ["npm", "start"]
```

## Troubleshooting

### Database Connection Failed
Check: MySQL running, host/user/password correct, network access

### JWT Token Errors
Check: Token in Authorization header, token not expired, secret matches

### 403 Forbidden Errors
Check: User role, franchise access, middleware order in routes

### Duplicate Entry Errors
Check: SKU, email uniqueness per scope, transaction rollback

## Dependencies

- **express**: ^4.18.0 - Web framework
- **mysql2**: ^3.6.0 - MySQL driver
- **jsonwebtoken**: ^9.1.0 - JWT tokens
- **bcryptjs**: ^2.4.3 - Password hashing
- **cors**: ^2.8.5 - Cross-origin requests
- **dotenv**: ^16.3.1 - Environment variables

