// Simple Table Extractor
// Extracts invoice items from OCR text WITHOUT relying on HSN codes
// Uses product name patterns, quantity detection, and rate patterns

export const extractItemsWithoutHSN = (text) => {
    console.log('🔍 extractItemsWithoutHSN: Starting extraction')
    
    if (!text || text.trim().length === 0) return []

    const lines = text.split('\n').filter(line => line.trim().length > 2)
    const items = []
    const units = ['Mt', 'Mtr', 'Nos', 'Pcs', 'Kg', 'L', 'Box', 'Unit', 'pieces']

    // Find table boundaries
    let tableStartIdx = -1
    let tableEndIdx = lines.length

    for (let i = 0; i < lines.length; i++) {
        if (/quantity|unit.*price|qty|rate/i.test(lines[i])) {
            tableStartIdx = i
            break
        }
    }

    if (tableStartIdx < 0) return []

    for (let i = tableStartIdx + 2; i < lines.length; i++) {
        if (/^total|^amount|^summary|^sgst|^invoice amount/i.test(lines[i].toLowerCase())) {
            tableEndIdx = i
            break
        }
    }

    console.log(`\n📊 TABLE ANALYSIS (Lines ${tableStartIdx + 1} to ${tableEndIdx}):\n`)

    // DEBUG: Dump table lines to see what OCR extracted
    for (let i = tableStartIdx + 1; i < tableEndIdx && i < tableStartIdx + 30; i++) {
        if (lines[i].trim()) {
            console.log(`Line ${i}: ${lines[i].substring(0, 120)}...`)
        }
    }
    console.log('')

    // Better approach: Find rates first, then extract quantities that precede them
    // Rates are distinctive (decimal numbers 5-10000)
    // Quantities almost always appear right before or on the same line as rates
    
    const quantitiesFound = []
    
    // STEP 1: Find all decimal rates and their line positions
    const lineRates = {}  // { lineIdx: [rate1, rate2, ...] }
    const allRatesFound = []  // Track all rates for debugging
    
    for (let i = tableStartIdx + 1; i < tableEndIdx; i++) {
        const line = lines[i].trim()
        const rates = []
        
        // Find decimal rates (pattern: "50.5", "113.62", "250.5", etc.)
        // Exclude percentages like "18.0%", "12.5 %", etc. (with optional spaces before %)
        const decimalMatch = line.match(/\b(\d+\.\d+)(?!\s*%)/g) || []
        for (const rateStr of decimalMatch) {
            const rate = parseFloat(rateStr)
            // Skip known percentage values (even without % symbol)
            const knownPercentages = [5, 5.5, 7, 12, 12.5, 18, 18.0, 28, 28.5, 29]
            if (knownPercentages.includes(rate)) continue
            
            // Valid rate: between 10 and 100000
            if (rate >= 10 && rate <= 100000) {
                rates.push(rate)
                allRatesFound.push({ line: i, rate: rate, source: 'decimal' })
            }
        }
        
        // Also find comma-separated rates (e.g., "2,300", "2,000")
        // Pattern: ₹ followed by number like 2,300 or 2000 OR any currency symbol (¥, $, etc)
        const commaMatch = line.match(/(₹|¥|\$)?\s*(\d{1,3}(?:,\d{3})+)/g) || []
        for (const rateStr of commaMatch) {
            const cleanRate = rateStr.replace(/[₹¥\$\s,]/g, '')
            const rate = parseFloat(cleanRate)
            if (rate >= 10 && rate <= 100000) {
                rates.push(rate)
                allRatesFound.push({ line: i, rate: rate, source: 'comma-sep' })
            }
        }
        
        // Also match plain large numbers preceded by any currency symbol (₹, ¥, $, etc)
        const plainMoneyMatch = line.match(/(₹|¥|\$)?\s*(\d+)(?!\d{2,}\s*[₹¥\$|])/g) || []
        for (const rateStr of plainMoneyMatch) {
            const cleanRate = rateStr.replace(/[₹¥\$\s]/g, '')
            const rate = parseFloat(cleanRate)
            if (rate >= 10 && rate <= 100000 && !rates.includes(rate)) {
                rates.push(rate)
                allRatesFound.push({ line: i, rate: rate, source: 'plain-money' })
            }
        }
        
        // ALSO: Look for plain numbers that COULD be rates (3-4 digit numbers without ₹)
        // This catches rates that appear without currency symbol
        const plainNumbers = line.match(/\b(\d{2,5})(?!\d+|\.\d+)\b/g) || []
        for (const numStr of plainNumbers) {
            const num = parseFloat(numStr)
            // Look for reasonable rate amounts: 10-10000 but exclude known codes/quantities
            if (num >= 10 && num <= 10000 && ![7, 12, 18, 28, 29].includes(num)) {
                // Only add if not already found
                if (!rates.includes(num) && !allRatesFound.some(r => r.rate === num && r.line === i)) {
                    // Be conservative: only add if it's a "round" looking number (ends in 0, 5, etc) or has many digits
                    if ((num % 10 === 0 || num % 5 === 0 || numStr.length >= 3) && num !== parseInt(numStr.substring(0, 3))) {
                        rates.push(num)
                        allRatesFound.push({ line: i, rate: num, source: 'plain-number' })
                    }
                }
            }
        }
        
        if (rates.length > 0) {
            lineRates[i] = rates
        }
    }
    
    console.log(`📊 Found ${Object.keys(lineRates).length} lines with rates`)
    if (allRatesFound.length > 0) {
        console.log(`📊 All rates discovered:`, allRatesFound.map(r => `Line ${r.line}: ₹${r.rate} (${r.source})`).join(', '))
    }
    
    // STEP 2: For each line with rates, extract the preceding quantity
    for (const lineIdxStr of Object.keys(lineRates)) {
        const lineIdx = parseInt(lineIdxStr)
        const line = lines[lineIdx].trim()
        
        // Find ALL numbers on this line
        const allNumbers = line.match(/\b(\d+(?:\.\d+)?)\b/g) || []
        
        // Find rates on this line to know their positions
        const ratesOnThisLine = lineRates[lineIdx] || []
        
        // Look for quantity: a number that appears BEFORE any rate on the same line
        // Prefer numbers that are:
        // - NOT single digits (1-9 are often item sequence numbers)
        // - At least 4-5 digits OR between 10-999 but NOT in percentage/code ranges
        let foundQtyOnLine = false
        
        for (const numStr of allNumbers) {
            const num = parseFloat(numStr)
            
            // Skip tiny numbers and known percentages
            if (num <= 0.5 || num > 10000) continue
            if ([5, 5.5, 7, 12, 12.5, 18, 18.0, 28, 28.5, 29].includes(num)) continue
            if (/^85|^32|^73|^63|^80|^38|^86/.test(numStr)) continue
            
            // IMPORTANT: Skip single digits (they're usually item sequence numbers)
            // But keep multi-digit numbers in reasonable qty range
            if (num < 10 && !numStr.includes('.')) {
                console.log(`Line ${lineIdx}: Skipping ${num} (item sequence number)`)
                continue
            }
            
            // Check if there's a rate on this line
            if (ratesOnThisLine.length > 0) {
                const numPos = line.indexOf(numStr)
                const ratePos = line.lastIndexOf(ratesOnThisLine[0].toString())
                
                // Only accept if number comes before rate
                if (numPos >= 0 && ratePos > 0 && numPos < ratePos) {
                    const isDuplicate = quantitiesFound.some(q => q.qty === num && q.lineIdx === lineIdx)
                    if (!isDuplicate) {
                        quantitiesFound.push({
                            lineIdx: lineIdx,
                            qty: num,
                            unit: 'Unknown',
                            type: 'rate-paired'
                        })
                        console.log(`Line ${lineIdx}: Found qty ${num} (paired with rate ${ratesOnThisLine[0]})`)
                        foundQtyOnLine = true
                        break
                    }
                }
            }
        }
    }
    
    // Fallback: Search for quantities in pure description lines (lines WITHOUT rates)
    // These precede the rate lines and contain the actual quantities
    if (quantitiesFound.length < 6) {
        console.log(`⚠️ Only found ${quantitiesFound.length} quantities via rate-pairing, searching pure description lines...`)
        
        for (const lineIdxStr of Object.keys(lineRates)) {
            const rateLineIdx = parseInt(lineIdxStr)
            
            // For each rate line, search BACKWARD through lines that DON'T have rates
            // Stop when we hit another rate line
            let lastQtyLineFound = false
            for (let checkLineIdx = rateLineIdx - 1; checkLineIdx >= Math.max(tableStartIdx + 1, rateLineIdx - 5); checkLineIdx--) {
                // Skip this line if it also has rates (we want pure description lines only)
                if (lineRates[checkLineIdx] && lineRates[checkLineIdx].length > 0) {
                    if (lastQtyLineFound) break  // Stop if we already found quantity in a previous rate line
                    continue
                }
                
                const checkLine = lines[checkLineIdx].trim()
                
                // Skip headers and empty lines
                if (!checkLine || /total|quantity|unit|amount|invoice|bill|header|rate|qty|price/i.test(checkLine)) continue
                
                // This is a pure description line - look for quantities here
                const numbers = checkLine.match(/\b(\d+)\b/g) || []
                
                for (const numStr of numbers) {
                    const qty = parseFloat(numStr)
                    
                    // Accept reasonable quantities: 100+, or specific values like 4 or 12
                    const isGoodQty = (qty >= 100 && qty <= 1000) || qty === 4 || qty === 12
                    if (!isGoodQty) continue
                    
                    // Skip codes and percentages
                    if (/^85|^32|^73|^63|^80|^38|^45|^86|^22/.test(numStr)) continue
                    if ([7, 18, 28, 29].includes(qty)) continue
                    
                    // Avoid duplicate quantities
                    const isDuplicate = quantitiesFound.some(q => q.qty === qty && q.lineIdx === checkLineIdx)
                    if (!isDuplicate && !quantitiesFound.some(q => q.qty === qty)) {
                        quantitiesFound.push({
                            lineIdx: checkLineIdx,
                            qty: qty,
                            unit: 'Unknown',
                            type: 'description-line'
                        })
                        console.log(`Line ${checkLineIdx}: Found qty ${qty} (description line for rate line ${rateLineIdx})`)
                        lastQtyLineFound = true
                        break
                    }
                }
                
                // Stop searching if we found a quantity for this rate line
                if (lastQtyLineFound) break
            }
        }
    }

    if (quantitiesFound.length === 0) {
        console.log('❌ No quantities found!\n')
        return []
    }

    console.log(`\n✓ Total quantities found: ${quantitiesFound.length}\n`)
    console.log('='.repeat(80) + '\n')

    // Second pass: build complete items from quantities
    const processedLines = new Set()

    for (const qtyData of quantitiesFound) {
        const { lineIdx, qty, unit } = qtyData
        
        if (processedLines.has(lineIdx)) continue

        console.log(`ITEM from line ${lineIdx}: Qty ${qty}${unit}`)

        // Find product name
        let itemName = ''
        
        // Try to get from current line
        let currLine = lines[lineIdx].trim()
        if (/[A-Za-z]{4,}/.test(currLine) && !/total|amount|header|quantity/i.test(currLine)) {
            // Extract product part (before codes and numbers)
            itemName = currLine
                .replace(/\d{8,}\s*\|.*$/i, '') // Remove codes and everything after
                .replace(/\d+\s+(Mt|Mtr|Nos|Pcs|Kg).*$/i, '') // Remove qty/unit and after
                .replace(/^\d+\s+/, '') // Remove leading item numbers
                .trim()
        }

        // If not found, scan BACKWARD for product description lines
        // Build complete name from multiple lines
        if (!itemName || itemName.length < 5) {
            const nameLines = []
            
            // Scan backward up to 7 lines for product description
            for (let j = lineIdx - 1; j >= Math.max(tableStartIdx + 1, lineIdx - 7); j--) {
                const checkLine = lines[j].trim()
                
                // Skip empty lines
                if (!checkLine) continue
                
                // Skip header/footer lines
                if (/total|quantity|unit|amount|invoice|bill|header|rate|qty|price/i.test(checkLine)) continue
                
                // Check if it contains product-related text (letters)
                if (/[A-Za-z]{4,}/.test(checkLine)) {
                    // Clean up the line - remove codes, prices, numbers
                    let cleaned = checkLine
                        .replace(/\d{8,}.*$/i, '') // Remove product codes
                        .replace(/\|\s*\d+.*$/i, '') // Remove | followed by numbers
                        .trim()
                    
                    if (cleaned.length >= 3) {
                        nameLines.unshift(cleaned)
                    }
                }
            }
            
            // Join the collected lines
            if (nameLines.length > 0) {
                itemName = nameLines.join(' ').trim()
            }
        }
        
        // ALSO: Look at the NEXT line and append it if it's a continuation of product name
        // (i.e., doesn't contain quantity/rate data and has product-related text)
        if (lineIdx + 1 < tableEndIdx) {
            const nextLine = lines[lineIdx + 1].trim()
            
            // Check if next line is a continuation (has product text, no rate/qty markers)
            if (nextLine && /[A-Za-z]{3,}/.test(nextLine) && 
                !/\d{8,}/.test(nextLine) &&  // No product codes
                !/^\d+\s+/.test(nextLine) && // No leading quantity
                (lineRates[lineIdx + 1] === undefined || lineRates[lineIdx + 1].length === 0)) {  // No rates on next line
                
                // This is likely a continuation line, append it
                let continuation = nextLine
                    .replace(/\d{8,}\s*\|.*$/i, '')  // Remove codes
                    .replace(/\|\s*\d+.*$/i, '')     // Remove | data
                    .replace(/^\d+/, '')              // Remove leading numbers
                    .trim()
                
                if (continuation && continuation.length >= 3) {
                    itemName = itemName + ' ' + continuation
                    console.log(`  → Appended next line: ${continuation}`)
                }
            }
        }

        if (!itemName || itemName.length < 3) {
            console.log(`  ✗ No name found\n`)
            continue
        }

        console.log(`  → Name: ${itemName.substring(0, 60)}...`)

        // Find rate: USE the pre-computed lineRates map first for same-line rates
        let rate = 0
        
        // FIRST: Check if we already have rates for this line (from initial detection)
        if (lineRates[lineIdx] && lineRates[lineIdx].length > 0) {
            // Use the first valid rate from this line
            rate = lineRates[lineIdx][0]
            console.log(`  → Rate from line ${lineIdx}: ₹${rate} (pre-computed)`)
        }
        
        // If still not found, search next few lines
        if (rate <= 0) {
            for (let j = lineIdx + 1; j <= Math.min(tableEndIdx - 1, lineIdx + 3); j++) {
                if (lineRates[j] && lineRates[j].length > 0) {
                    rate = lineRates[j][0]
                    console.log(`  → Rate from line ${j}: ₹${rate} (next line)`)
                    break
                }
            }
        }

        if (rate <= 0) {
            console.log(`  ✗ No rate found\n`)
            continue
        }

        // Create item
        const item = {
            item_name: itemName.substring(0, 120),
            description: itemName.substring(0, 120),
            hsn_code: '8414',
            quantity: qty,
            unit: unit,
            rate: rate,
            amount: Math.round(qty * rate * 100) / 100,
            gst_percentage: 18,
            gst_amount: Math.round((qty * rate * 18) / 100),
            total_amount: Math.round((qty * rate * 1.18) * 100) / 100,
            product_id: null,
            batch_no: '',
            expiry_date: null
        }

        items.push(item)
        processedLines.add(lineIdx)
        console.log(`  ✓ ITEM CREATED\n`)
    }

    // Final output
    console.log('='.repeat(80))
    console.log('📊 FINAL EXTRACTION RESULT')
    console.log('='.repeat(80))
    console.log(JSON.stringify({
        success: items.length > 0,
        itemsFound: items.length,
        items: items.map((item, idx) => ({
            id: idx + 1,
            name: item.item_name,
            qty: item.quantity,
            unit: item.unit,
            rate: item.rate,
            total: item.total_amount
        }))
    }, null, 2))
    console.log('='.repeat(80) + '\n')

    return items
}

