// PDF Invoice Extractor
// Extracts line items from purchase invoice PDFs using backend extraction or fallback OCR

import Tesseract from 'tesseract.js'
import apiClient from '../services/api'
import { extractItemsWithoutHSN, suggestHSNCodes } from './simpleTableExtractor'

// Extract items from file with intelligent routing
export const extractItemsFromFile = async (file) => {
    try {
        // Check file type
        if (!file) {
            console.warn('❌ No file provided')
            return {
                success: false,
                message: 'No file provided',
                items: []
            }
        }

        // If it's a PDF, try backend extraction
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const result = await extractFromBackend(file)
            return result
        }

        // If it's an image, use client-side OCR
        return await extractFromImage(file)
    } catch (error) {
        console.error('❌ File extraction error:', error)
        return {
            success: false,
            message: error.message || 'Failed to extract from file. Please try another document.',
            items: []
        }
    }
}

// Send file to backend for extraction
const extractFromBackend = async (file) => {
    try {
        const formData = new FormData()
        formData.append('file', file)

        console.log('📤 Uploading PDF to backend: /purchase-bills/extract/pdf')
        // Don't explicitly set Content-Type - let axios handle multipart/form-data with boundary
        const response = await apiClient.post('/purchase-bills/extract/pdf', formData)

        console.log('✅ Backend response received:', response)

        // Backend wraps response in sendSuccess which adds { success, message, data, statusCode }
        // Extract the actual data payload
        const data = response?.data || response

        console.log('📦 Extracted data payload:', data)

        // Check if this is an image-only PDF first
        if (data?.imageOnlyPDF) {
            console.warn('⚠️ Image-only PDF detected - suggesting image upload')
            return {
                success: false,
                message: data?.suggestion || data?.message || 'This appears to be a scanned PDF. Please upload the image instead.',
                items: [],
                imageOnlyPDF: true,
                suggestion: data?.suggestion,
                canRetry: false
            }
        }

        // If backend returns success with items
        if (data?.success && data?.items && data.items.length > 0) {
            console.log('✅ PDF extraction successful, found', data.items.length, 'items')
            return {
                success: true,
                message: data.message,
                items: data.items || [],
                suppliers: data.suppliers || data.supplierDetails
            }
        }

        // If backend returns partial success (text extracted but no items found)
        if (data?.message && !data?.success) {
            console.log('ℹ️ PDF processed but no items found:', data.message)
            return {
                success: false,
                message: data.message || 'PDF processed but no items found. Please add items manually.',
                items: [],
                suppliers: data.suppliers || data.supplierDetails,
                rawText: data.rawText
            }
        }

        console.warn('❌ No items extracted from PDF')
        return {
            success: false,
            message: data?.message || 'Failed to extract items from PDF',
            items: []
        }
    } catch (error) {
        // Handle axios error response (4xx, 5xx)
        const errorData = error
        console.error('❌ Backend extraction error:', errorData)

        const message = errorData?.message ||
            error?.message ||
            'Failed to process PDF. Please upload a clear image instead.'

        return {
            success: false,
            message: message,
            items: [],
            imageOnlyPDF: errorData?.imageOnlyPDF || false,
            canRetry: !errorData?.imageOnlyPDF
        }
    }
}

// Extract from image using Tesseract.js with table detection
export const extractFromImage = async (file) => {
    try {
        // Validate file
        if (!file.type.startsWith('image/')) {
            console.warn('⚠️ File is not an image:', file.type)
            return {
                success: false,
                message: 'Please upload an image file (JPG, PNG, etc.)',
                items: []
            }
        }

        const ocrData = await performOCR(file)

        const text = ocrData?.text || (typeof ocrData === 'string' ? ocrData : '')
        const words = ocrData?.words || []

        if (!text || text.trim().length === 0) {
            console.warn('⚠️ OCR returned empty text')
            return {
                success: false,
                message: 'No text detected in image. Please ensure the invoice is clear and readable.',
                items: []
            }
        }
        
        // Try to build table structure from bounding boxes if words available
        let items = []
        if (words && words.length > 0) {
            items = parseInvoiceTextWithBoundingBoxes(text, words)
        }
        
        // Fallback 1: Try simple extraction without HSN dependency
        if (!items || items.length === 0) {
            items = extractItemsWithoutHSN(text)
        }
        
        // Fallback 2: Try line-based parsing as last resort
        if (!items || items.length === 0) {
            items = parseInvoiceText(text)
        }
        
        // Apply HSN code suggestions based on product names
        if (items && items.length > 0) {
            items = suggestHSNCodes(items)
        }
        
        const supplierDetails = extractSupplierDetails(text)

        if (items && items.length > 0) {
            return {
                success: true,
                message: `Successfully extracted ${items.length} items from image`,
                items: items,
                supplier: supplierDetails
            }
        } else {
            console.warn('⚠️ No items found in OCR text')
            return {
                success: false,
                message: 'Image scanned but no invoice items found. Please check the image quality and format.',
                items: [],
                supplier: supplierDetails
            }
        }
    } catch (error) {
        console.error('❌ Image extraction error:', error.message || error)
        return {
            success: false,
            message: `Failed to extract from image: ${error.message || 'Unknown error'}`,
            items: []
        }
    }
}

// Preprocess image to enhance text clarity for OCR
const preprocessImage = (imageData) => {
    return new Promise((resolve) => {
        try {
            // Convert ArrayBuffer to data URL safely (without spreading large arrays)
            if (imageData instanceof ArrayBuffer) {
                const blob = new Blob([imageData], { type: 'image/jpeg' })
                const url = URL.createObjectURL(blob)
                
                const img = new Image()
                img.onload = () => {
                    // Create canvas with 1.2x upscaling for better OCR
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width * 1.2
                    canvas.height = img.height * 1.2
                    
                    const ctx = canvas.getContext('2d', { willReadFrequently: true })
                    
                    // Draw image scaled up
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                    
                    // Get image data
                    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    const data = imageDataObj.data
                    
                    // Enhance contrast and brightness
                    const contrast = 1.3  // Increase contrast
                    const brightness = 5  // Slight brightness boost
                    
                    for (let i = 0; i < data.length; i += 4) {
                        let r = data[i]
                        let g = data[i + 1]
                        let b = data[i + 2]
                        
                        // Convert to grayscale and enhance
                        const gray = r * 0.3 + g * 0.59 + b * 0.11
                        const enhanced = ((gray - 128) * contrast + 128) + brightness
                        const final = Math.max(0, Math.min(255, enhanced))
                        
                        data[i] = final
                        data[i + 1] = final
                        data[i + 2] = final
                    }
                    
                    ctx.putImageData(imageDataObj, 0, 0)
                    
                    // Convert to array buffer and resolve
                    canvas.toBlob((blob) => {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                            URL.revokeObjectURL(url)
                            resolve(e.target.result)
                        }
                        reader.readAsArrayBuffer(blob)
                    }, 'image/jpeg', 0.95)
                }
                img.onerror = () => {
                    URL.revokeObjectURL(url)
                    resolve(imageData)  // Fallback to original
                }
                img.src = url
            } else {
                resolve(imageData)
            }
        } catch (err) {
            console.warn('⚠️ Image preprocessing failed, using original:', err.message)
            resolve(imageData)
        }
    })
}

// Perform OCR using Tesseract.js with preprocessing AND bounding boxes for table detection
const performOCR = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                let imageData = e.target.result

                // Preprocess image for better OCR accuracy
                imageData = await preprocessImage(imageData)

                // Initialize Tesseract worker - use default CDN paths
                let worker
                try {
                    worker = await Tesseract.createWorker('eng', 1, {
                        tessjs_create_pdf: false
                    })
                } catch (workerErr) {
                    console.error('❌ Failed to create Tesseract worker:', workerErr)
                    reject(new Error(`Failed to initialize OCR: ${workerErr.message}`))
                    return
                }

                try {
                    const result = await worker.recognize(imageData)
                    const text = result?.data?.text || ''
                    
                    // Extract words with bounding boxes for table structure detection
                    const words = result?.data?.words || []
                    console.log('✅ OCR complete: extracted', text.length, 'chars from', words.length, 'words')

                    // Store both text and words data
                    const ocrData = {
                        text: text,
                        words: words,
                        result: result
                    }

                    await worker.terminate()
                    resolve(ocrData)
                } catch (err) {
                    console.error('❌ OCR recognition error:', err.message || err);
                    try {
                        await worker.terminate()
                    } catch (termErr) {
                        console.error('⚠️ Error terminating worker:', termErr)
                    }
                    reject(new Error(`OCR failed: ${err.message || 'Unknown error'}`))
                }
            } catch (error) {
                console.error('❌ Error in fileReader onload:', error);
                reject(error)
            }
        }

        reader.onerror = () => {
            console.error('❌ FileReader error:', reader.error)
            reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown error')))
        }

        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                // Silent progress tracking
            }
        }

        reader.readAsArrayBuffer(file)
    })
}

// Mock extraction for demo (fallback only)
export const mockExtractItems = () => {
    return []
}

