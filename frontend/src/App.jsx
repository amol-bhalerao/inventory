import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './context/authStore'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import FranchiseDashboard from './pages/FranchiseDashboard'
import ProductsPage from './pages/ProductsPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoicePrint from './pages/InvoicePrint'
import QuotationsPage from './pages/QuotationsPage'
import QuotationPrintNew from './pages/QuotationPrintNew'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import UsersPage from './pages/UsersPage'
import FranchisesPage from './pages/FranchisesPage'
import SettingsPage from './pages/SettingsPage'
import CustomersPage from './pages/CustomersPage'
import SuppliersPage from './pages/SuppliersPage'
import PurchaseBillsPage from './pages/PurchaseBillsPage'

// Components
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'

function App() {
  const { user } = useAuthStore()

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              {/* Dashboard - Both roles can access */}
              <Route 
                path="/dashboard" 
                element={user?.role === 'Super Admin' ? <AdminDashboard /> : <FranchiseDashboard />} 
              />

              {/* Super Admin Routes */}
              <Route path="/franchises" element={user?.role === 'Super Admin' ? <FranchisesPage /> : <Navigate to="/dashboard" replace />} />

              {/* Franchise Owner Routes */}
              <Route path="/invoices" element={user?.role === 'Franchise Owner' ? <InvoicesPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/invoices/:id/print" element={user?.role === 'Franchise Owner' ? <InvoicePrint /> : <Navigate to="/dashboard" replace />} />
              <Route path="/quotations" element={user?.role === 'Franchise Owner' ? <QuotationsPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/quotations/:id/print" element={user?.role === 'Franchise Owner' ? <QuotationPrintNew /> : <Navigate to="/dashboard" replace />} />
              <Route path="/purchase-orders" element={user?.role === 'Franchise Owner' ? <PurchaseOrdersPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/products" element={user?.role === 'Franchise Owner' ? <ProductsPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/customers" element={user?.role === 'Franchise Owner' ? <CustomersPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/suppliers" element={user?.role === 'Franchise Owner' ? <SuppliersPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/purchase-bills" element={user?.role === 'Franchise Owner' ? <PurchaseBillsPage /> : <Navigate to="/dashboard" replace />} />
              
              {/* Users - Super Admin and Franchise Owner */}
              <Route path="/users" element={user?.role === 'Super Admin' || user?.role === 'Franchise Owner' ? <UsersPage /> : <Navigate to="/dashboard" replace />} />

              {/* Both roles can access */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}

export default App
