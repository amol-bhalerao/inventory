import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Edit2, Save } from 'lucide-react'
import { quotationService, customerService, franchiseService } from '../services/services'
import toast from 'react-hot-toast'

const DEFAULT_QUOTATION_TEXT = `Dear Valued Customer,

Thank you for your interest in our products and services. We are pleased to provide you with this comprehensive quotation, tailored specifically to meet your business requirements.

Our team has carefully analyzed your needs and assembled a detailed proposal that demonstrates our commitment to delivering excellence. The items listed below represent our best offerings in terms of quality, value, and reliability.

We are confident that this quotation reflects the best value for your investment, and we look forward to partnering with you.

Best regards,
The Sales Team`

export default function QuotationPrint() {
  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [customers, setCustomers] = useState([])
  const [franchise, setFranchise] = useState(null)
  const [bodyText, setBodyText] = useState(DEFAULT_QUOTATION_TEXT)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuotation()
    fetchCustomers()
    fetchFranchise()
  }, [id])

  const fetchQuotation = async () => {
    try {
      setLoading(true)
      const response = await quotationService.getById(id)
      if (response.success) {
        const data = response.data
        setQuotation(data)
        // Use notes field as body text
        setBodyText(data.notes || DEFAULT_QUOTATION_TEXT)
        if (data.customer_id) {
          setSelectedCustomerId(data.customer_id)
        }
      } else {
        toast.error(response.message || 'Failed to load quotation')
        navigate('/quotations')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch quotation')
      navigate('/quotations')
    } finally {
      setLoading(false)
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

  const fetchFranchise = async () => {
    try {
      // Assuming franchiseId is 1 for the current franchise
      const response = await franchiseService.getById(1)
      if (response.success) {
        setFranchise(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch franchise details:', error.message)
    }
  }

  const handleCustomerChange = (e) => {
    const customerId = parseInt(e.target.value) || null
    const customer = customerId ? customers.find(c => c.id === customerId) : null
    setSelectedCustomerId(customerId)
    setSelectedCustomer(customer || null)
  }

  const calculateGrandTotal = () => {
    if (!quotation?.items || quotation.items.length === 0) {
      return 0
    }

    // Calculate subtotal without tax
    const subtotal = quotation.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0))
    }, 0)

    // Apply discount if any
    const total = subtotal - parseFloat(quotation.discount_amount || 0)
    return Math.max(0, total)
  }

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)

      // Update quotation with new body text in notes field
      const updateData = {
        notes: bodyText
      }

      const response = await quotationService.update(id, updateData)

      if (response.success) {
        setQuotation(response.data)
        setEditMode(false)
        toast.success('Quotation updated successfully')
      } else {
        toast.error(response.message || 'Failed to update quotation')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading quotation...</div>
  }

  if (!quotation) {
    return <div className="flex justify-center items-center h-screen">Quotation not found</div>
  }

  // Get customer details - prefer selected customer, then from quotation's customer_id, then use quotation data
  const currentCustomer = selectedCustomer || customers.find(c => c.id === quotation.customer_id) || null

  return (
    <>
      {/* Screen Controls */}
      <div className="sticky top-0 bg-white border-b shadow-sm screen-only">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center flex-nowrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/quotations')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition whitespace-nowrap"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Quotation #{quotation.quotation_number}</h1>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {editMode ? (
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition whitespace-nowrap"
              >
                <Edit2 size={18} />
                Edit
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {editMode && (
        <div className="bg-blue-50 border-b-2 border-blue-200 screen-only">
          <div className="max-w-7xl mx-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Customer (To Address)</label>
              <select
                value={selectedCustomerId || ''}
                onChange={handleCustomerChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Use current customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quotation Body Text</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal text-gray-700"
                placeholder="Enter quotation body text..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Quotation Document */}
      <div className="min-h-screen bg-gray-50">
        {/* Quotation Document Content */}
        <div className="quotation-document w-full bg-white">
          {/* Page Header - Like Invoice */}
          <div className="w-full p-6 print:p-4 border-b-2 border-blue-600">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-3 gap-8 items-start">
                {/* Company Logo/Name */}
                <div>
                  <h1 className="text-3xl font-bold text-blue-600 print:text-2xl mb-2">
                    {franchise?.company_name || 'Your Company'}
                  </h1>
                  <p className="text-gray-600 text-sm font-semibold">QUOTATION</p>
                </div>

                {/* Company Details */}
                <div className="text-center">
                  <p className="text-xs text-gray-600 space-y-1 leading-relaxed">
                    <span className="block font-semibold">{franchise?.address || 'Address'}</span>
                    <span className="block">{franchise?.city || 'City'}, {franchise?.state || 'State'} {franchise?.postal_code || 'PIN'}</span>
                    <span className="block">Phone: {franchise?.phone || '+91-XXXXX-XXXXX'}</span>
                    <span className="block">Email: {franchise?.email || 'contact@company.com'}</span>
                  </p>
                </div>

                {/* Quotation Info */}
                <div className="text-right space-y-1 text-sm">
                  <p><span className="font-semibold">Quotation #:</span> {quotation.quotation_number}</p>
                  <p><span className="font-semibold">Date:</span> {new Date(quotation.quotation_date).toLocaleDateString('en-IN')}</p>
                  <p><span className="font-semibold">Valid Until:</span> <span className="text-orange-600 font-semibold">{quotation.valid_until
                    ? new Date(quotation.valid_until).toLocaleDateString('en-IN')
                    : new Date(new Date(quotation.quotation_date).getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
                  }</span></p>
                  {(quotation.reference_number || quotation.referenceNumber || quotation.reference) && (
                    <p><span className="font-semibold">Reference/PO No:</span> {quotation.reference_number || quotation.referenceNumber || quotation.reference}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="w-full p-6 print:p-4 border-b border-gray-200">
            <div className="max-w-7xl mx-auto">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Bill To:</p>
              <div className="text-sm text-gray-800">
                {currentCustomer ? (
                  <>
                    <p className="font-bold">{currentCustomer.name}</p>
                    {currentCustomer.address && <p>{currentCustomer.address}</p>}
                    {currentCustomer.city && <p>{currentCustomer.city}, {currentCustomer.state} {currentCustomer.postal_code}</p>}
                    {currentCustomer.email && <p>{currentCustomer.email}</p>}
                    {currentCustomer.phone && <p>{currentCustomer.phone}</p>}
                  </>
                ) : (
                  <>
                    <p className="font-bold">{quotation.customer_name}</p>
                    {quotation.customer_email && <p>{quotation.customer_email}</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto p-6 print:p-4 space-y-6">
            {/* Quotation Meta Info - REMOVED - moved to header */}

            {/* Introduction Text / Body */}
            <div className="border-l-4 border-blue-600 pl-6 py-4 bg-blue-50 rounded">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm sm:text-base">
                {bodyText}
              </div>
            </div>

            {/* Items Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-600 pb-3">
                Quoted Items
              </h2>

              {quotation.items && quotation.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm sm:text-base">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="text-left px-4 py-3 font-semibold">Description</th>
                        <th className="text-left px-4 py-3 font-semibold">HSN</th>
                        <th className="text-right px-4 py-3 font-semibold">Quantity</th>
                        {quotation.quotation_type !== 'without_rates' && (
                          <>
                            <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                            <th className="text-right px-4 py-3 font-semibold">GST ₹</th>
                            <th className="text-right px-4 py-3 font-semibold">Amount</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quotation.items.map((item, idx) => {
                        // Robust unit price detection (support different field names)
                        const unitPrice = parseFloat(item.unit_price || item.unitPrice || item.rate || 0) || 0
                        const qty = parseFloat(item.quantity || 0) || 0
                        const gstPerc = parseFloat(item.tax_rate || item.tax_rate === 0 ? item.tax_rate : (item.gst_percentage || item.tax_percentage || 0)) || (parseFloat(item.gst_percentage || 0) || 0)
                        const gstAmount = (qty * unitPrice) * (gstPerc / 100)
                        const itemTotal = (qty * unitPrice) + gstAmount

                        return (
                          <tr key={idx} className="hover:bg-blue-50 transition">
                            <td className="px-4 py-3 text-gray-900 font-medium">{item.product_name || item.description}</td>
                            <td className="px-4 py-3 text-gray-700">{item.hsn_code || item.hsn || '-'}</td>
                            <td className="text-right px-4 py-3 text-gray-700">{qty.toFixed(2)}</td>
                            {quotation.quotation_type !== 'without_rates' && (
                              <>
                                <td className="text-right px-4 py-3 text-gray-700">₹{unitPrice.toFixed(2)}</td>
                                <td className="text-right px-4 py-3 text-gray-700">₹{gstAmount.toFixed(2)}</td>
                                <td className="text-right px-4 py-3 font-semibold text-blue-600">₹{itemTotal.toFixed(2)}</td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-lg">No items added to this quotation</p>
                </div>
              )}
            </div>

            {/* Summary Section - only show for with_rates type */}
            {quotation.items?.length > 0 && quotation.quotation_type === 'with_rates' && (
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="w-full md:w-2/3 space-y-2">
                  {quotation.payment_terms && quotation.payment_terms !== '50% advance, 50% on delivery' && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <h4 className="font-semibold mb-1">Payment Terms</h4>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.payment_terms}</div>
                    </div>
                  )}
                  {quotation.delivery_time && quotation.delivery_time !== '4-6 weeks from order confirmation' && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <h4 className="font-semibold mb-1">Delivery Time</h4>
                      <div className="text-sm text-gray-700">{quotation.delivery_time}</div>
                    </div>
                  )}
                  {quotation.warranty && quotation.warranty !== '5 years on equipment, 2 years on labor' && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <h4 className="font-semibold mb-1">Warranty</h4>
                      <div className="text-sm text-gray-700">{quotation.warranty}</div>
                    </div>
                  )}
                  {/** Bank details from franchise on left side **/}
                  {franchise && (franchise.bank_name || franchise.account_number || franchise.ifsc) && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <h4 className="font-semibold mb-1">Bank Details</h4>
                      <div className="text-sm text-gray-700">
                        {franchise.bank_name && <div>Bank: {franchise.bank_name}</div>}
                        {franchise.account_number && <div>Account: {franchise.account_number}</div>}
                        {franchise.ifsc && <div>IFSC: {franchise.ifsc}</div>}
                        {franchise.bank_branch && <div>Branch: {franchise.bank_branch}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-300 text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{quotation.items.reduce((sum, item) => {
                      const unitPrice = parseFloat(item.unit_price || item.unitPrice || item.rate || 0) || 0
                      const qty = parseFloat(item.quantity || 0) || 0
                      return sum + (qty * unitPrice)
                    }, 0).toFixed(2)}</span>
                  </div>
                  {quotation.discount_amount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-300 text-red-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-₹{parseFloat(quotation.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg border-2 border-blue-600">
                    <span className="font-bold text-lg text-gray-900">Grand Total:</span>
                    <span className="font-bold text-2xl text-blue-600">₹{calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Grand Total Only for Summary Type */}
            {quotation.items?.length > 0 && quotation.quotation_type === 'without_rates' && (
              <div className="flex justify-end mt-8">
                <div className="w-full sm:w-80">
                  <div className="flex justify-between py-3 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg border-2 border-blue-600">
                    <span className="font-bold text-lg text-gray-900">Grand Total:</span>
                    <span className="font-bold text-2xl text-blue-600">₹{calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms & Conditions (explicit field) */}
            {quotation.terms && quotation.terms.trim() !== '' && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Terms & Conditions</h3>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{quotation.terms}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300 text-center space-y-2">
              <p className="text-gray-600 text-sm font-semibold">Company Address:</p>
              <p className="text-gray-600 text-sm">
                {franchise?.address ? `${franchise.address}, ${franchise.city}, ${franchise.state} ${franchise.postal_code}` : 'Your Company Address'}
              </p>
              <p className="text-gray-600 text-sm">
                {franchise?.phone ? `Phone: ${franchise.phone}` : 'Phone: N/A'} | {franchise?.email ? `Email: ${franchise.email}` : 'Email: N/A'}
              </p>
              <p className="text-gray-500 text-xs mt-4">
                Thank you for considering our proposal. This quotation is valid until the date mentioned above.
              </p>
              <p className="text-gray-400 text-xs">Generated on {new Date().toLocaleDateString('en-IN')} | Powered by Solarwala</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
          padding: 0;
        }

        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          html, body {
            width: 100%;
            height: 100%;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          nav, header, footer, .navbar, .topbar, [class*="header"], .sticky {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .screen-only {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .quotation-document {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            page-break-after: auto;
            position: absolute;
            top: 0;
            left: 0;
          }

          .quotation-document > * {
            page-break-inside: avoid;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
          }

          tbody tr {
            page-break-inside: avoid;
          }

          .bg-gradient-to-r, .bg-blue-600, .bg-blue-50, .text-white {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        .quotation-document {
          width: 100%;
          display: block;
          background: white;
          margin: 16px auto;
          padding: 8mm;
          max-width: 210mm;
          border: 1px solid #d1d5db;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif;
        }
      `}</style>
    </>
  )
}
