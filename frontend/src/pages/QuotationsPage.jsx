import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, X, CheckCircle, AlertCircle, Printer, Copy } from 'lucide-react'
import { productService, customerService, quotationService, franchiseService } from '../services/services'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { quotationTemplates, termsAndConditionsTemplates } from '../constants/quotationTemplates'

export default function QuotationsPage() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [franchiseConfig, setFranchiseConfig] = useState({ invoice_prefix: 'QT-' })
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    gst_number: '',
    address: '',
    city: '',
    state: '',
    postal_code: ''
  })

  // Current Item State
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    hsn_code: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    gst_percentage: 0,
    line_total: 0
  })

  // Product Search State
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const filteredProducts = productSearch.trim() === ''
    ? products
    : products.filter(p =>
      (p.name || p.product_name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(productSearch.toLowerCase())
    )

  const [formData, setFormData] = useState({
    quotation_number: '',
    customer_id: '',
    customer_name: '',
    customer_gst: '',
    customer_email: '',
    quotation_type: 'with_rates',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    items: [],
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    grand_total: 0,
    notes: quotationTemplates[0].content,
    terms: termsAndConditionsTemplates[0].content,
    terms_template_id: termsAndConditionsTemplates[0].id,
    status: 'draft'
    ,
    payment_terms: '50% advance, 50% on delivery',
    delivery_time: '4-6 weeks from order confirmation',
    warranty: '5 years on equipment, 2 years on labor'
  })

  useEffect(() => {
    fetchFranchiseConfig()
    fetchQuotations()
    fetchProducts()
    fetchCustomers()
  }, [])

  const fetchFranchiseConfig = async () => {
    try {
      const resp = await franchiseService.getById(1)
      if (resp.success && resp.data) {
        setFranchiseConfig(resp.data)
      }
    } catch (e) {
      console.error('Could not fetch franchise config', e)
    }
  }


  const fetchQuotations = async () => {
    try {
      setLoading(true)
      const response = await quotationService.getAll({ limit: 100, offset: 0 })
      if (response.success) {
        setQuotations(response.data || [])
        // regenerate quotation number now that we know existing count
        setFormData(prev => ({ ...prev, quotation_number: generateQuotationNumber() }))
      } else {
        console.error('Failed to load quotations:', response.message)
        setQuotations([])
      }
    } catch (error) {
      console.error('Failed to load quotations:', error.message)
      setQuotations([])
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

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAll(1000, 0)
      if (response.success) {
        setCustomers(response.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error.message)
    }
  }

  // Handle Customer Selection
  const handleCustomerSelect = (e) => {
    const customerId = parseInt(e.target.value) || ''
    if (customerId === 'new') {
      setShowCustomerForm(true)
      return
    }
    const selected = customers.find(c => c.id == customerId)

    if (selected) {
      setFormData(prev => ({
        ...prev,
        customer_id: selected.id,
        customer_name: selected.name,
        customer_email: selected.email,
        customer_gst: selected.gst_number || ''
      }))
    }
  }

  // Handle Auto-Calculate Valid Until (10 days)
  const handleQuotationDateChange = (date) => {
    setFormData(prev => {
      const newDate = new Date(date)
      newDate.setDate(newDate.getDate() + 10)
      return {
        ...prev,
        quotation_date: date,
        valid_until: newDate.toISOString().split('T')[0]
      }
    })
  }

  // Handle Template Selection
  const handleTemplateSelect = (templateId) => {
    const template = quotationTemplates.find(t => t.id === templateId)
    if (template) {
      setFormData(prev => ({
        ...prev,
        notes: template.content
      }))
    }
  }

  // Add New Customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error('Name and email are required')
      return
    }

    try {
      const response = await customerService.create(newCustomer)
      if (response.success) {
        toast.success('Customer added successfully')
        fetchCustomers()
        const addedCustomer = response.data
        setFormData(prev => ({
          ...prev,
          customer_id: addedCustomer.id,
          customer_name: addedCustomer.name,
          customer_email: addedCustomer.email,
          customer_gst: addedCustomer.gst_number || ''
        }))
        setShowCustomerForm(false)
        setNewCustomer({
          name: '',
          email: '',
          phone: '',
          gst_number: '',
          address: '',
          city: '',
          state: '',
          postal_code: ''
        })
      } else {
        toast.error(response.message || 'Failed to add customer')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add customer')
    }
  }

  const fetchAddressFromPincode = async (pincode) => {
    if (!pincode || pincode.toString().trim().length === 0) return
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await resp.json()
      if (Array.isArray(data) && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0]
        setNewCustomer(prev => ({
          ...prev,
          address: prev.address || `${po.Name}, ${po.Block || ''}`.trim(),
          city: po.District || prev.city,
          state: po.State || prev.state
        }))
      }
    } catch (err) {
      // silently ignore
      console.warn('Failed to fetch address for pincode', pincode, err)
    }
  }

  // Handle Product Selection
  const handleProductSelect = (e) => {
    const productId = e.target.value
    const selected = products.find(p => p.id == productId)

    if (selected) {
      // Get GST percentage from product, fallback to tax_rate
      const gstPercentage = selected.gst_percentage || parseFloat(selected.tax_rate || 0)

      setCurrentItem(prev => ({
        ...prev,
        product_id: selected.id,
        product_name: selected.name || selected.product_name,
        description: selected.description || '',
        unit_price: parseFloat(selected.selling_price || selected.unit_price || 0),
        tax_rate: gstPercentage,
        gst_percentage: gstPercentage
        , hsn_code: selected.hsn_code || selected.hsn || ''
      }))
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
    const updated = { ...currentItem, [field]: value }

    if (['quantity', 'unit_price', 'tax_rate'].includes(field)) {
      updated.line_total = calculateLineTotal(
        parseFloat(updated.quantity) || 0,
        parseFloat(updated.unit_price) || 0,
        parseFloat(updated.tax_rate) || 0
      )
    }

    setCurrentItem(updated)
  }

  // Add Item to Quotation
  const handleAddItem = () => {
    if (!currentItem.product_name) {
      toast.error('Please select a product or enter product name')
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
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      return sum + sub
    }, 0)

    const newTaxAmount = newItems.reduce((sum, item) => {
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      const tax = sub * (parseFloat(item.tax_rate) / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount_amount || 0)

    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      grand_total: Math.max(0, newTotal)
    }))

    setCurrentItem({
      product_id: '',
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      gst_percentage: 0,
      line_total: 0
    })

    // Clear product search / textboxes
    setProductSearch('')
    setShowProductDropdown(false)

    toast.success('Item added to quotation')
  }

  // Edit Item in Quotation
  const handleEditItem = (index, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    if (['quantity', 'unit_price', 'tax_rate'].includes(field)) {
      updatedItems[index].line_total = calculateLineTotal(
        parseFloat(updatedItems[index].quantity) || 0,
        parseFloat(updatedItems[index].unit_price) || 0,
        parseFloat(updatedItems[index].tax_rate) || 0
      )
    }

    const newSubtotal = updatedItems.reduce((sum, item) => {
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      return sum + sub
    }, 0)

    const newTaxAmount = updatedItems.reduce((sum, item) => {
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      const tax = sub * (parseFloat(item.tax_rate) / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount_amount || 0)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      grand_total: Math.max(0, newTotal)
    }))
  }

  // Remove Item from Quotation
  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)

    const newSubtotal = updatedItems.reduce((sum, item) => {
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      return sum + sub
    }, 0)

    const newTaxAmount = updatedItems.reduce((sum, item) => {
      const sub = parseFloat(item.quantity) * parseFloat(item.unit_price)
      const tax = sub * (parseFloat(item.tax_rate) / 100)
      return sum + tax
    }, 0)

    const newTotal = newSubtotal + newTaxAmount - parseFloat(formData.discount_amount || 0)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      grand_total: Math.max(0, newTotal)
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let updatedData = { ...formData, [name]: value }

    // Recalculate if discount changes
    if (name === 'discount_amount') {
      const newTotal = updatedData.subtotal + updatedData.tax_amount - parseFloat(value || 0)
      updatedData.grand_total = Math.max(0, newTotal)
    }

    // Recalculate if grand_total changes directly (for type without_rates)
    if (name === 'grand_total' && formData.quotation_type === 'without_rates') {
      updatedData.grand_total = parseFloat(value || 0)
    }

    setFormData(updatedData)
  }

  const generateQuotationNumber = () => {
    // financial year serial: e.g. QT-2026007
    const now = new Date()
    let fyEnd = now.getFullYear()
    if (now.getMonth() >= 3) {
      fyEnd = now.getFullYear() + 1
    }
    const prefixBase = franchiseConfig.invoice_prefix || 'QT-'
    const prefix = `${prefixBase}${fyEnd}`
    const countForYear = quotations.filter(q => q.quotation_number?.startsWith(prefix)).length
    const serial = String(countForYear + 1).padStart(3, '0')
    return `${prefix}${serial}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Quotation number will be generated server-side; no client-side requirement

    if (!formData.customer_name) {
      toast.error('Customer name is required')
      return
    }

    if (formData.items.length === 0) {
      toast.error('Add at least one item to the quotation')
      return
    }

    try {
      const submitData = {
        customerName: formData.customer_name,
        customerId: formData.customer_id || null,
        customerGST: formData.customer_gst || null,
        customerEmail: formData.customer_email,
        quotationDate: formData.quotation_date || new Date().toISOString().split('T')[0],
        validUntil: formData.valid_until,
        quotationType: formData.quotation_type,
        notes: formData.notes,
        terms: formData.terms,
        termsTemplateId: formData.terms_template_id,
        paymentTerms: formData.payment_terms,
        deliveryTime: formData.delivery_time,
        warranty: formData.warranty,
        items: formData.items.map(item => ({
          productId: item.product_id || null,
          productName: item.product_name,
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unit_price) || 0,
          taxRate: parseFloat(item.tax_rate) || 0,
          hsnCode: item.hsn_code || (products.find(p => p.id == item.product_id)?.hsn_code || null),
          gstAmount: parseFloat(((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (parseFloat(item.tax_rate || 0) / 100)).toFixed(2))
        }))
      }

      let response

      if (selectedQuotation?.id) {
        // Update existing quotation
        response = await quotationService.update(selectedQuotation.id, submitData)
      } else {
        // Create new quotation
        response = await quotationService.create(submitData)
      }

      if (response.success) {
        if (selectedQuotation?.id) {
          toast.success('Quotation updated successfully')
        } else {
          toast.success('Quotation created successfully')
        }
        resetForm()
        fetchQuotations()
      } else {
        toast.error(response.message || 'Failed to save quotation')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error.message || 'An error occurred while saving quotation')
    }
  }

  const handleEdit = (quotation) => {
    setSelectedQuotation(quotation)
    // Map database field names to form field names
    setFormData({
      quotation_number: quotation.quotation_number,
      customer_id: quotation.customer_id || '',
      customer_name: quotation.customer_name,
      customer_gst: quotation.customer_gst || '',
      customer_email: quotation.customer_email || '',
      quotation_type: quotation.quotation_type,
      quotation_date: quotation.quotation_date,
      valid_until: quotation.valid_until,
      items: quotation.items || [],
      subtotal: quotation.subtotal || 0,
      tax_amount: quotation.tax_amount || 0,
      discount_amount: quotation.discount_amount || 0,
      grand_total: quotation.grand_total || 0,
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      terms_template_id: quotation.terms_template_id || termsAndConditionsTemplates[0].id,
      status: quotation.status
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        const response = await quotationService.delete(id)
        if (response.success) {
          toast.success('Quotation deleted successfully')
          fetchQuotations()
        } else {
          toast.error(response.message || 'Failed to delete quotation')
        }
      } catch (error) {
        toast.error(error.message || 'Failed to delete quotation')
      }
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setShowCustomerForm(false)
    setSelectedQuotation(null)
    setCurrentItem({
      product_id: '',
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      gst_percentage: 0,
      line_total: 0
    })
    const today = new Date()
    const validUntil = new Date(today)
    validUntil.setDate(validUntil.getDate() + 10)
    setFormData({
      quotation_number: generateQuotationNumber(),
      customer_id: '',
      customer_name: '',
      customer_gst: '',
      customer_email: '',
      quotation_type: 'with_rates',
      quotation_date: today.toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      items: [],
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: 0,
      notes: quotationTemplates[0].content,
      terms: termsAndConditionsTemplates[0].content,
      terms_template_id: termsAndConditionsTemplates[0].id,
      status: 'draft'
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading quotations...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
        <button
          onClick={() => {
            resetForm()
            setFormData(prev => ({
              ...prev,
              quotation_number: generateQuotationNumber()
            }))
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Quotation
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold">{selectedQuotation?.id ? 'Edit' : 'Create New'} Quotation</h2>

          {/* Type Selection */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Quotation Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="quotation_type"
                  value="with_rates"
                  checked={formData.quotation_type === 'with_rates'}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">
                  <strong>Type 1: With Item Rates</strong> - Shows detailed breakdown with individual item rates and totals
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="quotation_type"
                  value="without_rates"
                  checked={formData.quotation_type === 'without_rates'}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">
                  <strong>Type 2: Summary Only</strong> - Shows only grand total (editable)
                </span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quotation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                <input
                  type="text"
                  name="quotation_number"
                  value={formData.quotation_number}
                  onChange={handleInputChange}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Will be generated by server"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer*</label>
                <div className="flex gap-2 min-w-0">
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleCustomerSelect}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-full overflow-hidden text-ellipsis"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    title="Create new customer"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date*</label>
                <input
                  type="date"
                  name="quotation_date"
                  value={formData.quotation_date}
                  onChange={(e) => handleQuotationDateChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Auto +10 days)</label>
                <input
                  type="date"
                  name="valid_until"
                  value={formData.valid_until}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer GST Number</label>
                  <input
                    type="text"
                    name="customer_gst"
                    value={formData.customer_gst}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GST number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50% advance, 50% on delivery"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                <input
                  type="text"
                  name="delivery_time"
                  value={formData.delivery_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 4-6 weeks from order confirmation"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
                <input
                  type="text"
                  name="warranty"
                  value={formData.warranty}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5 years on equipment"
                />
              </div>
            </div>

            {/* Item Selection - Available for both modes */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              <div className={showProductDropdown ? 'overflow-visible' : 'overflow-x-auto'}>
                <div className="flex items-end gap-2 flex-nowrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product (Searchable)</label>
                    <input
                      type="text"
                      placeholder="Search by name or SKU..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowProductDropdown(true)
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleProductSelect({
                                  target: {
                                    value: p.id
                                  }
                                })
                                setProductSearch(p.name || p.product_name)
                                setShowProductDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-100 border-b border-gray-200 last:border-b-0 text-sm"
                            >
                              <div className="font-medium">{p.product_name || p.name}</div>
                              {p.sku && <div className="text-xs text-gray-500">SKU: {p.sku}</div>}
                              {p.hsn_code && <div className="text-xs text-gray-500">HSN: {p.hsn_code}</div>}
                              {p.gst_percentage !== undefined && <div className="text-xs text-gray-500">GST: {p.gst_percentage}%</div>}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-20">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => handleItemChange('quantity', e.target.value)}
                      min="1"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {formData.quotation_type === 'with_rates' && (
                    <>
                      <div className="w-24">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <input
                          type="number"
                          value={currentItem.unit_price}
                          onChange={(e) => handleItemChange('unit_price', e.target.value)}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                        <input
                          type="number"
                          value={currentItem.tax_rate}
                          onChange={(e) => handleItemChange('tax_rate', e.target.value)}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="w-16">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions Section */}
            <div className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions Template</label>
                <div className="flex gap-2 flex-wrap">
                  {termsAndConditionsTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        terms: tpl.content,
                        terms_template_id: tpl.id
                      }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${formData.terms === tpl.content
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write terms & conditions or select a template above…"
              />
            </div>

            {/* Quotation Items Table */}
            {formData.items.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-2 px-3">Product</th>
                        <th className="text-left py-2 px-3">HSN</th>
                        <th className="text-left py-2 px-3">Qty</th>
                        {formData.quotation_type === 'with_rates' && (
                          <>
                            <th className="text-left py-2 px-3">Unit Price</th>
                            <th className="text-left py-2 px-3">Tax %</th>
                            <th className="text-left py-2 px-3">GST ₹</th>
                            <th className="text-left py-2 px-3">Total</th>
                          </>
                        )}
                        <th className="text-center py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => handleEditItem(index, 'product_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.hsn_code || (products.find(p => p.id == item.product_id)?.hsn_code || '')}
                              onChange={(e) => handleEditItem(index, 'hsn_code', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleEditItem(index, 'quantity', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          {formData.quotation_type === 'with_rates' && (
                            <>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => handleEditItem(index, 'unit_price', e.target.value)}
                                  step="0.01"
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={item.tax_rate}
                                  onChange={(e) => handleEditItem(index, 'tax_rate', e.target.value)}
                                  step="0.01"
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>
                              <td className="py-2 px-3 font-semibold">
                                ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (parseFloat(item.tax_rate || 0) / 100)).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 font-semibold">
                                ₹{Number(item.line_total || ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + parseFloat(item.tax_rate || 0) / 100))).toFixed(2)}
                              </td>
                            </>
                          )}
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


            {/* Type 2: Summary Only - Grand Total (only for summary mode) */}
            {formData.quotation_type === 'without_rates' && (
              <div className="border-t pt-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>In summary mode, item details are not shown in print. You can edit the grand total directly below.</span>
                  </p>
                </div>

                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grand Total (Editable)*</label>
                  <input
                    type="number"
                    name="grand_total"
                    value={formData.grand_total}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Totals Section (For Type with_rates only) */}
            {formData.quotation_type === 'with_rates' && formData.items.length > 0 && (
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
                      <label htmlFor="discount_amount">Discount:</label>
                      <input
                        id="discount_amount"
                        type="number"
                        name="discount_amount"
                        value={formData.discount_amount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between border-t-2 pt-2 text-gray-900">
                      <span className="font-bold">Grand Total:</span>
                      <span className="font-bold text-lg">₹{formData.grand_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quotation Letter Body & Terms */}
            <div className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Letter Template</label>
                <div className="flex gap-2 flex-wrap">
                  {quotationTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${formData.notes === template.content
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Letter Body*</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="6"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif"
                placeholder="Write your quotation letter body or select a template above..."
              />
              <p className="text-xs text-gray-500 mt-1">This text will appear in the quotation print. You can edit any template or write your own.</p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {selectedQuotation?.id ? 'Update' : 'Save'} Quotation
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

          {/* Customer Creation Modal */}
          {
            showCustomerForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Add New Customer</h3>
                    <button
                      onClick={() => setShowCustomerForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                      <input
                        type="text"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Customer name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="customer@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10-digit phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                      <input
                        type="text"
                        value={newCustomer.gst_number}
                        onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="GST number (15 characters)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Street address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={newCustomer.city}
                          onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={newCustomer.state}
                          onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="State"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={newCustomer.postal_code}
                        onChange={(e) => setNewCustomer({ ...newCustomer, postal_code: e.target.value })}
                        onBlur={(e) => fetchAddressFromPincode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="6-digit PIN code"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t">
                    <button
                      onClick={handleAddCustomer}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Save Customer
                    </button>
                    <button
                      onClick={() => setShowCustomerForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div >
      )
      }

      {/* Quotations Table */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Quotation #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No quotations found
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr key={quotation.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium">{quotation.quotation_number}</td>
                      <td className="py-3 px-4 hidden md:table-cell">{quotation.customer_name}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">{new Date(quotation.quotation_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${quotation.quotation_type === 'with_rates'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                          }`}>
                          {quotation.quotation_type === 'with_rates' ? 'With Rates' : 'Summary'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">₹{Number(quotation.grand_total).toFixed(2)}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${quotation.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : quotation.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : quotation.status === 'sent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/quotations/${quotation.id}/print`)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Print"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(quotation)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(quotation.id)}
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
      )}
    </div >
  )
}
