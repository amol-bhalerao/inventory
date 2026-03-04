// GST Lookup Service - Integrates with public APIs and local database
import apiClient from './api'

export const gstLookupService = {
    // First check local database, then try public API
    searchByGST: async (gstNumber) => {
        try {
            // Step 1: Check in local database first
            const localResponse = await apiClient.get(`/customers/gst/${gstNumber}`)
            if (localResponse.success && localResponse.data) {
                return {
                    success: true,
                    data: localResponse.data,
                    source: 'local_database'
                }
            }
        } catch (error) {
            // Not found in local DB, try API
        }

        try {
            // Step 2: Try public GST API - using mock data for demo
            // In production, integrate with real GST API
            const apiResponse = await gstLookupService.fetchFromPublicAPI(gstNumber)
            return apiResponse
        } catch (error) {
            return {
                success: false,
                message: 'GST number not found in database or API',
                data: null
            }
        }
    },

    // Mock public API response (replace with real API call)
    fetchFromPublicAPI: async (gstNumber) => {
        // This is a mock implementation
        // In production, integrate with:
        // 1. Indian GST API (requires registration)
        // 2. Third-party GST verification services
        // 3. Your own API that validates with government database

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Mock data for demonstration
                const mockDatabase = {
                    '29AABCT1234H1Z0': {
                        gst_number: '29AABCT1234H1Z0',
                        business_name: 'Acme Corporation Private Limited',
                        legalName: 'Acme Corporation Private Limited',
                        email: 'contact@acme.com',
                        phone: '9876543210',
                        address: '123 Business Street',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        country: 'India',
                        postal_code: '400001'
                    },
                    '18AABCT1234H1Z0': {
                        gst_number: '18AABCT1234H1Z0',
                        business_name: 'TechFlow Solutions Ltd',
                        legalName: 'TechFlow Solutions Ltd',
                        email: 'info@techflow.com',
                        phone: '9988776655',
                        address: '456 Tech Park',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        country: 'India',
                        postal_code: '560001'
                    },
                    '27AABCT1234H1Z0': {
                        gst_number: '27AABCT1234H1Z0',
                        business_name: 'Green Energy Systems Pvt Ltd',
                        legalName: 'Green Energy Systems Pvt Ltd',
                        email: 'sales@greenenergy.com',
                        phone: '9123456789',
                        address: '789 Solar Avenue',
                        city: 'Hyderabad',
                        state: 'Telangana',
                        country: 'India',
                        postal_code: '500001'
                    }
                }

                if (mockDatabase[gstNumber]) {
                    resolve({
                        success: true,
                        data: mockDatabase[gstNumber],
                        source: 'gst_api',
                        message: 'Business details fetched from GST API'
                    })
                } else {
                    reject(new Error('GST number not found in public API'))
                }
            }, 500)
        })
    },

    // Save customer to local database
    saveToDatabase: async (customerData) => {
        try {
            const response = await apiClient.post('/customers', customerData)
            return response
        } catch (error) {
            throw error
        }
    },

    // Validate GST format (Indian GST format)
    validateGSTFormat: (gstNumber) => {
        // Indian GST format: 2 digits state + 10 digit PAN + 1 digit + 1 digit
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
        return gstRegex.test(gstNumber.toUpperCase())
    }
}
