# Pavtibook Frontend

React-based responsive frontend for Pavtibook - Inventory Management with Billing System.

## Setup & Installation

### Prerequisites
- Node.js 16+
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
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Pavtibook
```

3. **Start Development Server**
```bash
npm run dev
```

Server will run on: `http://localhost:3000`

## Building & Deployment

**Production Build:**
```bash
npm run build
```

**Preview Build:**
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── context/         # State management (Zustand)
│   ├── hooks/           # Custom React hooks
│   ├── styles/          # Global styles
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
├── package.json         # Dependencies
└── README.md
```

## Features

### Authentication
- Login/Register with JWT
- Token refresh mechanism
- Secure password handling
- Role-based routing

### Responsive Design
- Mobile-first approach
- Tailwind CSS for styling
- Fully responsive layouts
- Touch-friendly UI

### State Management
- Zustand for global state
- Auth state persistence
- Easy state updates

### API Integration
- Axios client with interceptors
- Automatic token injection
- Error handling
- Loading states

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI framework |
| react-router-dom | ^6.20.0 | Routing |
| axios | ^1.6.0 | HTTP client |
| tailwindcss | ^3.3.6 | Styling |
| zustand | ^4.4.1 | State management |
| react-hot-toast | ^2.4.1 | Notifications |
| lucide-react | ^0.292.0 | Icons |

## Development Tips

- Use `npm run dev` for development with hot reload
- Components are in `src/components/`
- Pages are in `src/pages/`
- Global styles in `src/styles/index.css`
- API calls go through `src/services/`

## Available Pages

### Public
- `/login` - User login
- `/register` - User registration

### Super Admin
- `/dashboard` - Admin dashboard with stats
- `/franchises` - Manage franchises
- `/settings` - Global settings

### Franchise Owner
- `/dashboard` - Franchise dashboard
- `/products` - Product management
- `/invoices` - Invoice management
- `/purchase-orders` - PO management
- `/users` - Team member management
- `/settings` - Franchise settings

## Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Performance Optimization

- Code splitting with Vite
- Image optimization
- CSS minification
- JavaScript minification
- Lazy loading routes

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Troubleshooting

**Port 3000 already in use:**
```bash
npm run dev -- --port 3001
```

**Node modules issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**API connection issues:**
Check that backend is running on the configured URL in `.env`

## Additional Notes

- All API calls require authentication token
- Token is automatically injected in requests
- Token refresh happens automatically on 401 errors
- Check browser console for detailed error logs
