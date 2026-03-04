import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Edit2, Save, X } from 'lucide-react'
import { quotationService, customerService, franchiseService, productService } from '../services/services'
import { termsAndConditionsTemplates } from '../constants/quotationTemplates'
import toast from 'react-hot-toast'

const DEFAULT_LETTER_BODY = `Dear Valued Customer,

Thank you for your interest in our solar energy solutions. We are pleased to present this detailed quotation prepared specifically for your requirements.

After careful analysis of your project needs, our technical team has assembled a comprehensive proposal featuring high-quality renewable energy solutions designed to meet your business objectives and budget considerations.

This quotation is valid for 30 days from the date mentioned and includes all specifications and pricing details. Should you require any modifications or have questions regarding this proposal, please do not hesitate to contact us.

We look forward to the opportunity to serve you and establish a long-term partnership.

Best regards,
Management`

export default function QuotationPrintNew() {
  const [quotation, setQuotation] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [letterBody, setLetterBody] = useState(DEFAULT_LETTER_BODY)
  const [termsText, setTermsText] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('50% advance, 50% on delivery')
  const [deliveryTime, setDeliveryTime] = useState('4-6 weeks from order confirmation')
  const [warranty, setWarranty] = useState('5 years on equipment, 2 years on labor')
  const [selectedTermsTemplate, setSelectedTermsTemplate] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotRes, franchiseRes, productsRes] = await Promise.all([
        quotationService.getById(id),
        franchiseService.getById(1),
        productService.getAll(1000, 0)
      ])

      if (quotRes.success) {
        setQuotation(quotRes.data)
        setLetterBody(quotRes.data.letter_body || DEFAULT_LETTER_BODY)
        setTermsText(quotRes.data.terms || '')
        setPaymentTerms(quotRes.data.payment_terms || 'Payment Terms')
        setDeliveryTime(quotRes.data.delivery_time || '4-6 weeks')
        setWarranty(quotRes.data.warranty || '5 years warranty')
        setSelectedTermsTemplate(quotRes.data.terms_template_id || 1)

        // Fetch customer if quotation has customer_id
        if (quotRes.data.customer_id) {
          try {
            const custRes = await customerService.getById(quotRes.data.customer_id)
            if (custRes.success) setCustomer(custRes.data)
          } catch (err) {
            console.log('Could not fetch customer')
          }
        }
      } else {
        toast.error('Failed to load quotation')
        navigate('/quotations')
      }

      if (franchiseRes.success) {
        setFranchise(franchiseRes.data)
      }

      if (productsRes.success) {
        setProducts(productsRes.data || [])
        setFilteredProducts(productsRes.data || [])
      }
    } catch (error) {
      toast.error(error.message)
      navigate('/quotations')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)
      const response = await quotationService.update(id, {
        terms: termsText,
        letter_body: letterBody,
        payment_terms: paymentTerms,
        delivery_time: deliveryTime,
        warranty: warranty,
        terms_template_id: selectedTermsTemplate
      })
      if (response.success) {
        setQuotation(response.data)
        setEditMode(false)
        toast.success('Quotation updated')
      } else {
        toast.error(response.message || 'Failed to update')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProductSearch = (e) => {
    const value = e.target.value.toLowerCase()
    setSearchTerm(value)
    if (value.trim() === '') {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(value) ||
        p.sku.toLowerCase().includes(value)
      )
      setFilteredProducts(filtered)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Loading quotation...</div>
  if (!quotation) return <div className="flex justify-center items-center h-screen">Quotation not found</div>

  // Determine Bill To address
  const billTo = customer || {
    name: quotation.customer_name || 'Customer Name',
    address: quotation.customer_address || '',
    city: quotation.customer_city || '',
    state: quotation.customer_state || '',
    postal_code: quotation.customer_postal_code || '',
    phone: quotation.customer_phone || '',
    email: quotation.customer_email || ''
  }

  const quotationDate = new Date(quotation.quotation_date)
  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until)
    : new Date(quotationDate.getTime() + 10 * 24 * 60 * 60 * 1000)

  // Calculate totals
  const isSummaryType = quotation.quotation_type === 'without_rates'
  const subtotal = quotation.items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0
  const totalGST = quotation.items?.reduce((sum, item) => {
    const gstPercentage = item.gst_percentage ?? item.tax_rate ?? 0
    const lineTotal = item.quantity * item.unit_price
    return sum + (lineTotal * gstPercentage / 100)
  }, 0) || 0
  const discount = parseFloat(quotation.discount_amount || 0)
  const taxableAmount = subtotal - discount
  const gstOnTaxableAmount = taxableAmount * (quotation.gst_percentage || 0.18)
  const grandTotal = isSummaryType ? taxableAmount : (subtotal + totalGST - discount)

  return (
    <div>
      {/* Screen Controls */}
      <div className="screen-only sticky top-0 z-50 bg-white border-b shadow flex flex-col sm:flex-row justify-between items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <h2 className="text-lg font-bold text-gray-800">{quotation.quotation_number}</h2>
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
              >
                <X size={18} />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            >
              <Edit2 size={18} />
              Edit
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>

      {/* always-editable payment/warranty/delivery fields */}
      <div className="screen-only bg-gray-50 border-b mb-2 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Time</label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Warranty</label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {editMode && (
        <div className="screen-only bg-blue-50 border-b-2 border-blue-300 p-4">
          <div className="max-w-6xl mx-auto space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Letter Body (First Page)</label>
              <textarea
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded font-normal text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Use Terms & Conditions Template</label>
              <select
                value={selectedTermsTemplate}
                onChange={(e) => {
                  const templateId = parseInt(e.target.value)
                  setSelectedTermsTemplate(templateId)
                  const template = termsAndConditionsTemplates.find(t => t.id === templateId)
                  if (template) setTermsText(template.content)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Blank / Manual Entry</option>
                {termsAndConditionsTemplates.map(template => (
                  <option key={template.id} value={template.id}>{template.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* A4 Document - Page 1: Items with Bill To and Quotation Details */}
      <div className="quotation-document page-items">
        {/* Company Header */}
        <div className="company-header">
          <div className="header-content">
            <div className="company-info">
              <h1 className="company-name">{franchise?.company_name || franchise?.name || 'Company Name'}</h1>
              <p className="company-address">
                {franchise?.address && `${franchise.address}`}
                {franchise?.city && `, ${franchise.city}`}
                {franchise?.state && ` - ${franchise.state}`}
                {franchise?.postal_code && ` ${franchise.postal_code}`}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To and Quotation Details */}
        <div className="bill-details-section">
          {/* Bill To */}
          <div className="bill-to-box">
            <h3>Bill To:</h3>
            <div className="bill-to-content">
              <p className="customer-name">{billTo.name}</p>
              {billTo.address && <p>{billTo.address}</p>}
              {(billTo.city || billTo.state) && (
                <p>{billTo.city}{billTo.state ? ` - ${billTo.state}` : ''}</p>
              )}
              {billTo.postal_code && <p>PIN: {billTo.postal_code}</p>}
              {billTo.phone && <p>Phone: {billTo.phone}</p>}
              {billTo.email && <p>Email: {billTo.email}</p>}
            </div>
          </div>

          {/* Quotation Details */}
          <div className="invoice-details-box">
            <div className="details-header">
              <h2 className="title">QUOTATION</h2>
            </div>
            <div className="details-grid">
              <div>
                <p className="label">Quotation No:</p>
                <p className="value">{quotation.quotation_number}</p>
              </div>
              <div>
                <p className="label">Quotation Date:</p>
                <p>{quotationDate.toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="label">Valid Until:</p>
                <p className="font-semibold text-orange-600">{validUntil.toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {quotation.items && quotation.items.length > 0 && (
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item & Description</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  {!isSummaryType && (
                    <>
                      <th>Unit Price</th>
                      <th>GST</th>
                      <th>Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, idx) => {
                  const gstPercentage = item.gst_percentage ?? item.tax_rate ?? 0
                  const lineTotal = item.quantity * item.unit_price
                  const gstAmount = lineTotal * (gstPercentage / 100)
                  const totalAmount = lineTotal + gstAmount
                  return (
                    <tr key={idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <p className="font-semibold">{item.product_name || item.description}</p>
                        {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
                      </td>
                      <td className="text-center text-xs">{item.hsn_code || '-'}</td>
                      <td className="text-center">{item.quantity}</td>
                      {!isSummaryType && (
                        <>
                          <td className="text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                          <td className="text-right text-xs">{gstPercentage}%</td>
                          <td className="text-right font-semibold">₹{totalAmount.toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grand Total and Standard Details - Side by Side */}
        {quotation.items && quotation.items.length > 0 && !isSummaryType && (
          <div className="summary-details-row">


            {/* Standard Details Section */}
            <div className="standard-details-section">
              <div className="detail-item">
                <span className="label">Payment Terms:</span>
                <span className="value">{paymentTerms}</span>
              </div>
              <div className="detail-item">
                <span className="label">Delivery Time:</span>
                <span className="value">{deliveryTime}</span>
              </div>
              <div className="detail-item">
                <span className="label">Warranty:</span>
                <span className="value">{warranty}</span>
              </div>
            </div>

            {/* Tax Summary Section */}
            <div className="tax-summary-section">
              <div className="total-box">
                <table className="total-table">
                  <tbody>
                    <tr>
                      <td className="label">Sub Total</td>
                      <td className="value">₹{subtotal.toFixed(2)}</td>
                    </tr>
                    {discount > 0 && (
                      <tr>
                        <td className="label">Discount</td>
                        <td className="value text-red-600">-₹{discount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="label">Total GST</td>
                      <td className="value">₹{totalGST.toFixed(2)}</td>
                    </tr>
                    <tr className="total-row">
                      <td className="label">Grand Total</td>
                      <td className="value">₹{grandTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bank Details and Signature - added to fill space on items page */}
        <div className="footer-boxes">
          <div className="footer-box">
            <h4>Bank Details:</h4>
            <p className="footer-text">
              {franchise?.bank_name || 'Bank Name'}<br />
              {franchise?.account_number || 'Account Number'}<br />
              {franchise?.ifsc_code || 'IFSC Code'}
            </p>
          </div>
          <div className="footer-box signature-box">
            <p className="footer-text">Authorized Signature</p>
          </div>
        </div>

        {/* Terms & Conditions - flexible, occupies space if available */}
        <div className="terms-flexible">
          <h4>Terms & Conditions:</h4>
          <p className="footer-text">{termsText || 'Standard terms and conditions apply.'}</p>
        </div>
        <div className="invoice-footer">
          <p className="generated-date">
            Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | {franchise?.company_name || 'Company'} Inventory System
          </p>
        </div>
      </div>





      {/* Page Last: Letter */}
      <div className="quotation-document page-letter">
        {/* Company Header */}
        <div className="company-header">
          <div className="header-content">
            <div className="company-info">
              <h1 className="company-name">{franchise?.company_name || franchise?.name || 'Company Name'}</h1>
              <p className="company-address">
                {franchise?.address && `${franchise.address}`}
                {franchise?.city && `, ${franchise.city}`}
                {franchise?.state && ` - ${franchise.state}`}
                {franchise?.postal_code && ` ${franchise.postal_code}`}
              </p>
              <p className="company-contact">
                {franchise?.phone && `Phone: ${franchise.phone}`}
                {franchise?.email && ` | Email: ${franchise.email}`}
              </p>
            </div>
          </div>
        </div>

        {/* Letter Body Section */}
        <div className="letter-section">
          <div className="letter-date">
            <p className="text-sm text-gray-600">Date: <span className="font-semibold">{quotationDate.toLocaleDateString('en-IN')}</span></p>
          </div>

          <div className="letter-body">
            <p className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">{letterBody}</p>
          </div>

          <div className="letter-footer">
            <p className="text-sm text-gray-600">
              Quotation No: <span className="font-semibold">{quotation.quotation_number}</span>
            </p>
            <p className="text-sm text-gray-600">
              Valid Until: <span className="font-semibold text-orange-600">{validUntil.toLocaleDateString('en-IN')}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="letter-footer-bottom">
          <p className="text-xs text-gray-500">
            Authorized Signature: ___________________
          </p>
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
            box-sizing: border-box !important;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          nav, footer, .navbar, .topbar, .screen-only {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .quotation-document {
            width: 210mm;
            max-width: 100%;
            margin: 0 !important;
            padding: 5mm !important;
            background: white !important;
            font-family: Arial, sans-serif;
            border: none !important;
            display: block;
            box-sizing: border-box;
          }
          
          .quotation-document:last-of-type {
            page-break-after: auto;
          }
          
          table {
            page-break-inside: avoid;
            width: 100%;
          }
          
          tbody tr {
            page-break-inside: avoid;
          }
          
          /* Page break rules for new structure */
          .page-items {
            page-break-after: auto;
          }
          
          .page-summary {
            page-break-before: always;
            page-break-after: auto;
          }
          
          .page-letter {
            page-break-before: always;
            page-break-after: auto;
          }
          
          /* avoid breaks inside non-flexible sections */
          .company-header, .bill-details-section, 
          .tax-summary-section, .standard-details-section, 
          .footer-boxes, .invoice-footer {
            page-break-inside: avoid;
          }
          
          /* items table can break across pages naturally */
          .items-table-container {
            page-break-inside: auto;
          }
          
          .items-table {
            page-break-inside: auto;
          }
          
          /* keep terms block together; if it doesn't fit move to next page */
          .terms-full {
            page-break-inside: avoid;
          }
          
          /* flexible terms that can fit on page 1 or move to next page */
          .terms-flexible {
            page-break-inside: auto;
            orphans: 2;
            widows: 2;
          }
          
          .letter-section {
            page-break-inside: auto;
          }
        }
        
        
        
        .quotation-document {
          max-width: 210mm;
          background: white;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          color: #1f2937;
          font-size: 10px;
          line-height: 1.3;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .page-items {
          background: white;
          padding: 10mm !important;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .page-summary {
          background: white;
          padding: 10mm !important;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        

        
        .page-letter {
          background: white;
          padding: 10mm !important;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          page-break-before: always;
        }
        
        .company-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 10px 8px;
          border-bottom: 2px solid #1e40af;
          page-break-inside: avoid;
          margin-bottom: 6px;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        
        .company-info {
          text-align: center;
          flex: 1;
        }
        
        .company-info h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 2px 0;
          letter-spacing: 0.5px;
        }
        
        .company-address {
          font-size: 9px;
          margin: 2px 0 0 0;
          line-height: 1.2;
          opacity: 0.95;
        }
        
        .company-contact {
          font-size: 8px;
          margin: 2px 0 0 0;
          opacity: 0.9;
        }
        
        /* Letter Style */
        .letter-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          page-break-inside: avoid;
          margin: 8px 0;
        }
        
        .letter-date {
          text-align: right;
          font-size: 10px;
          color: #6b7280;
        }
        
        .letter-body {
          flex: 1;
          font-size: 11px;
          line-height: 1.8;
          text-align: justify;
          color: #374151;
          padding: 16px 0;
        }
        
        .letter-body p {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.8;
        }
        
        .letter-footer {
          border-top: 1px solid #d1d5db;
          padding-top: 8px;
          font-size: 10px;
          color: #6b7280;
        }
        
        .letter-footer-bottom {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #d1d5db;
          text-align: right;
        }
        
        .bill-details-section {
          display: flex;
          gap: 8px;
          padding: 0 !important;
          border-bottom: none !important;
          page-break-inside: avoid;
          margin-bottom: 8px;
        }
        
        .bill-to-box,
        .invoice-details-box {
          flex: 1;
          border: 1px solid #d1d5db;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }
        
        .bill-to-box h3,
        .invoice-details-box h3 {
          font-weight: 700;
          font-size: 11px;
          margin: 0 0 8px 0;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 5px;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .details-header {
          text-align: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 3px solid #1e40af;
        }
        
        .details-header .title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: 0.5px;
        }
        
        .bill-to-content,
        .details-grid {
          font-size: 10px;
          line-height: 1.6;
        }
        
        .customer-name {
          font-weight: 700;
          margin-bottom: 4px;
          color: #111827;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .details-grid .col-span-2 {
          grid-column: 1 / -1;
        }
        
        .details-grid .label {
          font-weight: 600;
          color: #6b7280;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .details-grid .value {
          font-weight: 600;
          color: #1e40af;
          font-size: 10px;
        }
        
        /* Summary and Details on Same Row */
        .summary-details-row {
          display: flex;
          gap: 12px;
          page-break-inside: avoid;
          margin-bottom: 12px;
          align-items: stretch;
        }
        
        .summary-details-row .tax-summary-section {
          flex: 0 0 auto;
          margin-bottom: 0 !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }
        
        .summary-details-row .standard-details-section {
          flex: 1 1 auto;
          margin-bottom: 0 !important;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
        }
        
        /* Standard Details Section */
        .standard-details-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          font-size: 10px;
        }
        
        .detail-item .label {
          font-weight: 600;
          color: #1e40af;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        
        .detail-item .value {
          color: #374151;
          font-weight: 500;
        }
        
        .items-table-container {
          padding: 0 !important;
          border-bottom: none !important;
          margin-bottom: 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        
        .items-table thead {
          background: linear-gradient(to right, #1e40af, #1e3a8a);
          border: none;
        }
        
        .items-table th {
          border: none;
          padding: 6px 4px;
          text-align: left;
          font-weight: 700;
          text-align: center;
          color: white;
          font-size: 9px;
        }
        
        .items-table td {
          border: 1px solid #e5e7eb;
          padding: 6px 4px;
          background: white;
          font-size: 9px;
        }
        
        .items-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .items-table tbody tr:nth-child(odd) {
          background-color: white;
        }
        
        .items-table tbody tr {
          page-break-inside: avoid;
        }
        
        .tax-summary-section {
          display: flex;
          gap: 8px;
          padding: 0 !important;
          border-bottom: none !important;
          page-break-inside: avoid;
          margin-bottom: 12px;
          justify-content: flex-end;
        }

        
        .total-box {
          flex: 0 0 280px;
          border: 2px solid #1e40af;
          padding: 10px;
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          border-radius: 4px;
        }
        
        .total-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          font-size: 9px;
        }
        
        .total-table td {
          border: none;
          padding: 6px 0;
        }
        
        .total-table td.label {
          font-weight: 600;
          text-align: left;
          color: #111827;
        }
        
        .total-table td.value {
          text-align: right;
          font-weight: 700;
          color: #1e40af;
        }
        
        .total-row {
          background: transparent;
          border-top: 3px solid #1e40af;
          font-weight: 700;
          padding: 8px 0 !important;
          font-size: 12px;
        }
        
        .total-row td {
          border-top: none;
          color: #1e40af;
        }
        
        .total-row td.label {
          color: #111827;
        }
        
        .footer-boxes {
          display: flex;
          gap: 8px;
          padding: 0 !important;
          page-break-inside: avoid;
         
          flex-shrink: 0;
        }
        
        .footer-box {
          flex: 1;
          border: 1px solid #d1d5db;
          padding: 10px;
          font-size: 8px;
          border-radius: 4px;
          background: white;
        }
        
        .footer-box h4 {
          margin: 0 0 6px 0;
          font-weight: 700;
          font-size: 9px;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 4px;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .footer-text {
          margin: 0;
          line-height: 1.3;
          color: #374151;
          white-space: pre-wrap;
        }
        
        .signature-box {
          text-align: center;
          padding-top: 20px;
          font-weight: 600;
          color: #111827;
          font-size: 8px;
          line-height: 1.3;
        }
        
        /* Terms section - flexible to fill empty space on page 1 */
        .terms-flexible {
          border: 1px solid #d1d5db;
          padding: 12px;
          font-size: 8.5px;
          border-radius: 4px;
          background: white;
          margin-top: 12px;
          margin-bottom: 8px;
          page-break-inside: auto;
        }
        
        .terms-flexible h4 {
          margin: 0 0 6px 0;
          font-weight: 700;
          font-size: 9px;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 4px;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .terms-flexible .footer-text {
          line-height: 1.5;
          color: #374151;
          font-size: 8.5px;
        }
        
        /* Terms & Conditions full page */
        .terms-full {
          border: 1px solid #d1d5db;
          padding: 15px;
          font-size: 9px;
          border-radius: 4px;
          background: white;
          margin-bottom: 16px;
          flex: 1;
        }
        
        .terms-full h4 {
          margin: 0 0 10px 0;
          font-weight: 700;
          font-size: 11px;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 8px;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .terms-full .footer-text {
          line-height: 1.6;
          color: #374151;
        }
        
        .invoice-footer {
          background: linear-gradient(to right, #f0f9ff 0%, #e0f2fe 100%);
          padding: 8px 10px;
          text-align: center;
          border-top: 2px solid #1e40af;
          font-size: 8px;
          page-break-inside: avoid;
          flex-shrink: 0;
          color: #6b7280;
          font-weight: 500;
        }
        
        .generated-date {
          margin: 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}
