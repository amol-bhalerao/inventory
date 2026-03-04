import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { purchaseOrderService } from '../services/services'
import toast from 'react-hot-toast'

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [formData, setFormData] = useState({
    po_number: '',
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    total_amount: '',
    status: 'pending',
    notes: ''
  })

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const response = await purchaseOrderService.getAll({ limit: 100, offset: 0 })
      if (response.success) {
        setPurchaseOrders(response.data || [])
      } else {
        toast.error(response.message || 'Failed to load purchase orders')
      }
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
      if (selectedPO?.id) {
        await purchaseOrderService.update(selectedPO.id, formData)
        toast.success('Purchase order updated successfully')
      } else {
        await purchaseOrderService.create(formData)
        toast.success('Purchase order created successfully')
      }
      resetForm()
      fetchPurchaseOrders()
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (po) => {
    setSelectedPO(po)
    setFormData(po)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await purchaseOrderService.delete(id)
        toast.success('Purchase order deleted successfully')
        fetchPurchaseOrders()
      } catch (error) {
        toast.error(error.message || 'Failed to delete purchase order')
      }
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setSelectedPO(null)
    setFormData({
      po_number: '',
      supplier_id: '',
      po_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      total_amount: '',
      status: 'pending',
      notes: ''
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading purchase orders...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create PO
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">{selectedPO?.id ? 'Edit' : 'Create New'} Purchase Order</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number*</label>
                <input
                  type="text"
                  name="po_number"
                  value={formData.po_number}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PO-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier ID</label>
                <input
                  type="number"
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Date*</label>
                <input
                  type="date"
                  name="po_date"
                  value={formData.po_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount*</label>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {selectedPO?.id ? 'Update' : 'Create'} Purchase Order
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">PO #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Supplier ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">PO Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{po.po_number}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{po.supplier_id}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">{new Date(po.po_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold">${Number(po.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        po.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : po.status === 'shipped'
                          ? 'bg-blue-100 text-blue-800'
                          : po.status === 'confirmed'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(po)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(po.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
