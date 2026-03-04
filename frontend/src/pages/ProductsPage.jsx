import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { productService } from '../services/services'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    unit_price: '',
    selling_price: '',
    hsn_code: '',
    gst_percentage: '',
    quantity_on_hand: '',
    reorder_level: '',
    category: '',
    supplier_id: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await productService.getAll(100, 0)
      // Support multiple response shapes for robustness:
      // - apiClient may return response.data directly
      // - service wrappers may return { success, data }
      // - or { products: [...] }
      // Log for debugging in devtools
      console.debug('Products API response:', response)

      let list = []
      if (!response) {
        list = []
      } else if (Array.isArray(response)) {
        list = response
      } else if (response.products) {
        list = response.products
      } else if (response.data) {
        // backend returns { success, message, data: { products: [...] } }
        if (Array.isArray(response.data)) {
          list = response.data
        } else if (response.data.products) {
          list = response.data.products
        } else {
          // try to find any array in response.data
          const possible = Object.values(response.data).find(v => Array.isArray(v))
          list = possible || []
        }
      } else if (response.success) {
        // fallback: search top-level for any array
        const possible = Object.values(response).find(v => Array.isArray(v))
        list = possible || []
      } else {
        list = []
      }

      // ensure we always pass an array
      setProducts(Array.isArray(list) ? list : [])
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await productService.update(editingId, formData)
        toast.success('Product updated successfully')
      } else {
        await productService.create(formData)
        toast.success('Product created successfully')
      }
      setFormData({
        sku: '',
        name: '',
        description: '',
        unit_price: '',
        selling_price: '',
        hsn_code: '',
        gst_percentage: '',
        quantity_on_hand: '',
        reorder_level: '',
        category: '',
        supplier_id: ''
      })
      setEditingId(null)
      setShowForm(false)
      fetchProducts()
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      unit_price: product.purchase_price || product.unit_price || '',
      selling_price: product.selling_price || '',
      hsn_code: product.hsn_code || '',
      gst_percentage: product.gst_percentage || '',
      quantity_on_hand: product.quantity_on_hand || '',
      reorder_level: product.reorder_level || '',
      category: product.category || '',
      supplier_id: product.supplier_id || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(id)
        toast.success('Product deleted successfully')
        fetchProducts()
      } catch (error) {
        toast.error(error.message || 'Failed to delete product')
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      sku: '',
      name: '',
      description: '',
      unit_price: '',
      selling_price: '',
      hsn_code: '',
      gst_percentage: '',
      quantity_on_hand: '',
      reorder_level: '',
      category: '',
      supplier_id: ''
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading products...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add New'} Product</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU*</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product SKU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product description"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price*</label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Default: Cost + 20%)</label>
                <input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.unit_price ? (Number(formData.unit_price) * 1.2).toFixed(2) : "Will be calculated as Cost × 1.20"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                <input
                  type="text"
                  name="hsn_code"
                  value={formData.hsn_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="HSN/SAC Code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST % (0-28)</label>
                <input
                  type="number"
                  name="gst_percentage"
                  value={formData.gst_percentage}
                  onChange={handleInputChange}
                  min="0"
                  max="28"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="18.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                <input
                  type="number"
                  name="quantity_on_hand"
                  value={formData.quantity_on_hand}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Update' : 'Create'} Product
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={[
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Product Name' },
            {
              key: 'purchase_price',
              label: 'Cost Price',
              render: (value) => `₹${Number(value || 0).toFixed(2)}`
            },
            {
              key: 'selling_price',
              label: 'Selling Price',
              render: (value) => `₹${Number(value || 0).toFixed(2)}`
            },
            {
              key: 'quantity_on_hand',
              label: 'Stock',
              tdClassName: 'font-semibold',
              render: (value, row) => (
                <span className={value <= row.reorder_level ? 'text-red-600' : 'text-green-600'}>
                  {value}
                </span>
              )
            },
            {
              key: 'reorder_level',
              label: 'Reorder Level'
            },
            {
              key: 'gst_percentage',
              label: 'GST %',
              render: (value) => `${value || '-'}%`
            },
            {
              key: 'hsn_code',
              label: 'HSN Code',
              render: (value) => value || '-'
            }
          ]}
          data={products}
          actions={(product) => (
            <>
              <button
                onClick={() => handleEdit(product)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          itemsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>
    </div>
  )
}
