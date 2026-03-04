# DOCUMENTATION SUMMARY

## What You Need to Know

### Quick Navigation

| Document | When to Read | Time |
|----------|--------------|------|
| [FRONTEND_REFERENCE.md](FRONTEND_REFERENCE.md) | Understanding UI, pages, components | 5 min |
| [BACKEND_REFERENCE.md](BACKEND_REFERENCE.md) | Understanding API, database, servers | 5 min |
| [README.md](README.md) | Project overview & setup | 3 min |
| [START_HERE.md](START_HERE.md) | First time? Start here | 2 min |

---

## Frontend Reference Contents

✅ Project folder structure  
✅ All 13 pages explained  
✅ Services & API methods  
✅ State management setup  
✅ Styling with Tailwind  
✅ Responsive design  
✅ Form & validation patterns  
✅ Toast notifications  
✅ Development tips  
✅ Common problems & fixes  

**Read this when**: "How does the React app work?"

---

## Backend Reference Contents

✅ Project folder structure  
✅ Database schema (10+ tables)  
✅ API endpoints (40+ routes)  
✅ Authentication & JWT tokens  
✅ Authorization & roles  
✅ Controllers & business logic  
✅ Response format standards  
✅ Error handling patterns  
✅ Connection pooling  
✅ Troubleshooting guide  

**Read this when**: "How do the APIs work?"

---

## System Credentials

```
Email:    admin@pavtibook.com
Password: Admin@123
Role:     Super Admin
```

## Service Ports

```
Frontend:  http://localhost:3000
Backend:   http://localhost:5000
Database:  localhost:3306 (MySQL)
```

## Quick Commands

```bash
# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm run dev

# Setup database
cd backend && node migrate.js

# Test API
cd backend && node test_api.js
```

---

## Key Features

✅ Multi-tenant architecture (franchises)  
✅ Role-based access control  
✅ Quotations with templates  
✅ Invoice management  
✅ Inventory tracking  
✅ Purchase orders  
✅ User management  
✅ Professional printing  
✅ PDF OCR extraction  
✅ Responsive design  

---

## What Each Page Does

### Users see these pages:

| Page | Purpose | Access |
|------|---------|--------|
| Dashboard | Overview & metrics | All |
| Products | Inventory management | Franchise Owner |
| Invoices | Sales tracking | Franchise Owner |
| Quotations | Professional quotes | Franchise Owner |
| Purchase Orders | Supplier orders | Franchise Owner |
| Users | Team management | Admin |
| Franchises | Multi-tenant setup | Super Admin |
| Settings | Profile & security | All |

---

## Database Structure (Quick Overview)

**10 Main Tables:**
- users, franchises, roles, permissions
- products, suppliers
- invoices, invoice_items
- quotations, quotation_items
- purchase_orders, purchase_order_items

**All use:** franchise_id for multi-tenant isolation + deleted_at for soft deletes

---

## API Structure

**40+ Endpoints organized by:**
- Authentication (login, register, tokens)
- Franchises (Super Admin only)
- Products (create, read, update, delete)
- Invoices (full CRUD)
- Quotations (full CRUD)
- Purchase Orders (full CRUD)
- Users (full CRUD)
- Suppliers (full CRUD)

**All endpoints:** Require JWT token + role authorization

---

## Recent Improvements

✅ Quotation number shortened: QT-2025-001 (was QT-2025-2026-0001)  
✅ Terms & Conditions templates added (3 types)  
✅ Product search in dropdown  
✅ Auto-fetch GST from products  
✅ Fixed calculation logic  
✅ Customer dropdown responsive fix  

---

## How to Use This Documentation

### Scenario 1: "I need to add a new page"
→ Read FRONTEND_REFERENCE.md → "Adding New Page" section

### Scenario 2: "API is returning an error"
→ Read BACKEND_REFERENCE.md → "Response Format" + "Troubleshooting"

### Scenario 3: "How do authentication tokens work?"
→ Read BACKEND_REFERENCE.md → "Authentication & Authorization" section

### Scenario 4: "What components are available?"
→ Read FRONTEND_REFERENCE.md → "Project Structure" section

### Scenario 5: "Database structure?"
→ Read BACKEND_REFERENCE.md → "Database Schema" section

---

## Common Tasks

### Create Quotation
FranchiseOwner → /quotations → Create → Pick items → Add T&C template → Print

### Manage Inventory
Products → Add product → Set price/GST → System tracks stock → Alert when low

### Process Invoice
Create → Add items → Calculate total → Set payment status → Print → Archive

### Track Purchase Order
Create with supplier → Add items → Update status (pending→confirmed→shipped→delivered)

---

## Testing

### Quick Test (2 minutes)
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Login: admin@pavtibook.com / Admin@123
4. Click around dashboard
5. ✅ Everything should work

### Full Test (30 minutes)
Follow FRONTEND_REFERENCE.md & BACKEND_REFERENCE.md examples

---

## Troubleshooting Map

| Problem | Solution | Reference |
|---------|----------|-----------|
| Blank page | Check backend running | BACKEND_REFERENCE.md |
| Login fails | Check database | BACKEND_REFERENCE.md |
| API error | Check JWT token | BACKEND_REFERENCE.md |
| Styling issues | Check Tailwind CSS | FRONTEND_REFERENCE.md |
| Performance slow | Check indexes | BACKEND_REFERENCE.md |

---

## File Organization

```
Keep updated:
- FRONTEND_REFERENCE.md    (for UI questions)
- BACKEND_REFERENCE.md     (for API questions)
- README.md                (overview)

Deleted (consolidated):
- SYSTEM_STATUS_REPORT.md
- API_DOCUMENTATION.md
- QUOTATION_PRINT_IMPROVEMENTS.md
- OCR_IMPLEMENTATION.md
- All other scattered .md files
```

---

**Everything is in 2 reference files now!**
- FRONTEND_REFERENCE.md
- BACKEND_REFERENCE.md

Use these for all future reference.