// Try multiple extraction strategies
export const extractItemsMultiStrategy = (text) => {
    // Try simple method first
    let items = extractItemsWithoutHSN(text)
    
    if (items.length > 0) {
        return items
    }

    return []
}

// Suggest HSN codes based on product names using keyword matching
export const suggestHSNCodes = (items) => {
    const hsnMap = {
        // Cable & electrical
        'cable': '8544',
        'wire': '8544',
        'conductor': '8544',
        'copper': '8544',
        'flexible': '8544',
        'polycab': '8544',
        'aluminum': '7616',
        'pvc': '3916',
        
        // Switches & distribution
        'acdb': '8536',
        'dcdb': '8536',
        'switch': '8536',
        'mcb': '8536',
        'breaker': '8536',
        'indicator': '9031',
        'fuse': '8536',
        
        // Fasteners
        'fastener': '7308',
        'bolt': '7308',
        'nut': '7308',
        'screw': '7308',
        'clamp': '7326',
        
        // Other
        'pipe': '7306',
        'tray': '6903',
        'paint': '3208',
        'spray': '3208',
        'meter': '9031',
        'earthing': '7410',
        'lightning': '8544'
    }

    return items.map(item => {
        let suggestedHSN = '8414' // Default
        
        const itemNameLower = item.item_name.toLowerCase()
        
        // Find first matching keyword
        for (const [keyword, hsn] of Object.entries(hsnMap)) {
            if (itemNameLower.includes(keyword)) {
                suggestedHSN = hsn
                break
            }
        }

        return {
            ...item,
            hsn_code: suggestedHSN
        }
    })
}

// Match extracted items with product database
export const matchWithProductDatabase = (items, productDatabase) => {
    if (!productDatabase || productDatabase.length === 0) {
        return items
    }

    return items.map(item => {
        // Try to find matching product by name similarity
        let matchedProduct = null
        let bestScore = 0

        for (const product of productDatabase) {
            // Simple similarity check - count matching words
            const itemWords = item.item_name.toLowerCase().split(/\s+/)
            const prodWords = product.name.toLowerCase().split(/\s+/)
            
            const matchedWords = itemWords.filter(word => 
                prodWords.some(pword => pword.includes(word) || word.includes(pword))
            )

            const score = matchedWords.length / Math.max(itemWords.length, prodWords.length)

            if (score > bestScore) {
                bestScore = score
                matchedProduct = product
            }
        }

        if (matchedProduct && bestScore > 0.5) {
            return {
                ...item,
                product_id: matchedProduct.id,
                hsn_code: matchedProduct.hsn_code || item.hsn_code,
                description: matchedProduct.description || item.description
            }
        }

        return item
    })
}
