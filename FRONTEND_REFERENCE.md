# FRONTEND REFERENCE GUIDE

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 - Main app with routing
│   ├── main.jsx               - React entry point
│   ├── components/
│   │   ├── Layout.jsx         - Main layout with sidebar
│   │   ├── PrivateRoute.jsx   - Protected route wrapper
│   │   ├── DataTable.jsx      - Reusable table component
│   │   └── InvoicePreviewModal.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx      - Authentication
│   │   ├── RegisterPage.jsx   - User registration
│   │   ├── AdminDashboard.jsx - Super Admin dashboard
│   │   ├── FranchiseDashboard.jsx - Franchise dashboard
│   │   ├── FranchisesPage.jsx - Franchise CRUD (Super Admin)
│   │   ├── ProductsPage.jsx   - Product inventory
│   │   ├── InvoicesPage.jsx   - Invoice management
│   │   ├── InvoicePrint.jsx   - Invoice printing
│   │   ├── QuotationsPage.jsx - Quotation creation
│   │   ├── QuotationPrint.jsx - Quotation printing (old)
│   │   ├── QuotationPrintNew.jsx - Quotation printing (new with templates)
│   │   ├── PurchaseOrdersPage.jsx - PO management
│   │   ├── PurchaseBillsPage.jsx  - Bill upload & OCR
│   │   ├── SuppliersPage.jsx  - Supplier CRUD
│   │   ├── UsersPage.jsx      - Team management
│   │   └── SettingsPage.jsx   - Account settings
│   ├── services/
│   │   └── services.js        - API service layer
│   ├── context/
│   │   └── AuthContext.jsx    - Authentication context
│   ├── constants/
│   │   └── quotationTemplates.js - Letter & T&C templates
│   ├── utils/
│   │   ├── pdfExtractor.js    - PDF/OCR extraction
│   │   └── helpers.js         - Utility functions
│   └── index.css              - Global styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Key Pages & Features

### Authentication
- **LoginPage.jsx** - Email/password login with JWT token
- **RegisterPage.jsx** - User registration (franchise selection)
- Credentials: `admin@pavtibook.com` / `Admin@123`

### Dashboard
- **AdminDashboard.jsx** (Super Admin)
  - Franchise count, user count, revenue
  - Recent franchises table
  - Stat cards with icons

- **FranchiseDashboard.jsx** (Franchise Owner)
  - Invoice count, product count, revenue  
  - Low stock items alert
  - Recent invoices

### Franchises (Super Admin Only)
- **FranchisesPage.jsx**
  - Create new franchises
  - Edit franchise details
  - Delete franchises (soft delete)
  - Table with pagination
  - Fields: name, email, phone, address, city, state, country

### Products
- **ProductsPage.jsx**
  - Create products with SKU, name, category
  - Set pricing: cost price, selling price
  - Track reorder levels
  - Edit/delete products
  - Searchable table with pagination

### Invoices
- **InvoicesPage.jsx**
  - Create sales invoices
  - Add line items (quantity, price, tax)
  - Set payment status (pending, partial, paid)
  - Edit/delete invoices
  - Responsive items table

- **InvoicePrint.jsx**
  - Professional invoice template
  - A4 sized for printing
  - All invoice details with items
  - Grand total calculation

### Quotations
- **QuotationsPage.jsx**
  - Create quotations (2 types)
  - Type 1: With item rates (detailed pricing)
  - Type 2: Summary only (qty only)
  - Customer selection or quick add
  - Items management with inline editing
  - Auto-calculated totals

- **QuotationPrintNew.jsx**
  - Two-page professional format
  - Page 1: Letter-style body
  - Page 2: Items table & totals
  - Editable in print view
  - Terms & Conditions templates (3 options)
  - Features:
    - T&C template selector (Standard/Premium/Basic)
    - Product search in dropdown
    - Auto-fetch GST from products
    - Dynamic GST calculation per item
    - Shorter quotation number format (QT-2025-001)

### Purchase Orders
- **PurchaseOrdersPage.jsx**
  - Create POs with suppliers
  - Status tracking: pending → confirmed → shipped → delivered
  - Items with quantities and pricing
  - Edit/delete capabilities

### Purchase Bills
- **PurchaseBillsPage.jsx**
  - Upload invoice PDFs/images
  - OCR extraction using Tesseract.js
  - Auto-populate bill items
  - Manual entry fallback
  - Product and supplier linking

### Users
- **UsersPage.jsx**
  - Create users with roles (Super Admin, Franchise Owner, Manager, Staff)
  - Assign to franchises
  - Manage passwords
  - Activate/deactivate users
  - Super Admin can manage all users
  - Franchise Owner manages their team

### Settings
- **SettingsPage.jsx**
  - General tab: timezone, language
  - Security tab: change password
  - Account info update

## Services Layer

### API Service Methods