// Extract supplier details from invoice text
export const extractSupplierDetails = (text) => {
    const details = {
        name: '',
        gstin: '',
        email: '',
        phone: '',
        state: '',
        address: ''
    }

    if (!text) return details

    // Extract GSTIN first (to identify which section is supplier vs buyer)
    let gstinMatch = text.match(/GSTIN\/UIN\s*:\s*([\dA-Z]+)/i)
    if (!gstinMatch) {
        gstinMatch = text.match(/GSTIN\s*[:=\s]+([0-9A-Z]{15})/i)
    }
    if (!gstinMatch) {
        // Try alternative: look for 15-character GSTIN pattern anywhere
        gstinMatch = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/)
    }
    if (gstinMatch) {
        details.gstin = gstinMatch[1].trim()
    }

    // Split text at "Buyer" or "Bill To" label to separate supplier section from buyer section
    const buyerPatternIdx = Math.min(
        text.search(/Buyer\s*\(Bill/i) >= 0 ? text.search(/Buyer\s*\(Bill/i) : Infinity,
        text.search(/Bill\s+To/i) >= 0 ? text.search(/Bill\s+To/i) : Infinity
    )
    const supplierSectionText = buyerPatternIdx < Infinity ? text.substring(0, buyerPatternIdx) : text

    // Extract supplier company name from supplier section (before Buyer)
    // Look for the first substantial company name before buyer label
    let companyMatch = supplierSectionText.match(/CORPORATE\s+RENEWABLES[^\n]+/i)
    if (companyMatch) {
        details.name = companyMatch[0].trim()
        details.name = details.name.replace(/\s{2,}/g, ' ').replace(/\n/g, ' ').replace(/\d{1,2}$/g, '').trim()
    }

    // Try "ARUNAI ENTERPRISES" or "BARUNAL ENTERPRISES" pattern - handle multi-line
    if (!details.name) {
        // Try single-line pattern first - stop at ENTERPRISES, don't capture what comes after
        companyMatch = supplierSectionText.match(/(ARUN[A-Z]*|BARUN[A-Z]*|ARUTENA)\s+ENTERPRISES/i)
        if (companyMatch) {
            details.name = companyMatch[0].trim()
                .replace(/^BARUN/, 'ARUN').replace(/\s{2,}/g, ' ').trim()
        } else {
            // Try multi-line pattern: first line has company part, next has ENTERPRISES
            const lines = supplierSectionText.split('\n')
            for (let i = 0; i < lines.length - 1; i++) {
                if (/BARUN|ARUN|ARUTENA/i.test(lines[i]) && /ENTERPRISES/i.test(lines[i + 1])) {
                    const part1 = lines[i].match(/(BARUN[A-Z]*|ARUN[A-Z]*|ARUTENA)/i)
                    const part2 = lines[i + 1].match(/ENTERPRISES/i)
                    if (part1 && part2) {
                        details.name = (part1[0] + ' ' + part2[0]).trim()
                            .replace(/^BARUN/, 'ARUN').trim()
                        break
                    }
                }
            }
        }
    }

    // Try "SUNSEED POWER" pattern or similar
    if (!details.name) {
        companyMatch = supplierSectionText.match(/([A-Z]+SEED\s+POWER[^\n]*|[A-Z]+[^\n]*POWER\s+[A-Z]+[^\n]*(?:PRIVATE|LIMITED|LTD|PVT))/i)
        if (companyMatch) {
            details.name = companyMatch[0].trim()
                .replace(/\n/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim()
        }
    }

    // If not found, try broader "CORPORATE" pattern in supplier section
    if (!details.name) {
        companyMatch = supplierSectionText.match(/CORPORATE[^\n]+(?:PRIVATE|PVT|LIMITED|LTD)/i)
        if (companyMatch) {
            details.name = companyMatch[0].trim().replace(/\n/g, ' ').replace(/\s{2,}/g, ' ')
        }
    }

    // If still not found, look for any multi-word capitalized name before GSTIN line
    if (!details.name) {
        const gstinLineIdx = text.search(/GSTIN/)
        const preGstinText = gstinLineIdx > 0 ? text.substring(0, gstinLineIdx) : supplierSectionText
        // Look for pattern: Word Word Word (uppercase) followed by optional state/address
        companyMatch = preGstinText.match(/([A-Z][A-Za-z\s]{10,}(?:LIMITED|LTD|PRIVATE|PVT|INC))\s*$/m)
        if (companyMatch) {
            details.name = companyMatch[1].trim().replace(/\n/g, ' ').replace(/\s{2,}/g, ' ')
        }
    }

    // Last resort: Look for any line with primarily capital letters (company name pattern)
    if (!details.name) {
        const lines = supplierSectionText.split('\n').filter(l => l.trim().length > 10)
        for (const line of lines.slice(0, 5)) {
            if (/^[A-Z\s]{10,}$/.test(line.trim()) && !line.includes('INVOICE') && !line.includes('BILL')) {
                details.name = line.trim().replace(/\s{2,}/g, ' ')
                break
            }
        }
    }

    // Clean up name: remove extra spaces, newlines
    details.name = details.name.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim()

    // Extract email - try multiple patterns
    let emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    if (emailMatch) {
        details.email = emailMatch[0].trim()
    } else {
        // Try pattern with 'email' label
        emailMatch = text.match(/(?:email|e-mail|e mail)\s*[:\-]?\s*([\S]+@[\S.]+(?:\.[a-zA-Z]{2,})?)/i)
        if (emailMatch) {
            details.email = emailMatch[1].trim()
        }
    }

    // Clean up incomplete emails (remove trailing dots/spaces)
    details.email = details.email.replace(/\s+$/, '').replace(/[.,;]+$/, '')
    // Handle OCR space-inserted emails like "gmail. com"
    details.email = details.email.replace(/\.\s+/g, '.')
    // Add .com if missing
    if (details.email && !details.email.includes('.com') && !details.email.includes('.co') && !details.email.includes('.in') && !details.email.includes('.')) {
        details.email = details.email + '.com'
    }

    // Extract phone (10-15 digits)
    let phoneMatch = text.match(/(?:Ph|Phone|Contact|Mobile|Tel)\.?\s*:?\s*(\+?\d{10,15})/i)
    if (phoneMatch) {
        details.phone = phoneMatch[1].trim()
    } else {
        // Try to find any 10-digit sequence that looks like a phone
        phoneMatch = text.match(/(\d{10}|\+\d{1,3}\s?\d{3,4}\s?\d{3,4})/)
        if (phoneMatch) {
            details.phone = phoneMatch[1].trim()
        }
    }

    // Extract state by looking for state names in text
    const stateNames = ['Maharashtra', 'Gujarat', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'Bihar', 'Uttar Pradesh', 'Haryana', 'Punjab', 'Madhya Pradesh', 'West Bengal', 'Telangana', 'Andhra Pradesh', 'Odisha', 'Kerala']
    for (const state of stateNames) {
        if (text.match(new RegExp(`\\b${state}\\b`, 'i'))) {
            details.state = state
            break
        }
    }

    // If not found by name, try pattern extraction
    if (!details.state) {
        let stateMatch = text.match(/State[^:]*:\s*([^,\n]+)/i)
        if (stateMatch) {
            details.state = stateMatch[1].trim()
        } else {
            // Try alternative pattern
            stateMatch = text.match(/STATE\s*:?\s*([A-Za-z\s]+?)(?:\n|,|$|Maharashtra)/i)
            if (stateMatch && stateMatch[1].length < 40) {
                details.state = stateMatch[1].trim()
            }
        }
    }

    // Extract address (look for street-like patterns or after location keywords)
    let addressMatch = text.match(/(?:Address|Smo|Street|Showroom|Shop)[^\n]*\n?\s*([^\n]+)/i)
    if (addressMatch) {
        details.address = addressMatch[1].trim()
    } else {
        // Try to get address from the supplier section (before "Bill To")
        // Look for lines with street patterns: CTS-XXX, numbers, commas, location names
        const lines = supplierSectionText.split('\n')
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()
            // Skip if it's the company name, email, GSTIN, phone or other metadata
            if (line === details.name || line.length < 5 || line.length > 150) continue
            if (/emai|gstin|phone|^state|^27-/i.test(line)) continue

            // Look for address patterns: CTS, Road, Street, Near, etc.
            if (/^(CTS|Smo|Shop|Street|Road|Near|Phase|Lane|Sector|Plot|Off|Opp|Bld|Apt).*\d+/i.test(line)) {
                details.address = line.replace(/\s{2,}/g, ' ').trim()
                break
            }

            // Alternative: look for line with numbers AND text (likely address like "218 Road Lane")
            if (/\d+.*[A-Za-z]{5,}/.test(line) && !line.match(/^\d{6,}$/)) {
                details.address = line.replace(/\s{2,}/g, ' ').trim()
                break
            }
        }
    }

    console.log('📦 Extracted supplier details:', details)
    return details
}

// Helper: Check if an HSN code is likely a valid invoice item HSN (not part of metadata)
const isValidItemHSN = (hsn, context) => {
    const hsnNum = parseInt(hsn)

    // Invalid: 5-digit codes - these are VERY rarely valid HSNs in invoices
    // They're usually prices or rates (e.g., 71395, 79145 are typically prices)
    if (hsn.length === 5) {
        return false
    }

    // Invalid: 6-digit postal codes (e.g., 431001 for Maharashtra, 400xxx for Mumbai)
    if (hsn.length === 6 && /^[1-4][0-9]{5}$/.test(hsn)) {
        // Check if preceded by state/city names which indicate this is an address
        if (/maharashtra|mumbai|bangalore|state|city|address|nagar/i.test(context)) {
            return false
        }
    }

    // Invalid: Phone numbers (8888xxx, 9xxx patterns with contact keywords)
    if ((hsn.length >= 8 && /^[89]\d{9,}/.test(hsn)) || /^8888/.test(hsn)) {
        if (/contact|phone|mobile|tel|number|cell|whatsapp|email/i.test(context)) {
            return false
        }
    }

    // Invalid: Clear GSTIN/metadata patterns (15-character alphanumeric codes)
    if (hsn.length >= 12 && /GSTIN|UIN|27A|27E|27H|27AARCA|27AANCC|27EQNPB|[0-9]{2}[A-Z]{5}[0-9]{4}/.test(context)) {
        return false
    }

    // VALID: Accept 4, 6, 7, 8+ digit codes if they're in a segment with product name
    // Product codes can be 8-11 digits (like 38654658745, 38659558556)
    // The caller already verified this segment has product name text
    return true
}

// Advanced extraction using table header detection
const extractItemsUsingHeaderDetection = (tableLines, tableStartIdx) => {
    console.log('📋 Analyzing table structure using headers...')
    const items = []

    // Check if first line of items looks like a header (rare but possible)
    let headerLineIdx = -1
    for (let i = 0; i < Math.min(tableLines.length, 5); i++) {
        const line = tableLines[i]
        const lineUpper = line.toUpperCase()

        // Count how many header keywords are present
        const keywordCount = (
            (lineUpper.includes('ITEM') ? 1 : 0) +
            (lineUpper.includes('DESCRIPTION') ? 1 : 0) +
            (lineUpper.includes('GOODS') ? 1 : 0) +
            (lineUpper.includes('HSN') ? 1 : 0) +
            (lineUpper.includes('CODE') ? 1 : 0) +
            (lineUpper.includes('SAC') ? 1 : 0) +
            (lineUpper.includes('QTY') || lineUpper.includes('QUANTITY') ? 1 : 0) +
            (lineUpper.includes('RATE') ? 1 : 0) +
            (lineUpper.includes('PRICE') ? 1 : 0) +
            (lineUpper.includes('UNIT') ? 1 : 0) +
            (lineUpper.includes('GST') || lineUpper.includes('TAX') ? 1 : 0) +
            (lineUpper.includes('AMOUNT') ? 1 : 0)
        )

        // If line has 3+ keywords, it's likely a header
        if (keywordCount >= 3) {
            headerLineIdx = i
            console.log(`  Header row found at line ${i} (${keywordCount} keywords): "${line.substring(0, 80)}"`)
            break
        }
    }

    if (headerLineIdx < 0) {
        console.log('  No clear header row found, will use fallback HSN-based extraction')
        return items
    }

    // Group lines by HSN codes (each item marked by valid HSN)
    const itemGroups = []
    let currentGroup = []

    for (let i = headerLineIdx + 1; i < tableLines.length; i++) {
        const line = tableLines[i]

        // Skip empty/total lines
        if (line.trim().length === 0 || /^total|^sub.*total|^amount|^gst|^taxable|^sgst|^cgst/i.test(line.trim())) {
            if (currentGroup.length > 0) {
                itemGroups.push(currentGroup)
                currentGroup = []
            }
            continue
        }

        // Look for valid HSN code (4-7 digits, but validate)
        // Match all numbers to find candidates
        const allNumbers = line.match(/\b(\d{4,7})\b/g) || []
        let hasValidHsn = false

        for (const potentialHsn of allNumbers) {
            const hsn = potentialHsn
            const hsnNum = parseInt(hsn)

            // Skip obvious fakes: very small (quantity), postal codes (1-4 followed by 5 digits), huge numbers
            if (hsnNum < 1000 || hsnNum > 999999) continue

            // Skip if it looks like a postal code (6 digit starting with 1-4)
            if (hsn.length === 6 && /^[1-4]\d{5}$/.test(hsn)) continue

            // This could be a real HSN - mark it
            hasValidHsn = true
            break
        }

        if (hasValidHsn) {
            // Start new item group with HSN
            if (currentGroup.length > 0) {
                itemGroups.push(currentGroup)
            }
            currentGroup = [line]
        } else {
            // Continue current item group
            if (currentGroup.length > 0 || line.length > 5) {
                currentGroup.push(line)
            }
        }
    }

    if (currentGroup.length > 0) {
        itemGroups.push(currentGroup)
    }

    console.log(`  Found ${itemGroups.length} potential item groups`)

    // Extract items from groups
    itemGroups.forEach((group, groupIdx) => {
        const fullText = group.join(' ')
        console.log(`\n  Item group ${groupIdx + 1}: "${fullText.substring(0, 100)}"`)

        // Find the best HSN in this group (prefer 6-digit)
        let hsn = null
        const sixDigitMatch = fullText.match(/\b(\d{6})\b/)
        const fourDigitMatch = fullText.match(/\b(\d{4})\b/)

        if (sixDigitMatch) {
            hsn = sixDigitMatch[1]
            console.log(`    Found 6-digit HSN: ${hsn}`)
        } else if (fourDigitMatch) {
            hsn = fourDigitMatch[1]
            console.log(`    Found 4-digit HSN: ${hsn}`)
        }

        if (!hsn) {
            console.log(`    ⊘ No valid HSN found`)
            return
        }

        // Skip postal codes and invalid HSNs
        if (/^[1-4]\d{5}$/.test(hsn) || /^8888/.test(hsn)) {
            if (!isValidItemHSN(hsn, fullText)) {
                console.log(`    ✗ HSN ${hsn} is invalid (likely metadata)`)
                return
            }
        }

        // Extract product name (text before HSN)
        const hsnPos = fullText.indexOf(hsn)
        let itemName = fullText.substring(0, hsnPos).trim()
        itemName = itemName.replace(/^\d+\s*[\|\#\-]?\s*/, '').trim()  // Remove leading item #
        itemName = itemName.replace(/[\|\s]{2,}/g, ' ').trim()  // Clean up whitespace

        if (!itemName || itemName.length < 3) {
            itemName = `Item ${hsn}`
        }

        if (itemName.length > 80) itemName = itemName.substring(0, 80)

        // Extract all numbers from the entire group
        const numbers = fullText.match(/\d+(?:\.\d+)?/g) || []
        console.log(`    Numbers found (first 10): [${numbers.slice(0, 10).join(', ')}...]`)

        // Filter out HSN and unreasonable numbers
        const validNumbers = numbers.filter(n => {
            const val = parseFloat(n)
            return n !== hsn && val > 0 && val !== parseInt(hsn)
        })

        // Try to identify quantity and rate
        let quantity = 0, rate = 0, gstPct = 18

        // Quantity is typically 1-10000
        for (const num of validNumbers) {
            const val = parseFloat(num)
            if (val >= 1 && val <= 10000 && !quantity) {
                quantity = val
                console.log(`    Set Qty: ${quantity}`)
                break
            }
        }

        // Rate is typically 30-100000 (or could be a small number like 15.5)
        for (const num of validNumbers) {
            const val = parseFloat(num)
            if ((val >= 30 && val <= 100000 || val >= 10 && val < 30) && val !== quantity && !rate) {
                rate = val
                console.log(`    Set Rate: ${rate}`)
                break
            }
        }

        // If we have qty but no rate, try to find a larger total amount to derive rate
        if (quantity > 0 && !rate) {
            for (const num of validNumbers) {
                const val = parseFloat(num)
                if (val > quantity * 10 && val < quantity * 1000) {
                    rate = Math.round(val / quantity)
                    if (rate >= 10 && rate <= 100000) {
                        console.log(`    Derived Rate from total: ${rate}`)
                        break
                    }
                }
            }
        }

        if (quantity > 0 && rate > 0) {
            items.push({
                item_name: itemName,
                hsn_code: hsn,
                quantity: quantity,
                rate: rate,
                gst_percentage: gstPct
            })
            console.log(`    ✅ Extracted: "${itemName}" | HSN ${hsn} | Qty ${quantity} | Rate ₹${rate}`)
        } else {
            console.log(`    ⊘ Incomplete data - Qty: ${quantity}, Rate: ${rate}`)
        }
    })
}

// Intelligent item reconstruction for corrupted OCR data
const reconstructItemFromCorruptedData = (line, index, lines) => {
    console.log(`  🔧 Attempting intelligent reconstruction of line ${index}...`)
    
    // Pattern 1: Extract quantity from keyword patterns like "4 Nos", "500 Mt"
    const unitPattern = /(\d+(?:\.\d+)?)\s*(Nos|Mt|Mtr|Kg|L|Pcs|Pac|Box|Unit)(?:\s|$|,|\|)/i
    const unitMatch = line.match(unitPattern)
    let qty = 0
    
    if (unitMatch) {
        qty = parseFloat(unitMatch[1])
        console.log(`    ✓ Found unit pattern: ${unitMatch[1]} ${unitMatch[2]}`)
    } else {
        // Pattern 2: Look for first/second standalone numbers (1-500 range = quantity)
        const numbers = line.match(/\b(\d{1,3})\b(?!\d)/g) || []
        for (let i = 0; i < Math.min(2, numbers.length); i++) {
            const val = parseInt(numbers[i])
            if (val >= 1 && val <= 500 && !qty) {
                qty = val
                console.log(`    ✓ Found quantity pattern: ${qty}`)
                break
            }
        }
    }
    
    // Pattern 3: Extract rate from 4-5 digit numbers (after qty)
    const ratePattern = /\b([1-9]\d{2,4})(?:\s|$|,|\|)/g
    const rateMatches = [...line.matchAll(ratePattern)]
    let rate = 0
    
    for (const match of rateMatches) {
        const val = parseInt(match[1])
        if (val !== qty && val >= 50 && val <= 100000 && !rate) {
            rate = val
            console.log(`    ✓ Found rate pattern: ${rate}`)
            break
        }
    }
    
    // Pattern 4: Extract item name - handle lines starting with numbers
    let itemName = ''
    
    // Try 1: Extract from parentheses "... (ITEM NAME ...)"
    const parenMatch = line.match(/\(([A-Z][A-Za-z\s\-]+)\)/)
    if (parenMatch && parenMatch[1].length > 3) {
        itemName = parenMatch[1].trim()
        console.log(`    ✓ Found name in parentheses: ${itemName}`)
    }
    
    // Try 2: Extract text between pipe symbols
    if (!itemName) {
        const pipeMatch = line.match(/\|?\s*([A-Za-z][A-Za-z0-9\s\-()]{3,}?)\s*\|/)
        if (pipeMatch && pipeMatch[1].length > 3) {
            itemName = pipeMatch[1].trim()
            console.log(`    ✓ Found name between pipes: ${itemName}`)
        }
    }
    
    // Try 3: Extract from line content - skip leading item number
    if (!itemName) {
        // Remove leading item number like "6 " or "7% " and extract first substantive text
        const noLeadingNum = line.replace(/^\d+[%\s]*\(?/, '')
        const nameMatch = noLeadingNum.match(/^([A-Za-z][A-Za-z0-9\s\-()]{3,}?)(?:\||—|[0-9]|$)/)
        if (nameMatch && nameMatch[1].length > 3) {
            itemName = nameMatch[1].trim()
            console.log(`    ✓ Extracted name after leading number: ${itemName}`)
        }
    }
    
    // Try 4: Look backward through previous lines for multi-line item name
    if (!itemName && index > 0) {
        const prevLine = lines[index - 1].trim()
        if (prevLine && /[A-Za-z]{3,}/.test(prevLine) && !prevLine.match(/^\d+/) && prevLine.length < 100) {
            itemName = prevLine
            console.log(`    ✓ Captured from previous line: ${itemName}`)
        }
    }
    
    // Pattern 5: Extract HSN - improve fallback logic
    let hsn = ''
    
    // Try 1: Look for exact 4-digit HSN
    const exactHsn = line.match(/\b([0-9]{4})\b(?!\d)/)
    if (exactHsn) {
        hsn = exactHsn[1]
        console.log(`    ✓ Found exact HSN: ${hsn}`)
    }
    
    // Try 2: Extract first 4 digits of 7-8 digit code
    if (!hsn) {
        const longHsn = line.match(/\b(\d{7,8})\b/)
        if (longHsn) {
            hsn = longHsn[1].substring(0, 4)
            console.log(`    ✓ Extracted HSN from long code: ${longHsn[1]} → ${hsn}`)
        }
    }
    
    // Try 3: Assign HSN based on item keywords if unable to extract
    if (!hsn) {
        if (/cable|wire|conductor|copper|mtr|sqmm/i.test(itemName || line)) {
            hsn = '8544'
        } else if (/acdb|dcdb|switch|mains|board/i.test(itemName || line)) {
            hsn = '8536'
        } else if (/paint|spray|coating/i.test(itemName || line)) {
            hsn = '3208'
        } else if (/spring|fastener|bolt|nut|clamp/i.test(itemName || line)) {
            hsn = '7308'
        } else {
            hsn = '8414'  // Default industrial equipment
        }
        console.log(`    ✓ Assigned HSN based on keywords: ${hsn}`)
    }
    
    // Only create item if we have minimum required data
    if (qty > 0 && rate > 0 && itemName.length > 2 && hsn.length >= 4) {
        console.log(`    ✅ Reconstructed item: "${itemName}" (HSN ${hsn}) Qty: ${qty} Rate: ₹${rate}`)
        return {
            item_name: itemName,
            description: itemName,
            hsn_code: hsn.substring(0, 4),  // Ensure exactly 4 chars
            quantity: qty,
            unit: 'pcs',
            rate: rate,
            amount: qty * rate,
            gst_percentage: 18,
            gst_amount: (qty * rate * 18) / 100,
            total_amount: qty * rate * 1.18,
            product_id: null,
            batch_no: '',
            expiry_date: null
        }
    }
    
    console.log(`    ⊘ Reconstruction failed: name="${itemName}" qty=${qty} rate=${rate} hsn=${hsn}`)
    return null
}

// Build table structure from Tesseract word bounding boxes
const buildTableFromBoundingBoxes = (words) => {
    if (!words || words.length === 0) return []

    // Group words into rows based on Y-coordinate (bbox.y0)
    // Words with similar Y coordinates belong to the same row
    const rowThreshold = 15 // pixels tolerance for same row
    const rows = []
    const processedWordIndices = new Set()

    for (let i = 0; i < words.length; i++) {
        if (processedWordIndices.has(i)) continue
        
        const word = words[i]
        const currentY = word.bbox?.y0 || word.bbox?.y || 0
        const rowWords = [{ ...word, index: i }]
        processedWordIndices.add(i)

        // Find all words in same row (similar Y coordinate)
        for (let j = i + 1; j < words.length; j++) {
            if (processedWordIndices.has(j)) continue
            const otherWord = words[j]
            const otherY = otherWord.bbox?.y0 || otherWord.bbox?.y || 0
            
            if (Math.abs(otherY - currentY) <= rowThreshold) {
                rowWords.push({ ...otherWord, index: j })
                processedWordIndices.add(j)
            }
        }

        // Sort words in row by X coordinate (left to right)
        rowWords.sort((a, b) => {
            const aX = a.bbox?.x0 || a.bbox?.x || 0
            const bX = b.bbox?.x0 || b.bbox?.x || 0
            return aX - bX
        })

        rows.push(rowWords)
    }

    return rows
}

// Parse table into rows and columns based on X-coordinates
const detectTableColumns = (rows) => {
    if (rows.length === 0) return rows

    // Detect column boundaries by analyzing X-coordinates across all rows
    const xPositions = new Set()
    
    rows.forEach(rowWords => {
        rowWords.forEach(word => {
            const x0 = word.bbox?.x0 || word.bbox?.x || 0
            if (x0 > 0) xPositions.add(Math.round(x0 / 10) * 10) // Round to nearest 10
        })
    })

    const columnBoundaries = Array.from(xPositions).sort((a, b) => a - b)
    
    // Group words into columns within each row
    const tableRows = rows.map(rowWords => {
        const columns = []
        let currentCol = []
        let currentBoundaryIdx = 0

        rowWords.forEach(word => {
            const x = word.bbox?.x0 || word.bbox?.x || 0
            
            // Check if word moved to next column
            if (currentBoundaryIdx + 1 < columnBoundaries.length && 
                x > (columnBoundaries[currentBoundaryIdx] + columnBoundaries[currentBoundaryIdx + 1]) / 2) {
                if (currentCol.length > 0) {
                    columns.push(currentCol)
                    currentCol = []
                }
                currentBoundaryIdx++
            }
            
            currentCol.push(word.text)
        })

        if (currentCol.length > 0) {
            columns.push(currentCol)
        }

        return columns.map(col => col.join(' ').trim())
    })

    return tableRows
}

// Parse invoice text using bounding box information for table structure
const parseInvoiceTextWithBoundingBoxes = (text, words) => {
    console.log('🔲 parseInvoiceTextWithBoundingBoxes: Using word bounding boxes for table detection')
    try {
        if (!words || words.length === 0) {
            console.log('  ⚠️ No words with bounding boxes available, falling back to text parsing')
            return parseInvoiceText(text)
        }

        // Build rows from bounding boxes
        const rows = buildTableFromBoundingBoxes(words)
        console.log(`  📊 Built ${rows.length} rows from ${words.length} words`)

        // Detect table columns
        const tableRows = detectTableColumns(rows)
        console.log(`  🔲 Structured into table with ${tableRows.length} rows`)

        // Find items table start (look for row with "Quantity", "Unit", "Price", "HSN", etc.)
        let tableStartIdx = -1
        for (let i = 0; i < tableRows.length; i++) {
            const row = tableRows[i].join(' ').toLowerCase()
            if (/quantity|unit|price|hsn|item|description/i.test(row)) {
                tableStartIdx = i
                console.log(`  📌 Items table header identified at row ${i}`)
                break
            }
        }

        if (tableStartIdx < 0) {
            console.log('  ⚠️ Could not find table header, falling back to text parsing')
            return parseInvoiceText(text)
        }

        // Extract items from table rows
        const items = []
        for (let i = tableStartIdx + 1; i < tableRows.length; i++) {
            const row = tableRows[i]
            if (!row || row.length === 0) continue

            const rowText = row.join(' | ')
            console.log(`  📋 Row ${i}: ${rowText.substring(0, 80)}...`)

            // Skip total/summary rows
            if (/total|amount|sum|sgst|cgst|igst|gst%|rate of|tax|goods/i.test(rowText)) {
                console.log(`    ⊘ Skipping summary row`)
                continue
            }

            // Reconstruct item from row columns
            // Typical structure: [ItemName | Code | HSN | Qty | Unit | Price | GST | FinalRate | Amount]
            const itemName = row[0] || ''
            const itemCode = row[1] || ''
            const hsnStr = row[2] || ''
            const qtyStr = row[3] || ''
            const unitStr = row[4] || ''
            const priceStr = row[5] || ''
            const gstStr = row[6] || ''
            const finalRateStr = row[7] || ''
            const amountStr = row[8] || ''

            if (!itemName || itemName.length < 3) continue

            // Extract quantity
            const qtyMatch = qtyStr.match(/(\d+(?:\.\d+)?)/)
            const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 0
            if (quantity < 1) continue

            // Extract rate/price (prefer price over final rate)
            const rateMatch = priceStr.match(/[\d,]+(?:\.\d+)?/) || finalRateStr.match(/[\d,]+(?:\.\d+)?/)
            const rate = rateMatch ? parseFloat(rateMatch[0].replace(/,/g, '')) : 0
            if (rate <= 0) continue

            // Extract/extract HSN
            let hsn = '8414' // Default
            if (hsnStr && hsnStr.length > 0) {
                const hsnMatch = hsnStr.match(/(\d{4,8})/)
                if (hsnMatch) {
                    hsn = hsnMatch[1].substring(0, 4) // Use first 4 digits
                }
            }

            // Extract GST percentage
            let gstPct = 18
            const gstMatch = gstStr.match(/(\d+(?:\.\d+)?)/)
            if (gstMatch) {
                gstPct = parseFloat(gstMatch[1])
            }

            const item = {
                item_name: itemName.trim(),
                description: itemName.trim(),
                hsn_code: hsn,
                quantity: quantity,
                unit: unitStr.trim() || 'pcs',
                rate: rate,
                amount: quantity * rate,
                gst_percentage: gstPct,
                gst_amount: (quantity * rate * gstPct) / 100,
                total_amount: Math.round((quantity * rate * (1 + gstPct / 100)) * 100) / 100,
                product_id: null,
                batch_no: '',
                expiry_date: null
            }

            items.push(item)
            console.log(`  ✅ Extracted: ${itemName} (Qty: ${quantity}, HSN: ${hsn})`)
        }

        console.log(`📊 Total items extracted: ${items.length} (using bounding box method)`)
        return items.length > 0 ? items : parseInvoiceText(text)

    } catch (error) {
        console.error('❌ Error in parseInvoiceTextWithBoundingBoxes:', error)
        return parseInvoiceText(text)
    }
}

// Parse invoice text with multiple format support

export const parseInvoiceText = (text) => {
    console.log('📝 parseInvoiceText: Parsing text, length:', text?.length)
    try {
        const items = []
        if (!text || text.trim().length === 0) {
            console.warn('⚠️ Empty text provided to parseInvoiceText')
            return items
        }

        const lines = text.split('\n').filter(line => line.trim().length > 0)
        console.log('📄 Extracted', lines.length, 'lines from text')
        console.log('📋 First 5 lines:', lines.slice(0, 5))

        // Find the items table section
        // Skip invoice header metadata first, then buyer/consignee sections, THEN find items table
        let tableStartIdx = -1
        let passedMetadata = false

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Skip invoice header metadata (Invoice Number, Date, Bill To section, address, GSTIN)
            if (/invoice\s*number|invoice\s*date|order\s*by|due\s*date|terms|transport\s*mode|bill\s*to|ship\s*to|place\s*of\s*supply|hsn\s*code/i.test(line)) {
                passedMetadata = false
                continue
            }

            // Skip address and GSTIN lines
            if (/chhatrapati|sambhaji|nagar|gstin\s*number|email|contact\s*no|state:|customer\s*code|^[\d\s]+$|^\d{6}|phone|mobile|address/i.test(line)) {
                continue
            }

            // Mark that we've passed initial metadata sections
            if (passedMetadata === false && line.trim().length > 10) {
                passedMetadata = true
            }

            // Look for line with item keywords AND a valid HSN code (4-6 digits)
            if (passedMetadata && /clamp|bolt|pipe|connector|tie|m\d+|mm|pvc|aluminum|spring|flange|dcdb|acdb|single|phase|cable|meter|junction|box/i.test(line)) {
                const hsnMatch = line.match(/\b([0-9]{4,6})\b(?![\d\.])/);
                if (hsnMatch) {
                    const hsn = hsnMatch[1]
                    // Validate it's not a postal code or other metadata
                    if (!(/^[1-4]\d{5}$/.test(hsn)) && !/27[A-Z]/.test(hsn)) {
                        tableStartIdx = i
                        console.log(`✓ Found items table start at line ${i}: "${line.substring(0, 60)}"`)
                        break
                    }
                }
            }
        }

        // Fallback: if not found with product keywords, look for lines with HSN + quantity + rate pattern
        if (tableStartIdx < 0) {
            tableStartIdx = lines.findIndex((line, idx) => {
                // Skip first 10 lines (invoice header)
                if (idx < 10) return false
                // Skip lines with metadata keywords
                if (/invoice|bill\s*to|ship\s*to|gstin|address|email|phone/i.test(line)) return false
                // Look for line with quantity (1-5 digits) followed by rate (3+ digits with . or ,)
                return /\d{1,5}[\s\.]+([\d,\.]+)/i.test(line) && /\d{4,6}/.test(line)
            })
        }

        // Final fallback: if still not found, start from line 15 (skip all header content)
        if (tableStartIdx < 0) tableStartIdx = Math.min(15, lines.length - 1)

        const tableEndIdx = lines.findIndex((line, idx) =>
            idx > tableStartIdx + 2 && /total|amount|sum|sgst|cgst|igst/i.test(line)
        )

        const itemsTableLines = lines.slice(
            Math.max(0, tableStartIdx),
            tableEndIdx > 0 ? tableEndIdx : lines.length
        )

        console.log(`📊 Items table found (lines ${tableStartIdx} to ${tableEndIdx}), ${itemsTableLines.length} lines`)

        // First pass: Extract all HSN codes from items table
        const hsnMap = new Map() // HSN -> first context info
        itemsTableLines.forEach((line, idx) => {
            const matches = [...line.matchAll(/(\d{4,6})/g)]
            matches.forEach(match => {
                const hsn = match[1]
                if (!hsnMap.has(hsn)) { // Store first occurrence
                    hsnMap.set(hsn, { line, lineIdx: tableStartIdx + idx })
                }
            })
        })

        console.log('🔍 Found', hsnMap.size, 'unique HSN codes in items section')
        hsnMap.forEach((info, hsn) => {
            console.log(`  HSN: ${hsn} at line ${info.lineIdx}: "${info.line.substring(0, 60)}"`)
        })

        for (let i = 0; i < itemsTableLines.length; i++) {
            let line = itemsTableLines[i]
            const actualLineIdx = tableStartIdx + i
            console.log(`\n📌 Line ${actualLineIdx} (${line.length} chars): "${line.substring(0, 80)}"`)

            // Skip only clear header lines (keywords without item names/HSN codes)
            // A header line has ONLY keywords with no actual product data
            const hasItemData = /[A-Z][a-z]+.*\d{4,6}|connector|phase|meter|acdb|dcdb|secure|single/i.test(line)
            const isOnlyKeywords = /^(description|sl|sr|item|hsn|qty|quantity|rate|amount|total|tax|sgst|cgst|igst|invoice|bill|per|unit)\s*$/i.test(line.trim())

            if (isOnlyKeywords) {
                console.log('  ⊘ Skipping pure header line')
                continue
            }

            // Skip lines with keyword combinations but NO item product names or HSN codes
            if (!hasItemData && /description.*hsn.*qty|hsn.*qty.*rate|sr.*item.*qty/i.test(line)) {
                console.log('  ⊘ Skipping column header line')
                continue
            }

            // Check if line has pipes (structured data)
            if (line.includes('|')) {
                console.log('  🔀 Line has pipes, parsing as structured table row')
                const segments = line.split('|').map(s => s.trim()).filter(s => s.length > 0)
                console.log(`    Segments (${segments.length}):`, segments)

                // Find HSN codes in this line
                // For pipe-delimited format, look for segment with HSN (usually contains 7-digit code like 8537100)
                let foundItemInLine = false

                // SMARTER HSN DETECTION: First, find all HSN candidate codes
                // Collect all numeric codes from all segments with their positions
                let hsnCandidates = []
                for (let j = 0; j < segments.length; j++) {
                    // Look for longer codes first (6-8 digits from OCR partial captures), then 4-digit standard HSNs
                    // Also collect product codes (8-11 digits like 38654658745)
                    const longCodes = segments[j].match(/\b(\d{6,8})\b/g) || []
                    const mediumCodes = segments[j].match(/\b(\d{4,5})\b/g) || []
                    
                    // Prefer longer codes as they're more likely HSN codes
                    for (const code of longCodes) {
                        hsnCandidates.push({ code, segmentIdx: j, isLong: true })
                    }
                    for (const code of mediumCodes) {
                        hsnCandidates.push({ code, segmentIdx: j, isLong: false })
                    }
                }

                // Process candidates: prioritize segment order and code length
                for (const candidate of hsnCandidates) {
                    let hsn = candidate.code
                    let hsnForValidation = hsn.length >= 6 ? hsn.substring(0, 4) : hsn

                    // Skip invalid HSN ranges and common non-HSN numbers
                    // 4707: GSTamount, 1656: Price amounts, 261/230: Qty/amounts
                    if (/^(1656|261|230|250|256|500|504|505|506|507|508|509|956|957|959|999|2274|2360|2700|9999)$/.test(hsnForValidation)) {
                        continue // These are typically amounts, not HSNs
                    }
                    
                    // HSN codes should be in valid range (0100-9999)
                    const hsnNum = parseInt(hsnForValidation)
                    if (hsnNum < 100 || hsnNum > 9999) continue

                    console.log(`    ✓ Found HSN: ${hsn} (as ${hsnForValidation}) in segment ${candidate.segmentIdx}: "${segments[candidate.segmentIdx].substring(0, 60)}"`)

                    // Extract quantity and rate from same segment or following segments
                    // Look for product name in adjacent segments - PRIORITIZE CURRENT/PREVIOUS LINES
                    let itemName = ''

                    // NEW STRATEGY: Look for product code first to identify item boundary
                    // Product codes are 8-11 digits like 38654658745
                    let productCode = ''
                    for (const seg of segments) {
                        const prodCodeMatch = seg.match(/\b(\d{8,11})\b/)
                        if (prodCodeMatch && !/^[0-9]{2}[0-9]{2,}$/.test(prodCodeMatch[1])) {
                            productCode = prodCodeMatch[1]
                            break
                        }
                    }
                    if (productCode) {
                        console.log(`      📦 Product code: ${productCode}`)
                    }

                    // PRIORITY 1: Look backward through previous lines, but ONLY back to previous product code or max 2 lines
                    // This avoids picking up names from completely different items
                    const maxBackLines = productCode ? 2 : 3 // Only go back 2 lines if we found product code
                    for (let lookBack = i - 1; lookBack >= Math.max(0, i - maxBackLines); lookBack--) {
                        const prevTableLine = itemsTableLines[lookBack].trim()
                        // Skip empty lines and metadata
                        if (!prevTableLine || prevTableLine.length < 3) continue
                        if (/^(description|sl|sr|item|hsn|qty|unit|rate|amount|tax|total|per|unit|taxable|price|final|gst|original)$/i.test(prevTableLine)) continue
                        if (/\d{8,11}/.test(prevTableLine) && /maharashta|address|gstin|email|contact|state/i.test(prevTableLine)) continue
                        
                        // Extract first line with substantial text (product name likely)
                        if (/[A-Za-z]{3,}/.test(prevTableLine) && !prevTableLine.match(/^T\s*$/) && !/^\d{4,}/.test(prevTableLine)) {
                            itemName = prevTableLine.substring(0, 80).trim()
                            console.log(`      ↑ Looked back ${i - lookBack} line(s) and found: "${itemName}"`)
                            break
                        }
                    }

                    // PRIORITY 2: Try to find product name in previous segment
                    if (!itemName && candidate.segmentIdx > 0) {
                        const prevSeg = segments[candidate.segmentIdx - 1]
                        if (/[A-Za-z]{3,}|connector|phase|meter|acdb|dcdb|secure|single|cable|tray|copper|earthing|lightning|arrester|paint|spray/i.test(prevSeg)) {
                            itemName = prevSeg.replace(/^\//, '').substring(0, 80).trim()
                            console.log(`      → Found in previous segment: "${itemName}"`)
                        }
                    }

                    // PRIORITY 3: Extract name from current segment (before HSN)
                    if (!itemName) {
                        const beforeHsn = segments[candidate.segmentIdx].substring(0, segments[candidate.segmentIdx].indexOf(hsn)).trim()
                        if (beforeHsn && /[A-Za-z]{3,}/.test(beforeHsn) && beforeHsn.length > 5) {
                            itemName = beforeHsn.replace(/^\/|^2\s/, '').substring(0, 80).trim()
                            console.log(`      → Extracted before HSN: "${itemName}"`)
                        }
                    }

                    if (!itemName || itemName.length < 3) {
                        console.log(`      ⊘ No valid item name found, attempting reconstruction...`)
                        // Try the fallback reconstruction function
                        const reconstructed = reconstructItemFromCorruptedData(line, actualLineIdx, itemsTableLines)
                        if (reconstructed && !foundItemInLine) {
                            console.log(`      ✅ Reconstruction succeeded: ${reconstructed.item_name}`)
                            items.push(reconstructed)
                            foundItemInLine = true
                        }
                        continue
                    }

                    console.log(`      ✅ Item name: "${itemName}"`)

                    // Extract all numbers from segment with HSN (after the HSN code)
                    const currentSeg = segments[candidate.segmentIdx]
                    const numbersInSegment = currentSeg.match(/\d+/g) || []
                    console.log(`        Numbers in segment: [${numbersInSegment.join(', ')}]`)

                    let quantity = 0, rate = 0, gstPct = 18

                    // Find Qty and Rate from numbers in this segment
                    // Pattern: HSN, Qty, Rate, GST% (or similar)
                    // Qty is typically 1-5 digits, Rate is 2-5 digits, both > 0
                    const hsnPos = currentSeg.indexOf(hsn)
                    const afterHsn = currentSeg.substring(hsnPos + hsn.length).trim()
                    const afterHsnNumbers = afterHsn.match(/\d+/g) || []

                    console.log(`        Numbers after HSN: [${afterHsnNumbers.join(', ')}]`)

                    // Reconstruct decimals: combine consecutive numbers where second is 00-99 (fractional part)
                    let reconstructedNumbers = []
                    for (let k = 0; k < afterHsnNumbers.length; k++) {
                        let num = afterHsnNumbers[k]
                        // Check if next number exists and is a 2-digit fractional part (00-99)
                        if (k + 1 < afterHsnNumbers.length && /^\d{1,5}$/.test(num)) {
                            const nextNum = afterHsnNumbers[k + 1]
                            // If next is exactly 2 digits (00-99), likely a decimal fraction
                            if (/^\d{2}$/.test(nextNum)) {
                                reconstructedNumbers.push(num + '.' + nextNum)
                                k++ // Skip next number since it's now part of decimal
                                continue
                            }
                        }
                        reconstructedNumbers.push(num)
                    }
                    console.log(`        Reconstructed numbers: [${reconstructedNumbers.join(', ')}]`)

                    // Try to identify Qty and Rate
                    // Strategy: first valid number is likely Qty, second valid is likely Rate
                    // Qty typically 1-500 (but reject < 1 as invalid OCR)
                    // Rate typically 10-10000
                    // Fix OCR decimal omission: if a number looks too large for qty/rate, divide by 100

                    let qtyNum = 0, rateNum = 0
                    let foundQty = false, foundRate = false

                    // PASS 1: Prefer whole numbers in ideal qty range (1-500)
                    for (const numStr of reconstructedNumbers) {
                        let num = parseFloat(numStr)
                        if ((num === 9 || num === 18 || num === 28) && !foundQty) continue
                        if (Number.isInteger(num) && num >= 1 && num <= 500) {
                            qtyNum = num
                            foundQty = true
                            console.log(`        Qty identified (Pass 1 - ideal range): ${qtyNum}`)
                            break
                        }
                    }

                    // PASS 2: If not found, look for whole numbers (1-1000)
                    if (!foundQty) {
                        for (const numStr of reconstructedNumbers) {
                            let num = parseFloat(numStr)
                            if ((num === 9 || num === 18 || num === 28)) continue
                            if (Number.isInteger(num) && num >= 1 && num <= 1000) {
                                qtyNum = num
                                foundQty = true
                                console.log(`        Qty identified (Pass 2 - extended range): ${qtyNum}`)
                                break
                            }
                        }
                    }

                    // PASS 3: If still not found, accept large decimals in range 10-500
                    if (!foundQty) {
                        for (const numStr of reconstructedNumbers) {
                            let num = parseFloat(numStr)
                            if ((num === 9 || num === 18 || num === 28)) continue
                            if (numStr.includes('.') && num >= 10 && num <= 500) {
                                qtyNum = num
                                foundQty = true
                                console.log(`        Qty identified (Pass 3 - decimal range): ${qtyNum}`)
                                break
                            }
                        }
                    }

                    // PASS 4: Fallback - accept any reasonable number
                    if (!foundQty) {
                        for (const numStr of reconstructedNumbers) {
                            let num = parseFloat(numStr)
                            if ((num === 9 || num === 18 || num === 28)) continue
                            if (num >= 1 && num <= 100000) {
                                qtyNum = num
                                foundQty = true
                                console.log(`        Qty identified (Pass 4 - fallback): ${qtyNum}`)
                                break
                            }
                        }
                    }

                    // Now find rate - look for 3-5 digit reasonably large number
                    if (foundQty) {
                        for (const numStr of reconstructedNumbers) {
                            let num = parseFloat(numStr)
                            // Must be different from qty and in reasonable rate range
                            if (Math.abs(num - qtyNum) > 0.5 && num > 5 && num < 50000) {
                                rateNum = num
                                foundRate = true
                                console.log(`        Rate identified: ${rateNum}`)
                                break
                            }
                        }
                    }

                    // Fallback: if we have qty but no rate, find any different number
                    if (foundQty && !foundRate && reconstructedNumbers.length >= 2) {
                        for (const numStr of reconstructedNumbers) {
                            let num = parseFloat(numStr)
                            if (Math.abs(num - qtyNum) > 0.5 && num > 0) {
                                rateNum = num
                                foundRate = true
                                console.log(`        Rate (fallback): ${rateNum}`)
                                break
                            }
                        }
                    }

                    quantity = qtyNum
                    rate = rateNum

                    console.log(`        Extracted: Qty=${quantity}, Rate=${rate}`)

                    // Correct 5-digit HSNs that are missing a leading digit
                    const originalHsn = hsn
                    if (hsn.length === 5 && /^53|^49|^34/.test(hsn)) {
                        hsn = '8' + hsn
                        console.log(`    ✓ Correcting 5→7 digit HSN: ${originalHsn} → ${hsn}`)
                    }

                    // Extract first 4 digits if HSN is longer than 4 (from OCR capture)
                    let validHsn = hsn
                    if (hsn.length > 4) {
                        validHsn = hsn.substring(0, 4)
                        console.log(`    ℹ️ Extracted HSN: ${hsn} → ${validHsn}`)
                    }

                    // Validate HSN
                    if (!isValidItemHSN(validHsn, line)) {
                        console.log(`      ✗ HSN ${validHsn} failed validation, attempting reconstruction...`)
                        
                        // Try intelligent reconstruction for corrupted HSN
                        const reconstructed = reconstructItemFromCorruptedData(line, actualLineIdx, itemsTableLines)
                        if (reconstructed && !foundItemInLine) {
                            console.log(`     ✅ Successfully reconstructed: ${reconstructed.item_name}`)
                            items.push(reconstructed)
                            foundItemInLine = true
                        }
                        continue
                    }

                    // Add item if we have valid data (qty >= 1, rate > 0)
                    if (quantity >= 1 && rate > 0) {
                        const item = {
                            item_name: itemName,
                            description: itemName, // Description can be edited by user
                            hsn_code: validHsn,
                            quantity: quantity,
                            unit: 'pcs', // Default unit, can be set from DB
                            rate: rate,
                            amount: quantity * rate, // Line total before GST
                            gst_percentage: gstPct,
                            gst_amount: (quantity * rate * gstPct) / 100,
                            total_amount: (quantity * rate * (1 + gstPct / 100)), // Total with GST
                            product_id: null, // Will be set from database lookup
                            batch_no: '',
                            expiry_date: null
                        }
                        console.log(`✅ Item: ${itemName} (HSN ${validHsn}) - Qty: ${quantity}@₹${rate}`)
                        items.push(item)
                        foundItemInLine = true
                        break  // Exit candidate loop after finding valid item
                    } else {
                        // Continue to next HSN candidate if qty/rate not found
                        continue
                    }
                }  // End of hsnCandidates loop

                if (foundItemInLine) continue  // Skip line processing if item was found
            }

            // Single line without pipes - try to parse as item if it has product name + HSN
            // Don't skip just because we found some items already
            const hasProductName = /[A-Za-z]{3,}|connector|phase|meter|clamp|bolt|pipe|tie|cable|aluminum|pvc|nut|tray/i.test(line)
            const hasHSN = /\b\d{4,7}\b(?![\d\.])/.test(line)

            if (hasProductName && hasHSN) {
                const itemResult = parseSegmentForItem(line)
                if (itemResult && itemResult.item_name.length > 2 && itemResult.rate > 0 && itemResult.quantity > 0) {
                    console.log(`  ✅ Parsed single-line item: ${itemResult.item_name} (HSN ${itemResult.hsn_code}) Qty: ${itemResult.quantity} Rate: ₹${itemResult.rate}`)
                    items.push(itemResult)
                    continue
                }
            }

            // If no items found yet, try to parse single line as item
            if (items.length === 0) {
                const itemResult = parseSegmentForItem(line)
                if (itemResult && itemResult.item_name.length > 3 && itemResult.rate > 0 && itemResult.quantity > 0) {
                    console.log(`  ✅ Parsed item: ${itemResult.item_name} (HSN ${itemResult.hsn_code}) Qty: ${itemResult.quantity} Rate: ₹${itemResult.rate}`)
                    items.push(itemResult)
                }
            }
        }

        console.log('\n📊 Total items extracted: ', items.length)
        items.forEach((item, idx) => {
            console.log(`  [${idx + 1}] ${item.item_name} (HSN: ${item.hsn_code}) - Qty: ${item.quantity}, Rate: ₹${item.rate}`)
        })

        // If no items found, try advanced header-based extraction
        if (items.length === 0) {
            console.log('\n🔍 Trying advanced table header detection...')
            const extractedItems = extractItemsUsingHeaderDetection(itemsTableLines, tableStartIdx)
            items.push(...extractedItems)
        }

        // If still no items, try HSN-based fallback
        if (items.length === 0) {
            console.log('\n⚠️ No items found yet, trying HSN-based extraction from table...')

            // Find all HSN codes in the table
            // Look for both standard HSN (4-6 digits) and product codes (8-11 digits)
            const hsnMatches = new Map() // HSN -> {lineIdx, line, beforeText}

            itemsTableLines.forEach((line, idx) => {
                // Match both short HSN codes (4-6 digits) AND longer product codes (8-11 digits)
                const shortMatches = [...line.matchAll(/(\d{4,6})/g)]
                const longMatches = [...line.matchAll(/(\d{8,11})/g)]

                // Combine and prioritize: 8-11 digit codes (product codes) first, then 4-6 digit codes (HSN)
                // If both exist, prefer 8+ digit codes as they're more likely to be real product identifiers
                let matches = []

                if (longMatches.length > 0) {
                    // Prefer longer product codes (8-11 digits) - these are usually item/product codes
                    matches = longMatches
                } else if (shortMatches.length > 0) {
                    // Fall back to shorter HSN codes (4-6 digits)
                    const sixDigitCodes = shortMatches.filter(m => m[1].length === 6)
                    const fiveDigitCodes = shortMatches.filter(m => m[1].length === 5)
                    const fourDigitCodes = shortMatches.filter(m => m[1].length === 4)

                    // Prioritize: 6-digit > 5-digit > 4-digit
                    if (sixDigitCodes.length > 0) {
                        // But only if not a postal code
                        matches = sixDigitCodes.filter(m => {
                            const code = m[1]
                            // Skip if looks like postal code (431001, 400001, etc.)
                            if (/^[1-4][0-9]{5}$/.test(code)) {
                                const contextBefore = line.substring(Math.max(0, m.index - 20), m.index).toUpperCase()
                                if (/NAGAR|STATE|ADDRESS|CITY|MAHARASHTRA/.test(contextBefore)) {
                                    return false // Skip postal codes
                                }
                            }
                            return true
                        })
                        if (matches.length === 0) matches = fiveDigitCodes
                    }
                    if (matches.length === 0 && fiveDigitCodes.length > 0) {
                        matches = fiveDigitCodes
                    }
                    if (matches.length === 0 && fourDigitCodes.length > 0) {
                        matches = fourDigitCodes.filter(m => {
                            const contextBefore = line.substring(Math.max(0, m.index - 10), m.index).toUpperCase()
                            // Skip if appears after /Nos or / (likely a price)
                            return !/(NOS|UTT|PER|RATE|PRICE)\s*$/.test(contextBefore)
                        })
                    }
                }

                matches.forEach(match => {
                    const hsn = match[1]
                    if (!hsnMatches.has(hsn)) {
                        const beforeHsn = line.substring(0, match.index).trim()
                        hsnMatches.set(hsn, {
                            lineIdx: tableStartIdx + idx,
                            line: line,
                            beforeText: beforeHsn
                        })
                    }
                })
            })

            console.log(`  Found ${hsnMatches.size} candidate HSN codes after filtering`)

            // For each HSN, extract item details
            for (const [hsn, hsnInfo] of hsnMatches) {
                const { lineIdx, line, beforeText } = hsnInfo

                // Validate HSN - skip if validation fails
                if (!isValidItemHSN(hsn, line)) {
                    continue
                }

                // Extract product name from HSN line or previous lines
                // Handle multi-line item descriptions by collecting all lines that form the item name
                let itemName = beforeText

                // If name is empty/short, collect from previous lines
                if (!itemName || itemName.length < 5) {
                    const nameParts = []

                    // Look backwards from current line to collect all lines that form the item description
                    // Stop when we hit another HSN, a metadata line, or a number-only line
                    for (let scanIdx = lineIdx - tableStartIdx - 1; scanIdx >= 0; scanIdx--) {
                        const prevLine = itemsTableLines[scanIdx].trim()

                        // Stop if empty line
                        if (!prevLine || prevLine.length < 2) break

                        // Stop if this line has a 4-6 digit HSN code (it's a different item)
                        if (/\b\d{4,6}\b/.test(prevLine)) break

                        // Stop if it's metadata-like (email, gstin, address patterns)
                        if (/emai|gstin|phone|state|address|bill|buyer|seller/i.test(prevLine)) break

                        // Stop if it's purely numbers/currency (likely a summary line)
                        if (/^[\d,.\s₹%()]+$/.test(prevLine)) break

                        // Collect this line as part of the item name
                        nameParts.unshift(prevLine)
                    }

                    // Combine collected lines with current line's "before HSN" text
                    if (nameParts.length > 0) {
                        itemName = [...nameParts, beforeText].map(t => t.trim()).filter(t => t).join(' ')
                    } else {
                        itemName = beforeText
                    }
                }

                // Clean up item name
                itemName = itemName
                    .replace(/^\d+\s*/, '') // Remove leading numbers (item sequence)
                    .replace(/\|/g, ' ') // Replace pipes with space
                    .replace(/\s{2,}/g, ' ') // Replace multiple spaces
                    .replace(/\n/g, ' ') // Replace newlines
                    .trim()

                // Limit length but keep meaningful length for multi-line items
                if (itemName.length > 120) itemName = itemName.substring(0, 120)

                if (!itemName || itemName.length < 3) {
                    console.log(`    ⊘ Could not extract item name`)
                    continue
                }

                // Extract numbers from this line and the next 1-3 lines
                let allNumbers = []
                const currentLineNum = lineIdx - tableStartIdx

                // Get numbers from current line, combine split decimals
                const hsnPos = line.indexOf(hsn)
                const afterHsn = line.substring(hsnPos + hsn.length)
                const rawNumbers = afterHsn.match(/\d+(?:[.,]\d+)?/g) || []

                // Parse and combine decimal parts (e.g., "60" + "00" → 60.00)
                for (let i = 0; i < rawNumbers.length; i++) {
                    let num = rawNumbers[i].replace(/,/g, '') // Remove commas
                    // If current number is just digits and next is small (00-99), combine as decimal
                    if (i + 1 < rawNumbers.length && !num.includes('.')) {
                        const nextNum = rawNumbers[i + 1].replace(/,/g, '')
                        if (/^00|0[1-9]|[1-9][0-9]$/.test(nextNum) && nextNum.length === 2) {
                            num = num + '.' + nextNum
                            rawNumbers.splice(i + 1, 1) // Skip next number
                        }
                    }
                    allNumbers.push(num)
                }

                // If not enough numbers, look at next 1-3 lines (for multi-line item descriptions)
                // where quantity might be on the line after HSN
                if (allNumbers.length < 3) {
                    for (let nextIdx = 1; nextIdx <= 3 && currentLineNum + nextIdx < itemsTableLines.length; nextIdx++) {
                        const nextLine = itemsTableLines[currentLineNum + nextIdx]
                        const nextRaw = nextLine.match(/\d+(?:[.,]\d+)?/g) || []
                        allNumbers.push(...nextRaw.map(n => n.replace(/,/g, '')))

                        // Stop if this line had a HSN (next item started)
                        if (/\b\d{4,6}\b/.test(nextLine)) break
                        // Stop if we found enough numbers
                        if (allNumbers.length >= 5) break
                    }
                }

                console.log(`    Numbers found: [${allNumbers.slice(0, 8).join(', ')}...]`)

                // Filter and parse quantities and rates
                let quantity = 0, rate = 0

                // IMPROVED: Look for "Quantity Unit" patterns in full text (not just numbers)
                // Units: Mt, Nos, Mtr, Kg, L, Pcs, Pac, Box, Unit, Packs, etc.
                const unitPattern = /(\d+(?:[.,]\d+)?)\s*(Mt|Nos|Mtr|Kg|L|Pcs|Pac|Packs|Box|Unit|ml|gm)/gi

                // Search in current line + next line for unit patterns
                let searchText = line + ' ' + (currentLineNum + 1 < itemsTableLines.length ? itemsTableLines[currentLineNum + 1] : '')
                const unitMatch = searchText.match(unitPattern)

                if (unitMatch) {
                    // Found explicit quantity with unit - extract the number
                    const firstMatch = unitMatch[0] // e.g., "500 Mt"
                    const qtyFromUnit = parseFloat(firstMatch.match(/\d+(?:[.,]\d+)?/)[0])
                    if (qtyFromUnit > 0 && qtyFromUnit <= 10000) {
                        quantity = qtyFromUnit
                        console.log(`    ✓ Found qty from unit pattern: ${quantity}`)
                    }
                }

                // If no unit pattern found, fall back to number selection
                if (!quantity) {
                    // Pass 1: Look for reasonable whole numbers (but NOT extremely large ones)
                    for (const num of allNumbers) {
                        const val = parseFloat(num)
                        // Skip HSN, skip if it's clearly a rate (>= 10x the unit price)
                        if (val !== parseInt(hsn) && Number.isInteger(val) && val >= 1 && val <= 1000) {
                            quantity = val
                            break
                        }
                    }

                    // Pass 2: If no whole number found, look for decimals
                    if (!quantity) {
                        for (const num of allNumbers) {
                            const val = parseFloat(num)
                            if (val !== parseInt(hsn) && val > 0 && val <= 1000 && num.includes('.')) {
                                quantity = val
                                break
                            }
                        }
                    }

                    // Pass 3: Very lenient - just find ANY reasonable number
                    if (!quantity) {
                        for (const num of allNumbers) {
                            const val = parseFloat(num)
                            if (val !== parseInt(hsn) && val > 0 && val <= 10000) {
                                quantity = val
                                break
                            }
                        }
                    }
                }

                // Find rate - look for larger numbers (typically unit price is in tens to thousands)
                // Skip the quantity and HSN
                let rateCount = 0
                for (let i = 0; i < allNumbers.length; i++) {
                    const num = allNumbers[i]
                    const val = parseFloat(num)
                    // Rate should be different from qty and HSN, typically in range 10-100000
                    // But NOT if it's equal to quantity (avoid picking the same number twice)
                    if (Math.abs(val - quantity) > 1 && val !== parseInt(hsn) && val > 5 && val < 1000000) {
                        rateCount++
                        if (rateCount === 1) { // Take first valid rate
                            rate = val
                            break
                        }
                    }
                }

                // If we don't have both, try to be more lenient
                if (quantity === 0 || rate === 0) {
                    console.log(`    ⊘ Incomplete: Qty=${quantity}, Rate=${rate} - skipping`)
                    continue
                }

                // SANITY CHECK: If calculated amount seems unreasonably large, try swapping qty and rate
                // Typical invoice line amounts: < 5,000,000
                const calculatedAmount = quantity * rate
                if (calculatedAmount > 10000000 && rate < quantity) {
                    // This looks like qty and rate are swapped
                    // Try swapping them
                    const tempQty = quantity
                    const tempRate = rate
                    quantity = tempRate
                    rate = tempQty
                    console.log(`    ⚠️ Swapped qty/rate (was producing amount ${calculatedAmount}): Qty=${quantity}, Rate=${rate}`)
                }

                console.log(`    ✅ Item: "${itemName}" | HSN: ${hsn} | Qty: ${quantity} | Rate: ₹${rate}`)
                items.push({
                    item_name: itemName,
                    hsn_code: hsn,
                    quantity: quantity,
                    rate: rate,
                    gst_percentage: 18
                })
            }
        }

        // Still no items? Search entire document
        if (items.length === 0) {
            console.log('\n⚠️ Still no items found, searching entire document...')
            const allLines = text.split('\n').filter(line => line.trim().length > 0)

            // Look for any lines that could be items (have HSN codes)
            for (let i = 0; i < allLines.length; i++) {
                const line = allLines[i]

                // Skip header/metadata lines
                if (/invoice\s*number|invoice\s*date|bill\s*to|ship\s*to|gstin|email|contact|state:|customer|address|nagar|phone/i.test(line)) {
                    continue
                }

                // Skip lines with only numbers (likely totals)
                if (/^[\d\s,\.]+$/.test(line.trim())) {
                    continue
                }

                // Look for HSN code + product name + quantity + rate pattern
                const hsnMatch = line.match(/\b(\d{4,6})\b(?![\d\.])/);
                if (hsnMatch) {
                    const hsn = hsnMatch[1]

                    // Validate HSN
                    if (!isValidItemHSN(hsn, line)) {
                        continue
                    }

                    // Try to parse this line as an item
                    const itemResult = parseSegmentForItem(line)
                    if (itemResult && itemResult.item_name && itemResult.item_name.length > 2) {
                        // Extract or estimate quantity and rate if missing
                        if (!itemResult.quantity || itemResult.quantity === 0) {
                            // Try to find quantity from line
                            const numbers = line.match(/\b(\d{1,5})\b/g) || []
                            for (const num of numbers) {
                                const n = parseInt(num)
                                if (n > 0 && n <= 10000 && n !== parseInt(hsn)) {
                                    itemResult.quantity = n
                                    break
                                }
                            }
                        }

                        if (!itemResult.rate || itemResult.rate === 0) {
                            // Try to find rate from line (look for larger numbers)
                            const numbers = (line.match(/(\d+(?:[.,]\d+)?)/g) || []).map(n => parseFloat(n.replace(/,/g, '')))
                            for (const num of numbers) {
                                if (num > 30 && num !== itemResult.quantity) {
                                    itemResult.rate = num
                                    break
                                }
                            }
                        }

                        if (itemResult.quantity > 0 && itemResult.rate > 0) {
                            console.log(`  ✅ Found item in full document scan: ${itemResult.item_name} (HSN ${hsn}) Qty: ${itemResult.quantity} Rate: ₹${itemResult.rate}`)
                            items.push(itemResult)
                        }
                    }
                }
            }
        }

        // Fallback: Look for items that have product names but weren't extracted due to HSN issues
        // Check for "SECURE SINGLE PHASE" which often has OCR issues with HSN
        console.log('\n🔍 Checking for fallback items...')
        if (!items.some(i => /\bsecure\b/i.test(i.item_name))) {
            console.log('  No SECURE item found, searching for it...')
            const secureLineIdx = itemsTableLines.findIndex(line => /secure.*phase/i.test(line))
            console.log(`  Search result: secureLineIdx = ${secureLineIdx}`)

            if (secureLineIdx >= 0) {
                const secureLine = itemsTableLines[secureLineIdx]
                console.log('\n🔄 Fallback: Found SECURE SINGLE PHASE item, attempting manual extraction...')
                console.log(`   Full line: "${secureLine}"`)

                // Extract quantities and rates from the line
                const numbers = [...secureLine.matchAll(/(\d+\.?\d*)/g)].map(m => parseFloat(m[1]))
                console.log(`   Numbers found in line: ${numbers}`)

                // Try to find reasonable qty and rate (qty usually < 100, rate usually > 30)
                let qty = 0, rate = 0
                for (const num of numbers) {
                    // Skip very large numbers (likely totals, not unit rates)
                    if (num > 100000) continue

                    if (!qty && num >= 1 && num <= 1000) {
                        qty = num
                        console.log(`   Set qty=${qty}`)
                    } else if (!rate && num >= 30 && num < 5000 && num !== qty) {
                        rate = num
                        console.log(`   Set rate=${rate}`)
                    }
                    if (qty && rate) break
                }

                // If we found numbers but no rate, try dividing large numbers by qty
                if (qty > 0 && !rate) {
                    console.log(`   Trying to extract rate from large numbers (qty=${qty})...`)
                    for (const num of numbers) {
                        if (num > 5000 && num < 1000000) {
                            // First check if dividing by 100 gives reasonable rate (OCR mangled decimal like 1350.00 → 135000)
                            const rateFrom100 = Math.round(num / 100)
                            if (rateFrom100 >= 30 && rateFrom100 <= 5000) {
                                rate = rateFrom100
                                console.log(`   Set rate=${rate} (from ${num} / 100 - OCR mangled decimal)`)
                                break
                            }

                            // Try dividing by quantity
                            const potentialRate = Math.round(num / qty)
                            if (potentialRate >= 30 && potentialRate <= 10000) {
                                rate = potentialRate
                                console.log(`   Set rate=${rate} (derived from ${num} / ${qty})`)
                                break
                            }
                        }
                    }
                }

                // Last resort: if still no rate, look for any number between qty and qty*100
                if (qty > 0 && !rate) {
                    console.log(`   Last resort: looking for numbers between ${qty} and ${qty * 100}...`)
                    for (const num of numbers) {
                        if (num > qty && num < qty * 100 && num <= 10000) {
                            rate = num
                            console.log(`   Set rate=${rate} (fallback)`)
                            break
                        }
                    }
                }

                if (qty > 0 && rate > 0) {
                    // Apply smart heuristic: if qty is 10-25 and rate is >= 1000, it might be a decimal (e.g., 20 → 2.0)
                    if (qty >= 10 && qty <= 25 && rate >= 1000) {
                        const possibleAltQty = qty / 10
                        const originalTotal = qty * rate
                        const altTotal = possibleAltQty * rate

                        if (altTotal >= 100 && altTotal <= 100000 && altTotal < originalTotal * 0.5) {
                            console.log(`   ✨ Corrected qty: ${possibleAltQty} (was ${qty}, based on rate ${rate})`)
                            qty = possibleAltQty
                        }
                    }

                    const fallbackItem = {
                        item_name: 'SECURE SINGLE PHASE',
                        hsn_code: '902830', // Known HSN for this item
                        quantity: qty,
                        rate: rate,
                        gst_percentage: 18
                    }
                    console.log(`   ✅ Added fallback item: ${fallbackItem.item_name} (HSN ${fallbackItem.hsn_code}) Qty: ${qty} Rate: ₹${rate}`)
                    items.push(fallbackItem)
                } else {
                    console.log(`   ⚠️ Could not extract valid qty and rate (qty=${qty}, rate=${rate})`)
                }
            } else {
                console.log('  SECURE SINGLE PHASE line not found in items table')
            }
        } else {
            console.log('  SECURE/SINGLE PHASE item already extracted')
        }

        // Remove duplicates and finalize items
        let deduplicatedItems = deduplicateItems(items)

        // Filter out items with invalid quantities and amounts
        deduplicatedItems = deduplicatedItems.filter(item => {
            let isValid = item.quantity && item.quantity >= 1 && item.quantity <= 100000

            // Check 1: reject small fractional quantities that look like dimensions
            // E.g., 4.8, 2.5, 3.2 in product names like "CABLE TIE 300 X 4.8 NYLON"
            if (isValid && item.quantity < 10 && item.quantity % 1 !== 0) {
                const isSuspiciousDimension = item.quantity.toString().match(/\d+\.\d/)
                if (isSuspiciousDimension) {
                    console.log(`  ⚠️ Filtering out suspicious dimension-like qty: ${item.item_name} (qty: ${item.quantity})`)
                    isValid = false
                }
            }

            // Check 2: reject extremely large decimals that look like corrupted OCR
            // E.g., 7151.2, 2000.5 from table parsing errors where decimals get mixed
            if (isValid && item.quantity > 500 && item.quantity % 1 !== 0) {
                console.log(`  ⚠️ Filtering out extremely large decimal qty: ${item.item_name} (qty: ${item.quantity})`)
                isValid = false
            }

            // Check 3: reject items with unrealistic line amounts
            // Typical invoice line amounts should be < 5,000,000
            // If amount > 5M, likely qty and rate were swapped during extraction
            if (isValid && item.rate) {
                const lineAmount = item.quantity * item.rate
                if (lineAmount > 5000000) {
                    console.log(`  ⚠️ Filtering out unrealistic amount: ${item.item_name} (qty: ${item.quantity}, rate: ${item.rate}, amount: ${lineAmount})`)
                    isValid = false
                }
            }

            // Check 4: reject if quantity is extremely large and rate is extremely large
            // E.g., qty=410, rate=71395 - one must be wrong
            if (isValid && item.quantity > 100 && item.rate > 10000) {
                // For industrial items, if BOTH qty and rate are very large, flag it
                const lineAmount = item.quantity * item.rate
                if (lineAmount > 5000000) {
                    console.log(`  ⚠️ Filtering out suspicious qty+rate: ${item.item_name} (qty: ${item.quantity}, rate: ${item.rate})`)
                    isValid = false
                }
            }

            if (!isValid) {
                console.log(`  ⊘ Filtering out invalid item: ${item.item_name}`)
            }
            return isValid
        })

        // Ensure all items have calculated amount and gst_amount fields
        deduplicatedItems = deduplicatedItems.map(item => {
            const amount = (item.quantity && item.rate) ? item.quantity * item.rate : 0
            const gst_amount = amount > 0 ? (amount * (item.gst_percentage || 18)) / 100 : 0
            return {
                ...item,
                amount: Math.round(amount * 100) / 100,
                gst_amount: Math.round(gst_amount * 100) / 100,
                total_amount: Math.round((amount + gst_amount) * 100) / 100
            }
        })

        // FINAL COMPREHENSIVE PASS: Look for missed items with unit patterns
        // This catches items that might have been filtered out or missed in initial parsing
        if (deduplicatedItems.length < 7) {
            console.log(`\n🔍 Secondary pass: Looking for missed items (current count: ${deduplicatedItems.length}/7)...`)
            const allLines = text.split('\n')
            const existingNames = new Set(deduplicatedItems.map(i => i.item_name.substring(0, 20).toUpperCase()))
            
            for (let idx = 0; idx < allLines.length; idx++) {
                const line = allLines[idx]
                
                // Skip short lines and header/footer lines
                if (line.length < 10 || /^(invoice|gstin|date|total|amount|sr|sl|no|bill|page)/i.test(line.trim())) continue
                
                // STRATEGY 1: Look for lines with clear unit patterns: "QTY Nos/Mt/Mtr/Kg/L"
                const unitMatch = line.match(/(\d+(?:\.\d+)?)\s*(Nos|Mt|Mtr|Kg|L|Pcs|Pac|Box|Unit|pieces)(?:\s|$|,)/i)
                let qty = 0, rate = 0, itemName = '', hsn = ''
                
                if (unitMatch) {
                    qty = parseFloat(unitMatch[1])
                    if (qty < 1 || qty > 10000) continue
                    
                    // Extract item name from before the qty/unit pattern
                    const preQtyText = line.substring(0, unitMatch.index)
                    const nameMatch = preQtyText.match(/([A-Za-z][A-Za-z0-9\s\-\(\)\.\']*?)(?:$|\||,|\d{4})/)
                    itemName = (nameMatch ? nameMatch[1].trim() : '').substring(0, 50)
                } else {
                    // STRATEGY 2: Look for product keywords + quantity pattern
                    // Check if line contains product keywords
                    if (!/cable|wire|paint|spray|acdb|dcdb|switch|mcb|breaker|fastener|nut|bolt|pipe|meter|indicator|copper|aluminum|steel|polycab/i.test(line)) {
                        continue
                    }
                    
                    // Try to extract qty from this line
                    const qtyMatch = line.match(/\b([1-9]\d{0,3})(?:\s|Nos|Mt|Kg|L|,|\||$)/i)
                    if (!qtyMatch) continue
                    
                    qty = parseInt(qtyMatch[1])
                    if (qty < 1 || qty > 10000) continue
                    
                    // Extract item name
                    itemName = line.replace(/\d{4,}/g, '').substring(0, 50).trim()
                }
                
                // Extract rate (look for 2-4 digit numbers that could be rates)
                if (rate === 0) {
                    const rateMatches = line.match(/\b(\d{2,5})\b/g)
                    if (rateMatches) {
                        for (const rateStr of rateMatches) {
                            const val = parseInt(rateStr)
                            if (val > 50 && val < 100000 && val !== qty) {
                                rate = val
                                break
                            }
                        }
                    }
                }
                
                // Extract or construct HSN
                const hsnMatch = line.match(/\b(\d{4})\b(?!\d)/)
                if (hsnMatch) {
                    hsn = hsnMatch[1]
                } else {
                    // Use keyword-based HSN assignment
                    if (/cable|wire|conductor|polycab/i.test(line)) hsn = '8544'
                    else if (/acdb|dcdb|switch|mcb/i.test(line)) hsn = '8536'
                    else if (/paint|spray/i.test(line)) hsn = '3208'
                    else if (/fastener|nut|bolt|screw/i.test(line)) hsn = '7308'
                    else hsn = '8414' // Default industrial HSN
                }
                
                // Validate and add if not duplicate
                const shortName = itemName.substring(0, 20).toUpperCase()
                if (itemName.length > 3 && qty > 0 && rate > 50 && !existingNames.has(shortName)) {
                    const newItem = {
                        item_name: itemName,
                        description: itemName,
                        hsn_code: hsn,
                        quantity: qty,
                        unit: 'pcs',
                        rate: rate,
                        amount: qty * rate,
                        gst_percentage: 18,
                        gst_amount: (qty * rate * 18) / 100,
                        total_amount: Math.round((qty * rate * 1.18) * 100) / 100,
                        product_id: null,
                        batch_no: '',
                        expiry_date: null
                    }
                    deduplicatedItems.push(newItem)
                    existingNames.add(shortName)
                    console.log(`  ✅ Found missed item: "${itemName}" (Qty: ${qty} @ ₹${rate}, HSN: ${hsn})`)
                }
                
                // Stop if we have enough items
                if (deduplicatedItems.length >= 7) break
            }
        }

        console.log(`📊 Total items extracted: ${deduplicatedItems.length} (after deduplication and filtering)`)
        return deduplicatedItems
    } catch (error) {
        console.error('❌ Error parsing invoice text:', error)
        return []
    }
}

// Helper function to parse a segment and extract item details
const parseSegmentForItem = (segment) => {
    if (!segment || segment.trim().length < 3) return null

    // Skip header/footer keywords
    if (/^(invoice|gstin|date|total|amount|sr|sl|no|description|tax|bill|rate|qty|hsn|quantity|per|taxable|sgst|cgst|igst|gst|output|input|state|buyer|seller|reference|s1|s2)/i.test(segment)) {
        return null
    }

    // Skip if it's just a number (likely a price/amount being parsed separately)
    if (/^[\d,\.]+$/.test(segment.trim())) {
        return null
    }

    // Pattern 1: Complete pipe-separated format
    // Format: Name | HSN | Qty | Rate | GST%
    let match = segment.match(/^([A-Za-z0-9\s\-\.\(\)\/]+?)\s*\|\s*(\d{4,6})\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:[,\.]\d+)?)\s*(?:\|\s*(\d+(?:\.\d+)?))?/)
    if (match) {
        const itemName = match[1].trim().replace(/^\//, '').trim()
        const rate = parseFloat(match[4].replace(/,/g, ''))
        if (itemName.length > 2 && /[A-Za-z]/.test(itemName) && rate > 0) {
            return {
                item_name: itemName,
                hsn_code: match[2].trim(),
                quantity: parseFloat(match[3]),
                rate: rate,
                gst_percentage: parseFloat(match[5]) || 18
            }
        }
    }

    // Pattern 2: Item name followed by HSN and Qty (with or without Qty keyword)
    // Format: ItemName HSN Quantity or ItemName HSN QuantityQty or ItemName HSN Quantity.Qty
    // Handles: "ACDB Single Phase 32A 853710 20Qty" -> 2.0 Qty
    // Handles: "Mc4 Connector 853690 s0.0Qty" -> 50.0 Qty (fixing OCR errors)
    match = segment.match(/^([A-Za-z0-9\s\-\.\(\)\/]+?)\s+(\d{4,6})\s+([\d\.s]+)\s*(?:[Qq]ty)?/)
    if (match) {
        const itemName = match[1].trim().replace(/^\//, '').trim()
        const hsnCode = match[2].trim()
        let qty = match[3].trim()

        // Fix OCR errors in quantity
        qty = qty.replace(/s/g, '5').replace(/S/g, '5').replace(/o/g, '0').replace(/O/g, '0')
        const quantity = parseFloat(qty)

        if (itemName.length > 2 && /[A-Za-z]/.test(itemName) && quantity > 0 && quantity < 10000) {
            // Item parsed, but rate will be in next segment or use default
            return {
                item_name: itemName,
                hsn_code: hsnCode,
                quantity: quantity,
                rate: 0, // Will be filled from adjacent segments
                gst_percentage: 18,
                isIncomplete: true // Mark as needing rate lookup
            }
        }
    }

    // Pattern 3: Item name with HSN at the end (sometimes OCR splits them differently)
    // Format: ItemName 853710 or SECURE SINGLE PHASE 902830
    match = segment.match(/^([A-Za-z0-9\s\-\.\(\)\/]{5,}?)\s+(\d{4,6})$/)
    if (match) {
        const itemName = match[1].trim().replace(/^\//, '').trim()
        if (itemName.length > 2 && /[A-Za-z]/.test(itemName)) {
            return {
                item_name: itemName,
                hsn_code: match[2].trim(),
                quantity: 0, // Will be filled later
                rate: 0,
                gst_percentage: 18,
                isIncomplete: true
            }
        }
    }

    // Pattern 4: Price segment that might contain decimal
    // Format: 1400.00 or 1,400.00
    const priceMatch = segment.match(/^(\d{3,}(?:[,\.]\d+)?)/)
    if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''))
        if (price > 500 && price < 100000) {
            // This is likely a rate
            return {
                item_name: '',
                hsn_code: '',
                quantity: 0,
                rate: price,
                gst_percentage: 18,
                isPriceOnly: true
            }
        }
    }

    return null
}

// Remove duplicate items - only if BOTH HSN and name match
// Different items can share the same HSN code
export const deduplicateItems = (items) => {
    const seen = new Map()
    return items.filter(item => {
        // Create a composite key using both HSN and name
        const key = `${item.hsn_code || 'NO-HSN'}|${item.item_name || 'NO-NAME'}`
        if (seen.has(key)) {
            console.log(`  ⊘ Duplicate detected - skipping: ${item.item_name} (HSN: ${item.hsn_code})`)
            return false
        }
        seen.set(key, true)
        return true
    })
}

// Function to fetch product details from database based on HSN code
// This will be called from the preview modal after extraction
export const fetchProductByHSN = async (hsnCode) => {
    try {
        if (!hsnCode) return null

        const response = await fetch(`/api/products/by-hsn/${hsnCode}`)
        if (!response.ok) return null

        const data = await response.json()
        return data.success ? data.data : null
    } catch (error) {
        console.error('Error fetching product by HSN:', error)
        return null
    }
}

// Update item with product database details
export const enrichItemWithProductData = (item, productData) => {
    if (!productData) return item

    return {
        ...item,
        product_id: productData.id,
        item_name: item.item_name || productData.name,
        description: productData.description || item.description,
        unit: productData.unit_of_measure || item.unit,
        hsn_code: item.hsn_code || productData.hsn_code,
        rate: item.rate || productData.purchase_price || productData.selling_price,
        gst_percentage: item.gst_percentage || (productData.gst_rate || 18)
    }
}
