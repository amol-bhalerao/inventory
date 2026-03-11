import apiClient from './api'
import { gstLookupService } from './gstLookup'

export const authService = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken })
}

export const franchiseService = {
  getAll: async (limit, offset) => {
    const response = await apiClient.get('/franchises', { params: { limit, offset } })
    return response
  },
  getById: (id) => apiClient.get(`/franchises/${id}`),
  create: (data) => apiClient.post('/franchises', data),
  update: (id, data) => apiClient.put(`/franchises/${id}`, data),
  delete: (id) => apiClient.delete(`/franchises/${id}`),
  changeAppName: (id, appName) => apiClient.patch(`/franchises/${id}/app-name`, { appName })
}

export const userService = {
  getAll: async () => {
    const response = await apiClient.get('/users')
    // backend returns { success, message, data: { users: [...] } }
    return { ...response, data: response?.data?.users || response?.users || [] }
  },
  getByFranchise: async (franchiseId) => {
    const response = await apiClient.get(`/users/franchise/${franchiseId}`)
    return { ...response, data: response?.data?.users || response?.users || [] }
  },
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  activate: (id) => apiClient.patch(`/users/${id}/activate`),
  deactivate: (id) => apiClient.patch(`/users/${id}/deactivate`)
}

export const productService = {
  getAll: async (limit, offset) => {
    // Accept either (limit, offset) or a single object { limit, offset }
    if (typeof limit === 'object' && limit !== null) {
      const paramsObj = limit
      limit = paramsObj.limit
      offset = paramsObj.offset
    }
    const response = await apiClient.get('/products', { params: { limit, offset } })
    // apiClient returns response.data; backend returns { success, message, data: { products: [...] } }
    // support both shapes: response.products OR response.data.products
    return { ...response, data: response?.data?.products || response?.products || [] }
  },
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
  getLowStock: () => apiClient.get('/products/low-stock')
}

export const invoiceService = {
  getAll: async (filters) => {
    const response = await apiClient.get('/invoices', { params: filters })
    // support various shapes: { data: { invoices: [...] } } or { invoices: [...] } or data as array
    const invoices = response?.data?.invoices || response?.invoices || (Array.isArray(response?.data) ? response.data : [])
    return { ...response, data: invoices }
  },
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.put(`/invoices/${id}`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}`),
  getRevenueReport: (startDate, endDate) => apiClient.get('/invoices/report/revenue', { params: { startDate, endDate } })
}

export const purchaseOrderService = {
  getAll: async (filters) => {
    const response = await apiClient.get('/purchase-orders', { params: filters })
    return { ...response, data: response?.purchaseOrders || [] }
  },
  getById: (id) => apiClient.get(`/purchase-orders/${id}`),
  create: (data) => apiClient.post('/purchase-orders', data),
  update: (id, data) => apiClient.put(`/purchase-orders/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/purchase-orders/${id}/status`, { status }),
  delete: (id) => apiClient.delete(`/purchase-orders/${id}`)
}

export const dashboardService = {
  getAdminDashboard: () => apiClient.get('/dashboard/admin'),
  getFranchiseDashboard: () => apiClient.get('/dashboard/franchise')
}

export const supplierService = {
  getAll: async (limit, offset) => {
    const response = await apiClient.get('/suppliers', { params: { limit, offset } })
    return { ...response, data: response?.suppliers || [] }
  },
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (data) => apiClient.post('/suppliers', data),
  update: (id, data) => apiClient.put(`/suppliers/${id}`, data),
  delete: (id) => apiClient.delete(`/suppliers/${id}`)
}

export const customerService = {
  getAll: async (limit, offset) => {
    const response = await apiClient.get('/customers', { params: { limit, offset } })
    return { ...response, data: response?.customers || [] }
  },
  getById: (id) => apiClient.get(`/customers/${id}`),
  getByGST: (gstNumber) => apiClient.get(`/customers/gst/${gstNumber}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data),
  delete: (id) => apiClient.delete(`/customers/${id}`)
}

export const purchaseBillService = {
  getAll: async (limit, offset) => {
    const response = await apiClient.get('/purchase-bills', { params: { limit, offset } })
    return { ...response, data: response?.data?.bills || [] }
  },
  getById: (id) => apiClient.get(`/purchase-bills/${id}`),
  create: (data) => apiClient.post('/purchase-bills', data),
  update: (id, data) => apiClient.put(`/purchase-bills/${id}`, data),
  approve: (id) => apiClient.patch(`/purchase-bills/${id}/approve`),
  delete: (id) => apiClient.delete(`/purchase-bills/${id}`)
}

export const quotationService = {
  getAll: async (filters) => {
    const response = await apiClient.get('/quotations', { params: filters })
    return { ...response, data: response?.quotations || [] }
  },
  getById: (id) => apiClient.get(`/quotations/${id}`),
  create: (data) => apiClient.post('/quotations', data),
  update: (id, data) => apiClient.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/quotations/${id}/status`, { status }),
  delete: (id) => apiClient.delete(`/quotations/${id}`),
  convertToInvoice: (id, invoiceNumber, invoiceDate) =>
    apiClient.post(`/quotations/${id}/convert-to-invoice`, { invoiceNumber, invoiceDate })
}

// GST Lookup Service Export
export { gstLookupService }
