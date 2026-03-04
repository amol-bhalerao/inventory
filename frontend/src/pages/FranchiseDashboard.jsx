import { useEffect, useState } from 'react'
import { dashboardService, productService, invoiceService } from '../services/services'
import toast from 'react-hot-toast'
import { FileText, Package, DollarSign, AlertCircle, RefreshCw, Eye, Printer, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'

export default function FranchiseDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [data, setData] = useState({
    totalInvoices: 0,
    totalProducts: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    recentInvoices: []
  })
  const [allProducts, setAllProducts] = useState([])
  const [allInvoices, setAllInvoices] = useState([])

  useEffect(() => {
    fetchDashboardData()
    fetchProductsAndInvoices()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await dashboardService.getFranchiseDashboard()

      if (response && response.success) {
        setData(response.data || {
          totalInvoices: 0,
          totalProducts: 0,
          totalRevenue: 0,
          lowStockProducts: 0,
          recentInvoices: []
        })
      } else {
        setData({
          totalInvoices: 0,
          totalProducts: 0,
          totalRevenue: 0,
          lowStockProducts: 0,
          recentInvoices: []
        })
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setData({
        totalInvoices: 0,
        totalProducts: 0,
        totalRevenue: 0,
        lowStockProducts: 0,
        recentInvoices: []
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProductsAndInvoices = async () => {
    try {
      setProductsLoading(true)
      setInvoicesLoading(true)

      const [productsRes, invoicesRes] = await Promise.all([
        productService.getAll({ limit: 1000, offset: 0 }),
        invoiceService.getAll({ limit: 1000, offset: 0 })
      ])

      console.debug('Dashboard products response:', productsRes)
      console.debug('Dashboard invoices response:', invoicesRes)

      // Normalize products response shape
      let productsList = []
      if (!productsRes) {
        productsList = []
      } else if (Array.isArray(productsRes)) {
        productsList = productsRes
      } else if (productsRes.data) {
        productsList = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.products || [])
      } else if (productsRes.products) {
        productsList = productsRes.products
      } else if (productsRes.success) {
        const possible = Object.values(productsRes).find(v => Array.isArray(v))
        productsList = possible || []
      }
      setAllProducts(productsList)

      // Normalize invoices response shape
      let invoicesList = []
      if (!invoicesRes) {
        invoicesList = []
      } else if (Array.isArray(invoicesRes)) {
        invoicesList = invoicesRes
      } else if (invoicesRes.data) {
        invoicesList = Array.isArray(invoicesRes.data) ? invoicesRes.data : (invoicesRes.data.invoices || [])
      } else if (invoicesRes.invoices) {
        invoicesList = invoicesRes.invoices
      } else if (invoicesRes.success) {
        const possible = Object.values(invoicesRes).find(v => Array.isArray(v))
        invoicesList = possible || []
      }
      setAllInvoices(invoicesList)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setProductsLoading(false)
      setInvoicesLoading(false)
    }
  }

  const handleOpenInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}/print`)
  }

  // Calculate stock summary statistics
  const getStockSummary = () => {
    if (!allProducts || allProducts.length === 0) {
      return {
        totalItems: 0,
        totalValue: 0,
        averagePrice: 0,
        lowStockItems: [],
        outOfStockItems: []
      }
    }

    const totalItems = allProducts.reduce((sum, p) => sum + (p.quantity_on_hand || 0), 0)
    const totalValue = allProducts.reduce((sum, p) => sum + ((p.quantity_on_hand || 0) * (p.purchase_price || 0)), 0)
    const averagePrice = allProducts.length > 0 ? totalValue / allProducts.length : 0

    const lowStockItems = allProducts
      .filter(p => p.quantity_on_hand > 0 && p.quantity_on_hand <= (p.reorder_level || 5))
      .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand)
      .slice(0, 5)

    const outOfStockItems = allProducts
      .filter(p => !p.quantity_on_hand || p.quantity_on_hand === 0)
      .slice(0, 5)

    return {
      totalItems,
      totalValue,
      averagePrice,
      lowStockItems,
      outOfStockItems
    }
  }

  const stockSummary = getStockSummary()

  const invoiceColumns = [
    { key: 'invoice_number', label: 'Invoice #', sortable: true },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: true,
      searchable: true
    },
    {
      key: 'invoice_date',
      label: 'Date',
      sortable: true,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      key: 'total_amount',
      label: 'Amount',
      sortable: true,
      render: (amount) => `₹${Number(amount).toFixed(2)}`
    },
    {
      key: 'payment_status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'paid'
          ? 'bg-green-100 text-green-800'
          : status === 'partial'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
          }`}>
          {status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, invoice) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenInvoice(invoice.id)}
            className="text-blue-600 hover:text-blue-800 transition"
            title="View / Print"
          >
            <Eye size={18} />
          </button>
        </div>
      )
    }
  ]

  const productColumns = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      searchable: true
    },
    { key: 'sku', label: 'SKU', sortable: true },
    {
      key: 'quantity_on_hand',
      label: 'Stock',
      sortable: true,
      render: (qty) => (
        <span className={qty <= 10 ? 'text-red-600 font-semibold' : ''}>
          {qty}
        </span>
      )
    },
    {
      key: 'selling_price',
      label: 'Price',
      sortable: true,
      render: (price) => `₹${Number(price).toFixed(2)}`
    },
    {
      key: 'gst_percentage',
      label: 'GST %',
      sortable: true,
      render: (gst) => `${gst}%`
    }
  ]

  const Skeleton = ({ className = '' }) => (
    <div className={`bg-gray-200 animate-pulse ${className}`}></div>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>

          {/* Tables Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => {
              fetchDashboardData()
              fetchProductsAndInvoices()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Invoices</h3>
                <p className="text-3xl font-bold text-gray-900">{data?.totalInvoices || 0}</p>
              </div>
              <FileText size={40} className="text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Products</h3>
                <p className="text-3xl font-bold text-gray-900">{data?.totalProducts || 0}</p>
              </div>
              <Package size={40} className="text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold text-gray-900">₹{Number(data?.totalRevenue || 0).toFixed(2)}</p>
              </div>
              <DollarSign size={40} className="text-purple-500 opacity-20" />
            </div>
          </div>

          <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${data?.lowStockProducts > 0 ? 'border-orange-500' : 'border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Low Stock Items</h3>
                <p className={`text-3xl font-bold ${data?.lowStockProducts > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {data?.lowStockProducts || 0}
                </p>
              </div>
              <AlertCircle size={40} className={`${data?.lowStockProducts > 0 ? 'text-orange-500' : 'text-gray-300'} opacity-20`} />
            </div>
          </div>
        </div>

        {/* Recent Invoices and Products Section (stack on small, two-col on lg+) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stock Summary Cards (left on large screens) */}
          <div className="flex-1 space-y-6">
            {/* Inventory Value Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
              <h3 className="text-gray-600 text-sm font-medium mb-2">Total Inventory Value</h3>
              <p className="text-3xl font-bold text-green-700">₹{Number(stockSummary.totalValue).toFixed(2)}</p>
              <p className="text-xs text-gray-600 mt-2">{stockSummary.totalItems} items in stock</p>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-orange-500">
              <div className="p-6 border-b border-orange-200 bg-orange-50">
                <div className="flex items-center gap-2">
                  <TrendingDown size={20} className="text-orange-600" />
                  <h2 className="text-lg font-bold text-orange-900">Low Stock Items</h2>
                </div>
              </div>
              {stockSummary.lowStockItems.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-green-50">
                  <p className="font-medium text-green-700">✓ All items have sufficient stock</p>
                </div>
              ) : (
                <div className="divide-y divide-orange-100">
                  {stockSummary.lowStockItems.map((product) => (
                    <div key={product.id} className="p-4 hover:bg-orange-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">{product.quantity_on_hand}</p>
                          <p className="text-xs text-gray-600">Reorder: {product.reorder_level || 5}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Out of Stock Items */}
            {stockSummary.outOfStockItems.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-red-500">
                <div className="p-6 border-b border-red-200 bg-red-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    <h2 className="text-lg font-bold text-red-900">Out of Stock ({stockSummary.outOfStockItems.length})</h2>
                  </div>
                </div>
                <div className="divide-y divide-red-100">
                  {stockSummary.outOfStockItems.map((product) => (
                    <div key={product.id} className="p-4 hover:bg-red-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.sku}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">OUT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Invoices and Products Tables (right on large screens) */}
          <div className="flex-1 space-y-6">
            {/* Recent Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Recent Invoices</h2>
              </div>
              {invoicesLoading ? (
                <div className="p-6 text-center text-gray-500">Loading invoices...</div>
              ) : (
                <DataTable
                  data={allInvoices}
                  columns={invoiceColumns}
                  itemsPerPageOptions={[5, 10, 25, 50]}
                />
              )}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Products</h2>
              </div>
              {productsLoading ? (
                <div className="p-6 text-center text-gray-500">Loading products...</div>
              ) : (
                <DataTable
                  data={allProducts}
                  columns={productColumns}
                  itemsPerPageOptions={[5, 10, 25, 50]}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

