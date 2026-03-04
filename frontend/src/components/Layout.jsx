import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Menu, X, LogOut, User, Settings } from 'lucide-react'
import { useAuthStore } from '../context/authStore'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const getPageTitle = () => {
    const path = location.pathname
    const titles = {
      '/dashboard': 'Dashboard',
      '/franchises': 'Franchises',
      '/settings': 'Settings',
      '/products': 'Products',
      '/invoices': 'Invoices',
      '/quotations': 'Quotations',
      '/purchase-orders': 'Purchase Orders',
      '/users': 'Users',
      '/customers': 'Customers',
      '/suppliers': 'Suppliers',
      '/purchase-bills': 'Purchase Bills'
    }
    return titles[path] || 'Dashboard'
  }

  const menuItems = user?.role === 'Super Admin' 
    ? [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Franchises', path: '/franchises' },
        { label: 'Users', path: '/users' },
        { label: 'Settings', path: '/settings' }
      ]
    : [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Products', path: '/products' },
        { label: 'Customers', path: '/customers' },
        { label: 'Suppliers', path: '/suppliers' },
        { label: 'Invoices', path: '/invoices' },
        { label: 'Quotations', path: '/quotations' },
        { label: 'Purchase Orders', path: '/purchase-orders' },
        { label: 'Purchase Bills', path: '/purchase-bills' },
        { label: 'Users', path: '/users' },
        { label: 'Settings', path: '/settings' }
      ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Sticky on desktop, fixed on mobile */}
      <aside className={`${isMobile ? 'fixed' : 'sticky'} md:sticky top-0 left-0 h-screen z-40 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out overflow-y-auto ${
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-64'
      }`}>
        <div className="p-4 flex items-center justify-between">
          {<h1 className="text-xl font-bold hidden md:block">Pavtibook</h1>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-8 space-y-2 px-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path)
                closeSidebarOnMobile()
              }}
              className={`w-full text-left px-4 py-2 rounded transition ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-800">
          <div className="px-4 py-2 mb-2 hidden md:block">
            <p className="text-sm font-semibold truncate">{user?.email}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white screen-only shadow px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg hidden sm:block">
              <User size={20} />
            </button>
            <button
              onClick={() => {
                navigate('/settings')
                closeSidebarOnMobile()
              }}
              className="p-2 hover:bg-gray-100 rounded-lg hidden sm:block"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm md:text-base"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
