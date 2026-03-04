import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, Search, AlertCircle, CheckCircle, X, ChevronDown, Printer } from 'lucide-react'
import { invoiceService, productService, customerService } from '../services/services'
import { gstLookupService } from '../services/gstLookup'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  
  // GST Lookup State
  const [gstSearch, setGstSearch] = useState('')
  const [searchingGST, setSearchingGST] = useState(false)
  const [gstError, setGstError] = useState('')
  const [gstData, setGstData] = useState(null)
  
  // Current Item State
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    line_total: 0
  })
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_postal_code: '',
    customer_gst: '',
    invoice_date: new Date().toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    tax_amount: 0,
    discount: 0,
    total_amount: 0,
    payment_status: 'pending',
    notes: ''
  })
  
  // GST Source tracking
  const [gstSource, setGstSource] = useState('')

  useEffect(() => {
    fetchInvoices()
    fetchProducts()
    generateInvoiceNumber()
  }, [])

  const generateInvoiceNumber = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const response = await invoiceService.getAll({ limit: 100, offset: 0 })
      
      if (response.success && response.data.length > 0) {
        // Filter invoices from current year
        const currentYearInvoices = response.data.filter(inv => {
          if (!inv.invoice_number) return false
          const yearPrefix = inv.invoice_number.substring(0, 4)
          return yearPrefix === String(currentYear)
        })
        
        if (currentYearInvoices.length > 0) {
          // Get the highest sequence number from current year
          let maxSequence = 0
          currentYearInvoices.forEach(inv => {
            const sequencePart = parseInt(inv.invoice_number.substring(4)) || 0
            if (sequencePart > maxSequence) {
              maxSequence = sequencePart
            }
          })
          const nextSequence = maxSequence + 1
          const invoiceNumber = `${currentYear}${nextSequence}`
          setFormData(prev => ({
            ...prev,
            invoice_number: invoiceNumber
          }))
        } else {
          // First invoice of the year
          const invoiceNumber = `${currentYear}1`
          setFormData(prev => ({
            ...prev,
            invoice_number: invoiceNumber
          }))
        }
      } else {
        // No invoices found, start with 1
        const invoiceNumber = `${currentYear}1`
        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNumber
        }))
      }
    } catch (error) {
      // Fallback
      const currentYear = new Date().getFullYear()
      setFormData(prev => ({
        ...prev,
        invoice_number: `${currentYear}1`
      }))
    }
  }

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await invoiceService.getAll({ limit: 100, offset: 0 })
      if (response.success) {
        setInvoices(response.data || [])
      } else {
        toast.error(response.message || 'Failed to load invoices')
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await productService.getAll({ limit: 1000, offset: 0 })
      if (response.success) {
        setProducts(response.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error.message)
    }
  }

  // GST Lookup Handler
  const handleGSTLookup = async () => {
    const trimmedGST = gstSearch.trim().toUpperCase()
    
    if (!trimmedGST) {
      setGstError('Please enter a GST number')
      return
    }

    if (!gstLookupService.validateGSTFormat(trimmedGST)) {
      setGstError('Invalid GST format. Expected: 15-character alphanumeric')
      return
    }

    setSearchingGST(true)
    setGstError('')

    try {
      const result = await gstLookupService.searchByGST(trimmedGST)
      
      if (result.success) {
        setGstData(result.data)
        setGstSource(result.source)
        setFormData(prev => ({
          ...prev,
          customer_id: result.data.customer_id || '',
          customer_name: result.data.business_name || result.data.name || '',
          customer_email: result.data.email || result.data.customer_email || '',
          customer_phone: result.data.phone || result.data.customer_phone || '',
          customer_address: result.data.address || result.data.customer_address || '',
          customer_city: result.data.city || result.data.customer_city || '',
          customer_state: result.data.state || result.data.customer_state || '',
          customer_postal_code: result.data.postal_code || result.data.customer_postal_code || '',
          customer_gst: trimmedGST
        }))
        
        if (result.source === 'gst_api') {
          toast.success('Business found! Click "Save Customer" to store in database.')
        } else {
          toast.success('Customer loaded from database')
        }
      } else {
        setGstError(result.message || 'GST number not found')
        setGstData(null)
      }
    } catch (error) {
      setGstError(error.message || 'Error searching GST')
    } finally {
      setSearchingGST(false)
    }
  }

  // Save Customer to Database
  const handleSaveCustomer = async () => {
    if (!gstData) {
      toast.error('No customer data to save')
      return
    }

    try {
      const customerData = {
        name: formData.customer_name,
        email: formData.customer_email || gstData.email || '',
        phone: formData.customer_phone || gstData.phone || '',
        address: formData.customer_address || gstData.address || '',
        city: formData.customer_city || gstData.city || '',
        state: formData.customer_state || gstData.state || '',
        postal_code: formData.customer_postal_code || '',
        gst_number: formData.customer_gst
      }

      const response = await customerService.create(customerData)
      if (response.success) {
        toast.success('Customer saved to database')
        // Update formData with the customer_id if returned
        if (response.data?.id) {
          setFormData(prev => ({
            ...prev,
            customer_id: response.data.id
          }))
        }
      } else {
        toast.error(response.message || 'Failed to save customer')
      }
    } catch (error) {
      toast.error(error.message || 'Error saving customer')
    }
  }

  // Calculate Line Total
  const calculateLineTotal = (qty, price, taxRate) => {
    const subtotal = qty * price
    const tax = subtotal * (taxRate / 100)
    return subtotal + tax
  }

  // Update Current Item
  const handleItemChange = (field, value) => {
    let numValue = value
    if (field === 'quantity' || field === 'unit_price') {
      numValue = parseInt(value) || 0
    }
    
    const updated = { ...currentItem, [field]: numValue }
    
    if (['quantity', 'unit_price', 'tax_rate'].includes(field)) {
      updated.line_total = calculateLineTotal(
        updated.quantity,
        updated.unit_price,
        updated.tax_rate
      )
    }
    
    setCurrentItem(updated)
  }

  // Product Selection Handler
  const handleProductSelect = (product) => {
    const newItem = {
      product_id: product.id,
      product_name: product.name || product.product_name,
      unit_price: parseInt(product.selling_price || product.unit_price || 0),
      tax_rate: parseFloat(product.gst_percentage || 0),
      quantity: 1,
      line_total: 0
    }
    // Calculate line_total for the newly selected product
    newItem.line_total = calculateLineTotal(newItem.quantity, newItem.unit_price, newItem.tax_rate)
    setCurrentItem(newItem)
    setProductSearch('')
    setShowProductDropdown(false)
  }

  // Add Item to Invoice
  const handleAddItem = () => {
    if (!currentItem.product_name) {
      toast.error('Please select a product')
      return
    }

    if (!currentItem.quantity || currentItem.quantity <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    if (!currentItem.unit_price || currentItem.unit_price < 0) {
      toast.error('Unit price must be valid')
      return
    }

    const newItems = [...formData.items, { ...currentItem }]
    const newSubtotal = newItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      return sum + sub
    }, 0)

    const newTaxAmount = newItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      const tax = sub * (item.tax_rate / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount || 0)

    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total_amount: Math.max(0, newTotal)
    }))

    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      line_total: 0
    })

    toast.success('Item added to invoice')
  }

  // Edit Item in Invoice
  const handleEditItem = (index, field, value) => {
    const updatedItems = [...formData.items]
    let numValue = value
    
    if (field === 'quantity' || field === 'unit_price') {
      numValue = parseInt(value) || 0
    }
    
    updatedItems[index] = { ...updatedItems[index], [field]: numValue }

    if (['quantity', 'unit_price'].includes(field)) {
      updatedItems[index].line_total = calculateLineTotal(
        updatedItems[index].quantity,
        updatedItems[index].unit_price,
        updatedItems[index].tax_rate
      )
    }

    const newSubtotal = updatedItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      return sum + sub
    }, 0)

    const newTaxAmount = updatedItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      const tax = sub * (item.tax_rate / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount || 0)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total_amount: Math.max(0, newTotal)
    }))
  }

  // Remove Item from Invoice
  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    
    const newSubtotal = updatedItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      return sum + sub
    }, 0)

    const newTaxAmount = updatedItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price
      const tax = sub * (item.tax_rate / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount || 0)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total_amount: Math.max(0, newTotal)
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let updatedData = { ...formData, [name]: value }

    // Recalculate if discount changes
    if (name === 'discount') {
      const discountValue = parseInt(value || 0)
      const newTotal = updatedData.subtotal + updatedData.tax_amount - discountValue
      updatedData.total_amount = Math.max(0, newTotal)
    }

    setFormData(updatedData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.invoice_number) {
      toast.error('Invoice number is required')
      return
    }

    if (!formData.customer_name) {
      toast.error('Customer name is required')
      return
    }

    if (formData.items.length === 0) {
      toast.error('Add at least one item to the invoice')
      return
    }

    try {
      const submitData = {
        invoiceNumber: formData.invoice_number,
        customerId: formData.customer_id || null,
        customerName: formData.customer_name,
        customerEmail: formData.customer_email || null,
        customerPhone: formData.customer_phone || null,
        customerAddress: formData.customer_address || null,
        customerCity: formData.customer_city || null,
        customerState: formData.customer_state || null,
        customerPostalCode: formData.customer_postal_code || null,
        customerGst: formData.customer_gst || null,
        invoiceDate: formData.invoice_date,
        items: formData.items.map(item => ({
          productId: item.product_id || null,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate
        })),
        notes: formData.notes,
        paymentStatus: formData.payment_status
      }

      if (selectedInvoice?.id) {
        await invoiceService.update(selectedInvoice.id, submitData)
        toast.success('Invoice updated successfully')
      } else {
        await invoiceService.create(submitData)
        toast.success('Invoice created successfully')
      }
      resetForm()
      fetchInvoices()
      generateInvoiceNumber()
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData(invoice)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoiceService.delete(id)
        toast.success('Invoice deleted successfully')
        fetchInvoices()
      } catch (error) {
        toast.error(error.message || 'Failed to delete invoice')
      }
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setSelectedInvoice(null)
    setGstSearch('')
    setGstData(null)
    setGstError('')
    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      line_total: 0
    })
    setFormData({
      invoice_number: '',
      customer_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      customer_city: '',
      customer_state: '',
      customer_postal_code: '',
      customer_gst: '',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [],
      subtotal: 0,
      tax_amount: 0,
      discount: 0,
      total_amount: 0,
      payment_status: 'pending',
      notes: ''
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading invoices...</div>
  }

  // Filter products based on search term
  const filteredProducts = products.filter(p =>
    (p.product_name || p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => {
            resetForm()
            generateInvoiceNumber()
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold">{selectedInvoice?.id ? 'Edit' : 'Create New'} Invoice</h2>

          {/* GST Lookup Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Search Customer by GST (Optional)</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={gstSearch}
                  onChange={(e) => {
                    setGstSearch(e.target.value.toUpperCase())
                    setGstError('')
                  }}
                  placeholder="e.g., 29AABCT1234H1Z0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleGSTLookup}
                disabled={searchingGST}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
              >
                <Search size={18} />
                {searchingGST ? 'Searching...' : 'Search'}
              </button>
            </div>

            {gstError && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {gstError}
              </div>
            )}

            {gstData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{formData.customer_name}</p>
                    <p className="text-sm text-gray-600">{gstData.address || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{gstData.city}, {gstData.state}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                    gstSource === 'local_database'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <CheckCircle size={14} />
                    {gstSource === 'local_database' ? 'From Database' : 'From GST API'}
                  </span>
                </div>

                {gstSource === 'gst_api' && (
                  <button
                    type="button"
                    onClick={handleSaveCustomer}
                    className="mt-3 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                  >
                    Save Customer to Database
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name*</label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name (from GST or manual entry)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer GST</label>
                <input
                  type="text"
                  name="customer_gst"
                  value={formData.customer_gst}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GST number (from GST search or manual entry)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address</label>
                <input
                  type="text"
                  name="customer_address"
                  value={formData.customer_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="customer_city"
                  value={formData.customer_city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="customer_state"
                  value={formData.customer_state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  name="customer_postal_code"
                  value={formData.customer_postal_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XXXXXX"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Add Item Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Add Items</h3>
              <div className="space-y-2">
                {/* Product Search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowProductDropdown(true)
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search products..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleProductSelect(p)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                            >
                              <div className="font-medium">{p.product_name || p.name}</div>
                              <div className="text-sm text-gray-600">₹{p.selling_price} (GST: {p.gst_percentage}%)</div>
                              <div>{p.description}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">No products found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {currentItem.product_name && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={currentItem.quantity}
                        onChange={(e) => handleItemChange('quantity', e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={currentItem.unit_price}
                        onChange={(e) => handleItemChange('unit_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 flex items-center">
                        {currentItem.tax_rate}%
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items Table */}
            {formData.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Items in Invoice</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-2 px-3">Product</th>
                        <th className="text-left py-2 px-3">Qty</th>
                        <th className="text-left py-2 px-3">Price</th>
                        <th className="text-left py-2 px-3">Tax</th>
                        <th className="text-left py-2 px-3">Total</th>
                        <th className="text-center py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{item.product_name}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleEditItem(index, 'quantity', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded"
                              min="1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleEditItem(index, 'unit_price', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-gray-600">{item.tax_rate}%</td>
                          <td className="py-2 px-3 font-semibold">₹{item.line_total.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals Section */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax:</span>
                    <span className="font-semibold">₹{formData.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <label htmlFor="discount">Discount:</label>
                    <input
                      id="discount"
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      step="1"
                      min="0"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  </div>
                  <div className="flex justify-between border-t-2 pt-2 text-gray-900">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-lg">₹{formData.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {selectedInvoice?.id ? 'Update' : 'Create'} Invoice
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

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{invoice.customer_name}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold">₹{Number(invoice.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        invoice.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}/print`)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Print"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
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
