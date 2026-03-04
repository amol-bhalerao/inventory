// README for Backend
# Pavtibook Backend

Backend API for Pavtibook - Inventory Management with Billing System.

## Setup & Installation

### Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- npm 8+

### Installation Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Setup Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pavtibook_db

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

APP_PORT=5000
CORS_ORIGIN=http://localhost:3000
```

3. **Create Database**
```bash
mysql -u root -p < src/database/migrations/001_initial_schema.sql
```

4. **Start Server**
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server will run on: `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh-token` - Refresh access token

### Franchises
- `GET /api/franchises` - Get all franchises (Super Admin)
- `GET /api/franchises/:id` - Get franchise by ID
- `POST /api/franchises` - Create franchise (Super Admin)
- `PUT /api/franchises/:id` - Update franchise
- `DELETE /api/franchises/:id` - Delete franchise (Super Admin)
- `PATCH /api/franchises/:id/app-name` - Change app name (whitelabel)

### Users
- `GET /api/users/franchise/:franchiseId` - Get users by franchise
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/activate` - Activate user
- `PATCH /api/users/:id/deactivate` - Deactivate user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/low-stock` - Get low stock products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `GET /api/invoices/report/revenue` - Get revenue report
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Purchase Orders
- `GET /api/purchase-orders` - Get all purchase orders
- `GET /api/purchase-orders/:id` - Get PO by ID
- `POST /api/purchase-orders` - Create purchase order
- `PUT /api/purchase-orders/:id` - Update purchase order
- `PATCH /api/purchase-orders/:id/status` - Update PO status
- `DELETE /api/purchase-orders/:id` - Delete purchase order

### Dashboard
- `GET /api/dashboard/admin` - Get Super Admin dashboard
- `GET /api/dashboard/franchise` - Get Franchise Owner dashboard

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/       # Business logic
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   ├── database/
│   │   └── migrations/   # Database migrations
│   └── server.js         # Main server file
├── package.json
├── .env.example
└── README.md
```

## Authentication

All endpoints (except login & register) require JWT authentication.

**Header:**
```
Authorization: Bearer <token>
```

## Error Handling

API returns standardized error responses:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

## Testing

```bash
npm test
```

## Development Tips

- Check logs in `./logs` directory
- Database queries logged when development mode is enabled
- Audit logs stored in `audit_logs` table

## Deployment

See main project documentation for Hostinger deployment instructions.
