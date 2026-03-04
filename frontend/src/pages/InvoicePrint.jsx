import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { invoiceService, customerService, franchiseService } from '../services/services'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

export default function InvoicePrint() {
  const [invoice, setInvoice] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchInvoice()
    fetchFranchise()
  }, [id])

  const fetchFranchise = async () => {
    try {
      const response = await franchiseService.getById(1)
      if (response.success && response.data) {
        setFranchise(response.data)
      } else {
        // Fallback to default franchise data
        setFranchise({
          name: 'Solarwala',
          company_name: 'Solarwala',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          phone: '',
          email: ''
        })
      }
    } catch (err) {
      console.log('Could not fetch franchise details:', err.message)
      // Set default franchise data on error
      setFranchise({
        name: 'Solarwala',
        company_name: 'Solarwala',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        phone: '',
        email: ''
      })
    }
  }

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const response = await invoiceService.getById(id)
      if (response.success) {
        setInvoice(response.data)
        // Fetch customer details if available
        if (response.data.customer_id) {
          try {
            const customerRes = await customerService.getById(response.data.customer_id)
            if (customerRes.success) {
              setCustomer(customerRes.data)
            }
          } catch (err) {
            console.log('Could not fetch customer details')
          }
        }
      } else {
        toast.error(response.message || 'Failed to load invoice')
        navigate('/invoices')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch invoice')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const scales = ['', 'Thousand', 'Lakh', 'Crore']

    if (num === 0) return 'Zero'

    const parts = []
    let scaleIndex = 0

    while (num > 0) {
      let part = num % (scaleIndex === 0 ? 1000 : 100)
      if (part > 0) {
        let partWords = ''
        if (part >= 100) {
          partWords = ones[Math.floor(part / 100)] + ' Hundred '
          part %= 100
        }
        if (part >= 20) {
          partWords += tens[Math.floor(part / 10)]
          if (part % 10 > 0) partWords += ' ' + ones[part % 10]
        } else if (part >= 10) {
          partWords += teens[part - 10]
        } else if (part > 0) {
          partWords += ones[part]
        }
        if (scales[scaleIndex]) partWords += ' ' + scales[scaleIndex]
        parts.unshift(partWords.trim())
      }
      num = Math.floor(num / (scaleIndex === 0 ? 1000 : 100))
      scaleIndex++
    }

    return parts.join(' ').trim() + ' Rupees Only'
  }

  // Deduplicates invoice items by combining same products with combined quantities
  const deduplicateItems = (items) => {
    if (!items || items.length === 0) return []
    
    const dedupMap = new Map()
    
    items.forEach(item => {
      const key = item.product_id || item.product_name
      
      if (dedupMap.has(key)) {
        const existing = dedupMap.get(key)
        existing.quantity = (existing.quantity || 0) + (item.quantity || 0)
      } else {
        dedupMap.set(key, { ...item })
      }
    })
    
    return Array.from(dedupMap.values())
  }

  const calculateTaxBreakdown = (itemsToBreakdown) => {
    const breakdown = {}
    const itemsForBreakdown = itemsToBreakdown || (invoice.items ? deduplicateItems(invoice.items) : [])
    
    if (itemsForBreakdown && itemsForBreakdown.length > 0) {
      itemsForBreakdown.forEach(item => {
        const hsn = item.hsn_code || 'N/A'
        const rate = item.tax_rate || 0
        const key = `${hsn}_${rate}`
        if (!breakdown[key]) {
          breakdown[key] = { 
            hsn, 
            rate, 
            taxableValue: 0,
            cgst: 0, 
            sgst: 0,
            totalTax: 0
          }
        }
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
        const taxAmount = (lineTotal * rate) / 100
        breakdown[key].taxableValue += lineTotal
        breakdown[key].cgst += taxAmount / 2
        breakdown[key].sgst += taxAmount / 2
        breakdown[key].totalTax += taxAmount
      })
    }
    return breakdown
  }

  const hasGST = () => {
    if (!invoice.items) return false
    return invoice.items.some(item => (item.tax_rate || 0) > 0)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading invoice...</div>
  }

  if (!invoice) {
    return <div className="flex justify-center items-center h-screen">Invoice not found</div>
  }

  const taxBreakdown = calculateTaxBreakdown()
  const totalAmount = Number(invoice.total_amount || 0)
  const companyName = franchise?.company_name || user?.franchiseName || 'Solarwala'
  const showGSTColumns = hasGST()

  return (
    <>
      {/* Header Controls - Screen Only */}
      <div className="screen-only flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 p-2 sm:p-4 bg-gray-100">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Printer size={18} />
          Print Invoice
        </button>
      </div>

      {/* A4 Invoice Document */}
      <div className="invoice-document">
        {/* Company Header */}
        <div className="company-header">
          <div className="header-content">
            <div className="company-info">
              <h1 className="company-name">{franchise?.name || 'Solarwala'}</h1>
              <p className="company-address">
                {franchise?.address && `${franchise.address}`}
                {franchise?.city && `, ${franchise.city}`}
                {franchise?.state && ` - ${franchise.state}`}
                {franchise?.postal_code && ` ${franchise.postal_code}`}
              </p>
            </div>
            {/* <div className="company-details">
              {franchise?.phone && <p>Phone: {franchise.phone}</p>}
              {franchise?.email && <p>Email: {franchise.email}</p>}
              {franchise?.gst_number && <p className="mt-1">GSTIN: {franchise.gst_number}</p>}
            </div> */}
          </div>
        </div>

        {/* Tax Invoice Title */}
        <div className="invoice-title">
          <h2>TAX INVOICE</h2>
        </div>

        {/* Bill To and Invoice Details */}
        <div className="bill-details-section">
          {/* Bill To */}
          <div className="bill-to-box">
            <h3>Bill To:</h3>
            <div className="bill-to-content">
              <p className="customer-name">{invoice.customer_name}</p>
              {/* Try to show address from invoice first, then from customer object */}
              {(invoice.customer_address || customer?.address) && (
                <p>{invoice.customer_address || customer?.address}</p>
              )}
              {(invoice.customer_city || customer?.city) && (
                <p>{(invoice.customer_city || customer?.city) || 'N/A'} {(invoice.customer_state || customer?.state) ? `- ${invoice.customer_state || customer?.state}` : ''}</p>
              )}
              {/* Show postal code if available */}
              {(invoice.customer_postal_code || customer?.postal_code) && (
                <p>PIN: {invoice.customer_postal_code || customer?.postal_code}</p>
              )}
              {/* Show phone if available */}
              {(invoice.customer_phone || customer?.phone) && (
                <p>Phone: {invoice.customer_phone || customer?.phone}</p>
              )}
              {/* Show GST number - try from invoice first, then customer */}
              {(invoice.customer_gst || customer?.gst_number) && (
                <p>GST: {invoice.customer_gst || customer?.gst_number}</p>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details-box">
            <div className="details-grid">
              <div>
                <p className="label">Invoice No:</p>
                <p className="value">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="label">Date:</p>
                <p>{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="label">PO Number:</p>
                <p>N/A</p>
              </div>
              <div>
                <p className="label">Delivery Date:</p>
                <p>{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="col-span-2">
                <p className="label">Place of Supply:</p>
                <p>Maharashtra</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="items-table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item & Description</th>
                <th>HSN Code</th>
                <th>Qty</th>
                <th>Price</th>
                {showGSTColumns && <>
                  <th>GST %</th>
                  <th>GST</th>
                </>}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && deduplicateItems(invoice.items).map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
                const gstAmount = (lineTotal * (item.tax_rate || 0)) / 100
                return (
                  <tr key={idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-xs text-gray-600">{item.description || ''}</p>
                    </td>
                    <td className="text-center">{item.hsn_code || 'N/A'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                    {showGSTColumns && <>
                      <td className="text-right">{item.tax_rate || 0}%</td>
                      <td className="text-right font-semibold">₹{gstAmount.toFixed(2)}</td>
                    </>}
                    <td className="text-right font-semibold">₹{(lineTotal + (showGSTColumns ? gstAmount : 0)).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Tax Summary and Total */}
        <div className="tax-summary-section">
          {/* Tax Details - Only show if GST exists */}
          {showGSTColumns && (
            <div className="tax-details-box">
              <h3>Tax Summary (by HSN/SAC Code)</h3>
              <table className="tax-table">
                <thead>
                  <tr>
                    <th>HSN/SAC</th>
                    <th>Taxable Value</th>
                    <th>GST Rate</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(taxBreakdown).map((key) => {
                    const item = taxBreakdown[key]
                    return (
                      <tr key={key}>
                        <td>{item.hsn}</td>
                        <td className="text-right">₹{item.taxableValue.toFixed(2)}</td>
                        <td className="text-center">{item.rate}%</td>
                        <td className="text-right">₹{item.cgst.toFixed(2)}</td>
                        <td className="text-right">₹{item.sgst.toFixed(2)}</td>
                        <td className="text-right font-semibold">₹{item.totalTax.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total Amount Box */}
          <div className="total-box">
            <table className="total-table">
              <tbody>
                <tr>
                  <td className="label">Sub Total</td>
                  <td className="value">₹{Number(invoice.subtotal || 0).toFixed(2)}</td>
                </tr>
                {showGSTColumns && (
                  <>
                    <tr>
                      <td className="label">CGST</td>
                      <td className="value">
                        ₹{Object.values(taxBreakdown).reduce((sum, val) => sum + val.cgst, 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="label">SGST</td>
                      <td className="value">
                        ₹{Object.values(taxBreakdown).reduce((sum, val) => sum + val.sgst, 0).toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
                <tr className="total-row">
                  <td className="label">Total</td>
                  <td className="value">₹{totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-in-words">
          <p><span className="font-semibold">Amount in Words:</span> {numberToWords(Math.floor(totalAmount))}</p>
        </div>

       

        {/* Terms & Conditions, Bank Details, Signature */}
        <div className="footer-boxes">
          <div className="footer-box">
            <h4>Terms & Conditions:</h4>
            <p>1. All invoices must be paid within 30 days</p>
            <p>2. Late payment may attract GST as per applicable rules</p>
          </div>
          <div className="footer-box">
            <h4>Notes:</h4>
            {invoice.notes || `1. Payment terms: Net 30 days from invoice date\n2. GST charges are as per applicable rates\n3. Products are subject to warranty as mentioned in the sales agreement\n4. Disputed invoices must be raised within 30 days of invoice date\n5. Thank you for your business!`}
          </div>
          <div className="footer-box signature-box">
            <p>Authorized Signature</p>
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-footer">
          <p className="generated-date">
            Generated on {new Date().toLocaleDateString('en-IN')} | Powered by Solarwala Inventory Management System
          </p>
        </div>
      </div>

      {/* A4 Print Styles */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
          padding: 0;
          border: 2px solid #6b7280;
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
          
          .invoice-document {
            width: 210mm;
            height: 297mm;
            max-width: 100%;
            margin: 0 !important;
            padding: 5mm !important;
            background: white !important;
            font-family: Arial, sans-serif;
            page-break-after: auto;
            border: none !important;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }
          
          .invoice-document > div:not(.footer-boxes):not(.invoice-footer) {
            page-break-inside: avoid;
          }
          
          .footer-boxes {
            margin-top: auto !important;
            flex-shrink: 0;
          }
          
          .invoice-footer {
            flex-shrink: 0;
          }
          
          table {
            page-break-inside: avoid;
            width: 100%;
          }
          

          tbody tr {
            page-break-inside: avoid;
          }
          
          .company-header, .invoice-title, .bill-details-section, .items-table-container, 
          .tax-summary-section, .amount-in-words, .notes-section, .footer-boxes, .invoice-footer {
            page-break-inside: avoid;
          }
        }
        
        .screen-only {
        //   display: block;
        }
        
        .invoice-document {
          max-width: 210mm;
          background: white;
          margin: 16px auto;
          font-family: Arial, sans-serif;
          color: #1f2937;
          font-size: 11px;
          line-height: 1.4;
          padding: 15mm !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border: 1px solid #d1d5db;
          min-height: 90vh;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        
        .company-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 16px 12px;
          border-bottom: 3px solid #1e40af;
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }
        .company-info {
          text-align: center;
          flex: 1;
        }
        .company-info h1 {
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
        }
        
        .company-address {
          font-size: 10px;
          margin: 4px 0 0 0;
          line-height: 1.3;
          opacity: 0.95;
        }
        
        .company-details {
          text-align: right;
          font-size: 10px;
          line-height: 1.5;
        }
        
        .company-details p {
          margin: 2px 0;
        }
        
        .invoice-title {
          border-bottom: 3px solid #1e40af;
          background: linear-gradient(to right, #f0f9ff 0%, #e0f2fe 100%);
          padding: 14px 12px;
          text-align: center;
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .invoice-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: 0.3px;
        }
        
        .bill-details-section {
          display: flex;
          gap: 12px;
          padding: 0 !important;
          border-bottom: none !important;
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .bill-to-box,
        .invoice-details-box {
          flex: 1;
          border: 2px solid #e0f2fe;
          padding: 12px;
          background: #f8fbff;
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
        
        .items-table-container {
          padding: 0 !important;
          border-bottom: none !important;
          page-break-inside: avoid;
          margin-bottom: 12px;
          border: 2px solid #e0f2fe;
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
          padding: 8px 5px;
          text-align: left;
          font-weight: 700;
          text-align: center;
          color: white;
          font-size: 10px;
        }
        
        .items-table td {
          border: 1px solid #e5e7eb;
          padding: 8px 5px;
          background: white;
        }
        
        .items-table tbody tr:nth-child(even) {
          background-color: #f8fbff;
        }
        
        .items-table tbody tr:nth-child(odd) {
          background-color: white;
        }
        
        .items-table tbody tr {
          page-break-inside: avoid;
        }
        
        .tax-summary-section {
          display: flex;
          gap: 12px;
          padding: 0 !important;
          border-bottom: none !important;
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .tax-details-box {
          flex: 2;
          border: 2px solid #e0f2fe;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .total-box {
          flex: 1;
          border: 3px solid #1e40af;
          padding: 12px;
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          border-radius: 4px;
        }
        
        .tax-details-box h3,
        .total-box h3 {
          font-weight: 700;
          font-size: 11px;
          margin: 0;
          padding: 8px 12px;
          background: linear-gradient(to right, #1e40af, #1e3a8a);
          color: white;
          border-bottom: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .tax-table,
        .total-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          font-size: 10px;
        }
        
        .tax-table thead {
          background: #f0f9ff;
          border-bottom: 2px solid #1e40af;
        }
        
        .tax-table th,
        .total-table th {
          border: none;
          padding: 6px 8px;
          text-align: left;
          font-weight: 700;
          color: #1e40af;
          font-size: 10px;
        }
        
        .tax-table td,
        .total-table td {
          border: 1px solid #e5e7eb;
          padding: 6px 8px;
          background: white;
        }
        
        .tax-table tbody tr:nth-child(even) {
          background-color: #f8fbff;
        }
        
        .total-table td {
          border: none;
          padding: 8px 0;
        }
        
        .total-table td.label {
          font-weight: 700;
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
        
        .amount-in-words {
          padding: 12px;
          background: linear-gradient(to right, #f0f9ff 0%, #e0f2fe 100%);
          border-bottom: 2px solid #1e40af;
          border: 2px solid #e0f2fe;
          border-radius: 4px;
          font-size: 10px;
          page-break-inside: avoid;
          margin-bottom: 12px;
          font-weight: 600;
          color: #111827;
        }
        
        .notes-section {
          padding: 12px;
          border: 2px solid #e0f2fe;
          border-radius: 4px;
          font-size: 9px;
          page-break-inside: avoid;
          margin-bottom: 12px;
          background: #f8fbff;
        }
        
        .notes-section h3 {
          margin: 0 0 8px 0;
          font-weight: 700;
          font-size: 10px;
          color: #1e40af;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .notes-content {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.5;
          color: #374151;
        }
        
        .footer-boxes {
          display: flex;
          gap: 12px;
          padding: 0 !important;
          page-break-inside: avoid;
          margin-top: auto;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        
        .footer-box {
          flex: 1;
          border: 2px solid #e0f2fe;
          padding: 12px;
          font-size: 9px;
          border-radius: 4px;
          background: #f8fbff;
        }
        
        .footer-box h4 {
          margin: 0 0 8px 0;
          font-weight: 700;
          font-size: 10px;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 5px;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .footer-box p {
          margin: 4px 0;
          line-height: 1.4;
          color: #374151;
        }
        
        .signature-box {
          text-align: center;
          padding-top: 30px;
          font-weight: 600;
          color: #111827;
        }
        
        .invoice-footer {
          background: linear-gradient(to right, #f0f9ff 0%, #e0f2fe 100%);
          padding: 10px 12px;
          text-align: center;
          border-top: 2px solid #1e40af;
          font-size: 9px;
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
    </>
  )
}