```javascript
// Authentication
authService.login(email, password)
authService.register(data)
authService.logout()

// Franchises
franchiseService.getAll(limit, offset)
franchiseService.getById(id)
franchiseService.create(data)
franchiseService.update(id, data)
franchiseService.delete(id)

// Products
productService.getAll(limit, offset)
productService.getById(id)
productService.create(data)
productService.update(id, data)
productService.delete(id)

// Invoices
invoiceService.getAll(limit, offset)
invoiceService.getById(id)
invoiceService.create(data)
invoiceService.update(id, data)
invoiceService.delete(id)

// Quotations
quotationService.getAll(limit, offset)
quotationService.getById(id)
quotationService.create(data)
quotationService.update(id, data)
quotationService.delete(id)

// Purchase Orders
purchaseOrderService.getAll(limit, offset)
purchaseOrderService.getById(id)
purchaseOrderService.create(data)
purchaseOrderService.update(id, data)
purchaseOrderService.delete(id)

// Users
userService.getAll()
userService.getByFranchise(franchiseId)
userService.getById(id)
userService.create(data)
userService.update(id, data)
userService.delete(id)
```

## State Management

### AuthContext
- Manages login/logout state
- Stores JWT token in localStorage
- User info: id, role, franchiseId
- Provides auth state to entire app

### React Hooks
- `useState()` - Form state, UI toggles, loading states
- `useEffect()` - Data fetching, cleanup
- `useNavigate()` - Page navigation
- `useParams()` - URL parameters
- `useContext()` - Auth context access

## Styling

### Tailwind CSS
- Responsive classes: sm:, md:, lg:
- Color palette: blue, gray, green, red, amber
- Spacing: px-*, py-*, mb-*, gap-*
- Flex layouts: flex, flex-col, justify-between, items-center
- Borders: border, border-b, border-gray-300
- Shadows: shadow, shadow-lg

### Print Styles
```css
@media print {
  .screen-only { display: none; }
  .print-only { display: block; }
  /* Reset margins/padding for printing */
}
```

## Form Validation

### Client-Side Validation
- Required field checks
- Email format validation
- Number range validation (min, max)
- Password strength checking
- Form state tracking

### Error Handling
- API error messages shown via toast notifications
- User-friendly error messages
- Loading states during API calls
- Validation error feedback before submission

## Toast Notifications

```javascript
import toast from 'react-hot-toast'

toast.success('Item created successfully')
toast.error('Failed to save item')
toast.loading('Processing...')
```

## Recent Changes (Phase 2)

### Quotation Improvements
✅ Added Terms & Conditions templates (3 types)
✅ Shorter quotation number format (QT-2025-001)
✅ Product search with dropdown
✅ Auto-fetch GST from products
✅ Fixed gross total calculation
✅ Responsive customer dropdown

### Features Working
✅ Multiple quotation types support
✅ Letter templates (editable)
✅ Professional 2-page layout
✅ Print-ready formatting
✅ Customer quick-add in form

## Responsive Design

### Breakpoints
- **Mobile** (<640px): Single column, mobile optimized
- **Tablet** (640-1024px): 2 column grids
- **Desktop** (>1024px): Full multi-column layouts

### Mobile Optimization
- Hamburger menu for sidebar
- Collapsible table columns
- Touch-friendly buttons (44px+ height)
- Vertical form layouts
- Optimized font sizes

## Development Tips

### Adding New Page
1. Create new file in `pages/`
2. Add route in `App.jsx`
3. Create service methods if needed
4. Use Layout.jsx for consistent UI
5. Add sidebar link in Layout.jsx

### Adding API Endpoint
1. Add method to appropriate service in `services/services.js`
2. Follow existing patterns (error handling, response format)
3. Use `toast` for user feedback
4. Test with backend API

### Common Patterns
```javascript
// Data fetching with loading state
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetch = async () => {
    try {
      const res = await service.getAll()
      setData(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetch()
}, [])

// Form handling
const [form, setForm] = useState({...})
const handleChange = (e) => {
  const {name, value} = e.target
  setForm(prev => ({...prev, [name]: value}))
}
const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await service.create(form)
    toast.success('Created!')
    reset()
  } catch (err) {
    toast.error(err.message)
  }
}
```

## Build & Deployment

### Development
```bash
cd frontend
npm run dev  # Start dev server on port 3000
```

### Production Build
```bash
npm run build   # Creates dist/ folder
npm run preview # Preview production build locally
```

### Environment Variables
Create `.env` file:
```
VITE_API_URL=http://localhost:5000
```

## Dependencies

- **react**: ^18.2.0 - UI library
- **react-router-dom**: ^6.20.0 - Routing
- **axios**: ^1.6.0 - HTTP requests
- **tailwindcss**: ^3.3.6 - Styling
- **lucide-react**: ^0.292.0 - Icons
- **react-hot-toast**: ^2.4.1 - Notifications
- **zustand**: ^4.4.1 - State management
- **tesseract.js**: ^7.0.0 - OCR extraction
- **recharts**: ^2.10.3 - Charts (future)
- **date-fns**: ^2.30.0 - Date handling

## Troubleshooting

### Page Blank After Login
Check: AuthContext provides token, PrivateRoute validates, routes in App.jsx

### API Calls Failing
Check: Backend running on 5000, token in headers, CORS enabled

### Styling Issues
Check: Tailwind CSS config, PostCSS setup, build process

### Performance Issues
Check: useCallback for memoization, lazy loading pages, image optimization

