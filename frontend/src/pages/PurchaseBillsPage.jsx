import { useState, useEffect, useRef } from 'react'
import { Edit2, Trash2, Plus, X, Upload, CheckCircle } from 'lucide-react'
import { purchaseBillService, supplierService, productService } from '../services/services'
import { extractItemsFromFile } from '../utils/pdfExtractor'
import InvoicePreviewModal from '../components/InvoicePreviewModal'
import toast from 'react-hot-toast'

export default function PurchaseBillsPage() {
  const [bills, setBills] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploadMode, setUploadMode] = useState('manual') // 'manual' | 'pdf' | 'image'
  const fileInputRef = useRef(null)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    supplier_name: '',
    notes: '',
    items: []
  })
  const [supplierSuggestions, setSupplierSuggestions] = useState([])
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    item_name: '',
    hsn_code: '',
    quantity: '',
    rate: '',
    gst_percentage: '18'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [billsResponse, suppliersResponse, productsResponse] = await Promise.all([
        purchaseBillService.getAll(100, 0),
        supplierService.getAll(100, 0),
        productService.getAll(100, 0)
      ])

      if (billsResponse.success) {
        setBills(billsResponse.data || [])
      }
      if (suppliersResponse.success) {
        setSuppliers(suppliersResponse.data || [])
      }
      if (productsResponse.success) {
        setProducts(productsResponse.data || [])
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const calculateItemTotal = (quantity, rate, gstPercentage) => {
    const subtotal = quantity * rate
    const gstAmount = subtotal * (gstPercentage / 100)
    return subtotal + gstAmount
  }

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    if (product) {
      setCurrentItem(prev => ({
        ...prev,
        product_id: productId,
        item_name: prev.item_name || product.name || '',
        hsn_code: prev.hsn_code || product.hsn_code || '',
        rate: prev.rate || product.purchase_price || ''
      }))
      setProductSearch(product.name || product.name || '')
      setShowProductDropdown(false)
    } else {
      setCurrentItem(prev => ({
        ...prev,
        product_id: productId
      }))
    }
  }

  const handleAddItem = () => {
    // Require either a selected product or an entered item name, plus quantity and rate
    if ((!currentItem.item_name || currentItem.item_name.trim() === '') && !currentItem.product_id) {
      toast.error('Please select a product or enter an item name')
      return
    }

    if (!currentItem.quantity || !currentItem.rate) {
      toast.error('Quantity and rate are required')
      return
    }

    const newItem = {
      ...currentItem,
      product_id: currentItem.product_id ? parseInt(currentItem.product_id) : null,
      quantity: parseFloat(currentItem.quantity),
      rate: parseFloat(currentItem.rate),
      gst_percentage: parseFloat(currentItem.gst_percentage)
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))

    setCurrentItem({
      product_id: '',
      item_name: '',
      hsn_code: '',
      quantity: '',
      rate: '',
      gst_percentage: '18'
    })
    // Clear product search
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calculateBillTotal = () => {
    return formData.items.reduce((total, item) => {
      const subtotal = item.quantity * item.rate
      const gstAmount = subtotal * (item.gst_percentage / 100)
      return total + subtotal + gstAmount
    }, 0)
  }

  const calculateBillGST = () => {
    return formData.items.reduce((total, item) => {
      const subtotal = item.quantity * item.rate
      const gstAmount = subtotal * (item.gst_percentage / 100)
      return total + gstAmount
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.bill_number || !formData.bill_date || formData.items.length === 0) {
        toast.error('Please fill in all required fields and add at least one item')
        return
      }

      let supplierId = formData.supplier_id

      // Auto-create supplier if supplier_name is provided but supplier_id is empty
      if (!supplierId && formData.supplier_name && formData.supplier_name.trim().length > 0) {
        try {
          console.log('🔄 Creating new supplier:', formData.supplier_name)
          const supplierResponse = await supplierService.create({
            name: formData.supplier_name.trim(),
            contact_person: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            country: 'India'
          })

          if (supplierResponse.success) {
            supplierId = supplierResponse.data.id
            toast.success(`Supplier '${formData.supplier_name}' created successfully`)
            // Update suppliers list
            setSuppliers([...suppliers, supplierResponse.data])
          }
        } catch (error) {
          console.error('Error creating supplier:', error)
          toast.error('Could not create supplier automatically: ' + (error.message || 'Unknown error'))
          // Continue anyway without supplier
        }
      }

      const submitData = {
        bill_number: formData.bill_number,
        bill_date: formData.bill_date,
        supplier_id: supplierId || null,
        notes: formData.notes,
        items: formData.items,
        total_amount: calculateBillTotal(),
        total_gst: calculateBillGST()
      }

      let response
      if (editingId) {
        response = await purchaseBillService.update(editingId, submitData)
        toast.success('Bill updated successfully')
      } else {
        response = await purchaseBillService.create(submitData)
        toast.success('Bill created successfully')
      }

      // Refresh list
      await fetchData()

      // Close form and show the bill in the list
      setShowForm(false)
      resetForm()

      // Scroll to the newly added bill or stay on current view
      if (response?.success) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = async (bill) => {
    try {
      const response = await purchaseBillService.getById(bill.id)
      if (response.success && response.data) {
        const billData = response.data

        // Find supplier name if supplier_id is provided
        let supplierName = ''
        if (billData.supplier_id) {
          const supplier = suppliers.find(s => s.id === billData.supplier_id)
          supplierName = supplier ? supplier.name : ''
        }

        setEditingId(bill.id)
        setFormData({
          bill_number: billData.bill_number || '',
          bill_date: billData.bill_date || new Date().toISOString().split('T')[0],
          supplier_id: billData.supplier_id || '',
          supplier_name: supplierName,
          notes: billData.notes || '',
          items: billData.items || []
        })
        setShowForm(true)
      }
    } catch (error) {
      toast.error('Failed to load bill details')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await purchaseBillService.delete(id)
        toast.success('Bill deleted successfully')
        fetchData()
      } catch (error) {
        toast.error(error.message || 'Failed to delete bill')
      }
    }
  }

  const handleApprove = async (id) => {
    try {
      await purchaseBillService.approve(id)
      toast.success('Bill approved successfully and stock updated')
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to approve bill')
    }
  }

  const handleFileUpload = async (file) => {
    console.log('📥 handleFileUpload: File selected:', file.name, file.type, file.size)

    const isImage = file.type.startsWith('image/')
    const toastMessage = isImage
      ? '🖼️ Processing image with OCR... This may take 20-30 seconds'
      : '📄 Extracting PDF details... This may take a few seconds'

    const toastId = toast.loading(toastMessage)

    try {
      console.log('🔄 Starting extraction process...')
      const result = await extractItemsFromFile(file)
      console.log('📊 Extraction result received:', result)
      toast.dismiss(toastId)

      if (result.success && result.items && result.items.length > 0) {
        console.log('✅ Successfully extracted', result.items.length, 'items')

        // Show preview modal with extracted data
        setExtractedData({
          items: result.items,
          supplier: result.supplier || {
            name: '',
            gstin: '',
            email: '',
            phone: '',
            state: '',
            address: ''
          }
        })
        setShowPreviewModal(true)
        toast.success(`📄 Extracted ${result.items.length} items - Review and save below`)
      } else {
        // Show error message
        console.warn('⚠️ No items extracted or extraction partially failed')

        if (result.imageOnlyPDF) {
          toast.error(
            '📸 Your PDF is a scanned image. Please upload a photo or image of your invoice instead for better text recognition!',
            {
              duration: 5000,
              position: 'top-center'
            }
          )
        } else {
          const errorMessage = result.message || 'Could not extract items automatically. Please add items manually below.'
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      toast.dismiss(toastId)
      console.error('❌ Error in handleFileUpload:', error)
      toast.error('Error extracting invoice. Please fill details manually.')
    }
  }

  const handlePreviewModalSave = async (billData) => {
    try {
      setLoading(true)

      // Create/update supplier
      let supplierId = null
      if (billData.supplier?.name && billData.supplier.name.trim().length > 0) {
        console.log('🔄 Creating/updating supplier:', billData.supplier.name)

        // Check if supplier already exists
        const existingSupplier = suppliers.find(s =>
          s.name.toLowerCase() === billData.supplier.name.toLowerCase()
        )

        if (existingSupplier) {
          supplierId = existingSupplier.id
          console.log('✅ Using existing supplier:', existingSupplier.name)
        } else {
          // Create new supplier
          const supplierRes = await supplierService.create({
            name: billData.supplier.name,
            gst_number: billData.supplier.gstin || '',
            email: billData.supplier.email || '',
            phone: billData.supplier.phone || '',
            state: billData.supplier.state || '',
            address: billData.supplier.address || '',
            country: 'India'
          })

          if (supplierRes.success) {
            supplierId = supplierRes.data.id
            setSuppliers([...suppliers, supplierRes.data])
            console.log('✅ Created new supplier:', billData.supplier.name)
            toast.success(`Supplier '${billData.supplier.name}' created`)
          }
        }
      }

      // Prepare bill data
      const submitData = {
        bill_number: formData.bill_number || 'INV-' + Date.now().toString().slice(-6),
        bill_date: formData.bill_date,
        supplier_id: supplierId || null,
        notes: formData.notes,
        items: billData.items,
        total_amount: billData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
        total_gst: billData.items.reduce((sum, item) => sum + ((item.quantity * item.rate) * (item.gst_percentage || 18) / 100), 0)
      }

      // Save bill
      const billRes = await purchaseBillService.create(submitData)
      if (billRes.success) {
        toast.success('Bill saved successfully!')
        setShowForm(false)
        setShowPreviewModal(false)
        resetForm()
        await fetchData()
      }
    } catch (error) {
      console.error('❌ Error saving bill:', error)
      toast.error(error.message || 'Error saving bill')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      bill_number: '',
      bill_date: new Date().toISOString().split('T')[0],
      supplier_id: '',
      supplier_name: '',
      notes: '',
      items: []
    })
    setCurrentItem({
      product_id: '',
      item_name: '',
      hsn_code: '',
      quantity: '',
      rate: '',
      gst_percentage: '18'
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"
        >
          <Plus size={18} /> Add Purchase Entry
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 overflow-y-auto p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full my-4 sm:my-8 mx-2 sm:mx-0 max-h-[calc(100vh-4rem)] overflow-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 p-3 sm:p-6 border-b bg-white">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingId ? 'Edit Purchase Entry' : 'Create Purchase Entry'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 ml-auto"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {/* Upload / Entry Mode */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Add via</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUploadMode('manual')}
                    className={`px-3 py-1 rounded-lg text-sm ${uploadMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Enter Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('pdf')}
                    className={`px-3 py-1 rounded-lg text-sm ${uploadMode === 'pdf' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Upload PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('image')}
                    className={`px-3 py-1 rounded-lg text-sm ${uploadMode === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Upload Image
                  </button>
                </div>

                {uploadMode !== 'manual' && (
                  <div className="mt-2 sm:mt-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={uploadMode === 'pdf' ? '.pdf,application/pdf' : 'image/*'}
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0]
                        if (file) handleFileUpload(file)
                        // clear input to allow re-upload of same file if needed
                        e.target.value = null
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm"
                      >
                        <Upload size={16} /> Choose file
                      </button>
                      <span className="text-xs text-gray-500">{uploadMode === 'pdf' ? 'Accepted: PDF (text or scanned)' : 'Accepted: Images (jpg, png, etc.)'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-bold text-base sm:text-lg">Bill Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Bill Number *
                    </label>
                    <input
                      type="text"
                      value={formData.bill_number}
                      onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                      required
                      className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BILL-2026-001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Bill Date *
                    </label>
                    <input
                      type="date"
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                      required
                      className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Supplier Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.supplier_name}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData({ ...formData, supplier_name: value })

                          // Show suggestions if user is typing
                          if (value.length > 0) {
                            const filtered = suppliers.filter(s =>
                              s.name.toLowerCase().includes(value.toLowerCase())
                            )
                            setSupplierSuggestions(filtered)
                            setShowSupplierSuggestions(true)
                          } else {
                            setShowSupplierSuggestions(false)
                          }
                        }}
                        onFocus={() => {
                          if (formData.supplier_name.length > 0) {
                            setShowSupplierSuggestions(true)
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSupplierSuggestions(false), 200)
                        }}
                        placeholder="Enter or select supplier name"
                        className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Autocomplete suggestions */}
                      {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {supplierSuggestions.map(supplier => (
                            <div
                              key={supplier.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  supplier_name: supplier.name,
                                  supplier_id: supplier.id
                                })
                                setShowSupplierSuggestions(false)
                              }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            >
                              {supplier.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">💡 Enter supplier name. If not found, it will be created automatically when you save.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Add Items */}
              <div className="space-y-3 sm:space-y-4 border-t pt-4 sm:pt-6">
                <h3 className="font-bold text-base sm:text-lg">Bill Items</h3>

                <div className="space-y-3 sm:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search product (optional)"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                        onFocus={() => setShowProductDropdown(true)}
                        onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                        className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showProductDropdown && productSearch.trim() !== '' && (
                        <div className="absolute z-20 left-0 right-0 bg-white border rounded mt-1 max-h-48 overflow-y-auto shadow-lg">
                          {products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                            <div
                              key={p.id}
                              onClick={() => { handleProductSelect(p.id); }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500">HSN: {p.hsn_code || '-'} • ₹{p.purchase_price || 0}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={currentItem.item_name}
                      onChange={(e) => setCurrentItem({ ...currentItem, item_name: e.target.value })}
                      disabled={!!currentItem.product_id}
                      className={`px-2 sm:px-3 py-2 border ${currentItem.product_id ? 'bg-gray-100 text-gray-500' : ''} border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="HSN Code"
                      value={currentItem.hsn_code}
                      onChange={(e) => setCurrentItem({ ...currentItem, hsn_code: e.target.value })}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Quantity *"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Rate *"
                      value={currentItem.rate}
                      onChange={(e) => setCurrentItem({ ...currentItem, rate: e.target.value })}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="GST %"
                      value={currentItem.gst_percentage}
                      onChange={(e) => setCurrentItem({ ...currentItem, gst_percentage: e.target.value })}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="overflow-x-auto -mx-3 sm:-mx-0">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 text-left">Item</th>
                          <th className="px-2 sm:px-3 py-2 text-left hidden sm:table-cell">HSN</th>
                          <th className="px-2 sm:px-3 py-2 text-right">Qty</th>
                          <th className="px-2 sm:px-3 py-2 text-right">Rate</th>
                          <th className="px-2 sm:px-3 py-2 text-right hidden sm:table-cell">GST %</th>
                          <th className="px-2 sm:px-3 py-2 text-right hidden md:table-cell">GST ₹</th>
                          <th className="px-2 sm:px-3 py-2 text-right">Total</th>
                          <th className="px-2 sm:px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-3 py-2">
                              <div className="max-w-xs truncate">{item.item_name}</div>
                              <div className="text-xs text-gray-500 sm:hidden">{item.hsn_code || '-'}</div>
                            </td>
                            <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">{item.hsn_code || '-'}</td>
                            <td className="px-2 sm:px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-2 sm:px-3 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                            <td className="px-2 sm:px-3 py-2 text-right hidden sm:table-cell">{item.gst_percentage}%</td>
                            <td className="px-2 sm:px-3 py-2 text-right hidden md:table-cell font-semibold">
                              ₹{((item.quantity * item.rate) * (item.gst_percentage / 100)).toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-right font-semibold">
                              ₹{calculateItemTotal(item.quantity, item.rate, item.gst_percentage).toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bill Summary */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 text-right">
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold">Total Items: </span>{formData.items.length}
                  </div>
                  <div className="text-base sm:text-lg font-bold border-t pt-2">
                    <span className="font-semibold">Bill Total: </span>₹{calculateBillTotal().toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    (Including GST: ₹{calculateBillGST().toFixed(2)})
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4 border-t">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium order-2 sm:order-1"
                >
                  {editingId ? 'Update' : 'Create'} Bill
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium order-1 sm:order-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        extractedData={extractedData}
        onSave={handlePreviewModalSave}
        loading={loading}
      />

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700">Bill #</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Date</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Supplier</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-gray-700">Total</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Status</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bills.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                  No bills found
                </td>
              </tr>
            ) : (
              bills.map(bill => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-700">
                    <div>{bill.bill_number}</div>
                    <div className="text-xs text-gray-500 sm:hidden">
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 hidden sm:table-cell text-xs">
                    {new Date(bill.bill_date).toLocaleDateString()}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 hidden md:table-cell truncate">
                    {bill.supplier?.name || '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 font-semibold">
                    ₹{Number(bill.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap inline-block ${bill.status === 'approved' ? 'bg-green-100 text-green-800' :
                      bill.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {bill.status?.toUpperCase() || 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {bill.status !== 'approved' && (
                        <>
                          <button
                            onClick={() => handleEdit(bill)}
                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1 text-xs"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleApprove(bill.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center gap-1 text-xs"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                            <span className="hidden sm:inline">Approve</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center gap-1 text-xs"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Delete</span>
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
  )
}
