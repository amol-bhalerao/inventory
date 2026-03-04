import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvoicePreviewModal({ isOpen, onClose, extractedData, onSave, loading }) {
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_gst: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_state: '',
    supplier_address: '',
    items: []
  })

  const [expandedItem, setExpandedItem] = useState(null)
  const [loadingHSN, setLoadingHSN] = useState({})

  const [newItem, setNewItem] = useState({
    item_name: '',
    description: '',
    hsn_code: '',
    quantity: '',
    unit: 'pcs',
    rate: '',
    gst_percentage: '18'
  })

  useEffect(() => {
    if (extractedData) {
      setFormData({
        supplier_name: extractedData.supplier?.name || '',
        supplier_gst: extractedData.supplier?.gstin || '',
        supplier_email: extractedData.supplier?.email || '',
        supplier_phone: extractedData.supplier?.phone || '',
        supplier_state: extractedData.supplier?.state || '',
        supplier_address: extractedData.supplier?.address || '',
        items: (extractedData.items || []).map(item => ({
          ...item,
          id: Math.random()
        }))
      })
    }
  }, [extractedData])

  const handleSupplierChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          let newValue = value
          
          // Convert numeric fields
          if (['quantity', 'rate', 'gst_percentage'].includes(field)) {
            newValue = parseFloat(value) || 0
          }
          
          const updatedItem = { ...item, [field]: newValue }
          
          // Recalculate amounts if qty or rate changed
          if (['quantity', 'rate', 'gst_percentage'].includes(field)) {
            const amt = (updatedItem.quantity || 0) * (updatedItem.rate || 0)
            updatedItem.amount = amt
            updatedItem.gst_amount = (amt * (updatedItem.gst_percentage || 18)) / 100
            updatedItem.total_amount = amt + updatedItem.gst_amount
          }
          
          return updatedItem
        }
        return item
      })
    }))
  }

  const calculateAmount = (quantity, rate) => {
    return (parseFloat(quantity) || 0) * (parseFloat(rate) || 0)
  }

  const calculateGST = (amount, gstPercentage) => {
    return (amount * (parseFloat(gstPercentage) || 18)) / 100
  }

  const handleAddItem = () => {
    if (!newItem.item_name || !newItem.quantity || !newItem.rate) {
      toast.error('Please fill required item fields (Name, Quantity, Rate)')
      return
    }

    const amount = calculateAmount(newItem.quantity, newItem.rate)
    const gstAmount = calculateGST(amount, newItem.gst_percentage)
    
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...newItem,
          id: Math.random(),
          quantity: parseFloat(newItem.quantity),
          rate: parseFloat(newItem.rate),
          gst_percentage: parseFloat(newItem.gst_percentage),
          amount: amount,
          gst_amount: gstAmount,
          total_amount: amount + gstAmount
        }
      ]
    }))

    setNewItem({
      item_name: '',
      description: '',
      hsn_code: '',
      quantity: '',
      unit: 'pcs',
      rate: '',
      gst_percentage: '18'
    })
    toast.success('Item added')
  }

  const handleRemoveItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  const handleSave = () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Prepare data for save - ensure all items have calculated fields
    const billData = {
      supplier: {
        name: formData.supplier_name,
        gstin: formData.supplier_gst,
        email: formData.supplier_email,
        phone: formData.supplier_phone,
        state: formData.supplier_state,
        address: formData.supplier_address
      },
      items: formData.items.map(({ id, ...item }) => {
        // Calculate amount if not already calculated
        const amount = item.amount || (item.quantity && item.rate ? item.quantity * item.rate : 0)
        // Calculate GST if not already calculated
        const gst_amount = item.gst_amount || (amount > 0 ? (amount * (item.gst_percentage || 18)) / 100 : 0)
        
        return {
          ...item,
          amount: Math.round(amount * 100) / 100,
          gst_amount: Math.round(gst_amount * 100) / 100,
          total_amount: Math.round((amount + gst_amount) * 100) / 100
        }
      })
    }

    onSave(billData)
  }

  if (!isOpen) return null

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + (item.amount || calculateAmount(item.quantity, item.rate)),
    0
  )

  const totalGst = formData.items.reduce(
    (sum, item) => sum + (item.gst_amount || calculateGST(calculateAmount(item.quantity, item.rate), item.gst_percentage)),
    0
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Review & Edit Invoice Data</h2>
              <p className="text-blue-100 text-sm mt-1">Verify and edit extracted data before saving to database</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 p-2 rounded"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Supplier Section */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Supplier Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => handleSupplierChange('supplier_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_gst}
                    onChange={(e) => handleSupplierChange('supplier_gst', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter GST number"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.supplier_email}
                    onChange={(e) => handleSupplierChange('supplier_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.supplier_phone}
                    onChange={(e) => handleSupplierChange('supplier_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_state}
                    onChange={(e) => handleSupplierChange('supplier_state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter state"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.supplier_address}
                    onChange={(e) => handleSupplierChange('supplier_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter address"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Bill Items ({formData.items.length})
              </h3>

              {/* Items List - Expandable Rows */}
              <div className="space-y-2 mb-6">
                {formData.items.map((item, idx) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                    {/* Summary Row */}
                    <div
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="bg-gray-50 p-4 cursor-pointer flex items-center gap-3 hover:bg-gray-100"
                    >
                      <button className="text-gray-600 hover:text-gray-800">
                        {expandedItem === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-900">{item.item_name}</span>
                          <div className="text-xs text-gray-500">HSN: {item.hsn_code || 'N/A'}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{item.quantity}</div>
                          <div className="text-xs text-gray-500">{item.unit || 'pcs'}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">₹{item.rate}</div>
                          <div className="text-xs text-gray-500">per unit</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">₹{(item.amount || 0).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">@{item.gst_percentage}% GST</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveItem(item.id)
                        }}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {expandedItem === item.id && (
                      <div className="bg-white p-4 border-t border-gray-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name *</label>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(item.id, 'item_name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Item description"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
                            <input
                              type="text"
                              value={item.hsn_code}
                              onChange={(e) => handleItemChange(item.id, 'hsn_code', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter HSN code"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measure</label>
                            <select
                              value={item.unit || 'pcs'}
                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pcs">Pieces (pcs)</option>
                              <option value="kg">Kilogram (kg)</option>
                              <option value="l">Liter (l)</option>
                              <option value="m">Meter (m)</option>
                              <option value="box">Box</option>
                              <option value="unit">Unit</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Rate (per unit) *</label>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">GST %</label>
                            <input
                              type="number"
                              value={item.gst_percentage}
                              onChange={(e) => handleItemChange(item.id, 'gst_percentage', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              step="0.1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Number</label>
                            <input
                              type="text"
                              value={item.batch_no || ''}
                              onChange={(e) => handleItemChange(item.id, 'batch_no', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        {/* Amount Calculation Display */}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Line Amount</div>
                            <div className="font-bold text-gray-900">₹{(item.amount || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">GST Amount</div>
                            <div className="font-bold text-gray-900">₹{(item.gst_amount || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total with GST</div>
                            <div className="font-bold text-blue-600">₹{(item.total_amount || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <button
                              onClick={() => setExpandedItem(null)}
                              className="w-full text-center bg-white border border-gray-300 text-gray-700 rounded py-2 hover:bg-gray-100 text-sm font-medium"
                            >
                              Collapse
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Item */}
              <div className="border-t pt-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Add New Item</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <input
                    type="text"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    placeholder="Item name *"
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newItem.hsn_code}
                    onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
                    placeholder="HSN Code"
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="Quantity *"
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    step="0.01"
                  />
                  <input
                    type="number"
                    value={newItem.rate}
                    onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                    placeholder="Rate *"
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 text-xs">Subtotal</div>
                    <div className="font-bold text-lg text-gray-800">
                      ₹{totalAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">GST</div>
                    <div className="font-bold text-lg text-gray-800">
                      ₹{totalGst.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">Total</div>
                    <div className="font-bold text-lg text-blue-600">
                      ₹{(totalAmount + totalGst).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t p-4 sm:p-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || formData.items.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save to Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
