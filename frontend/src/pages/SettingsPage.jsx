import { useState, useEffect } from 'react'
import { isValidPhone } from '../utils/validation'
import { useAuthStore } from '../context/authStore'
import { authService, franchiseService } from '../services/services'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [franchiseLoading, setFranchiseLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // General settings state (not persisted currently)
  const [generalSettings, setGeneralSettings] = useState({
    invoicePrefix: 'QT-',
    defaultGst: 18,
    currency: 'INR'
  })

  // Franchise Settings
  const [franchiseData, setFranchiseData] = useState({
    name: '',
    company_name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    gst_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: ''
  })

  useEffect(() => {
    // Always load franchise data on mount so details persist across refresh
    fetchFranchiseData()
  }, [])

  useEffect(() => {
    // when franchise data arrives we can populate general settings as well
    if (franchiseData) {
      setGeneralSettings(prev => ({
        invoicePrefix: franchiseData.invoice_prefix || prev.invoicePrefix,
        defaultGst: franchiseData.default_gst ?? prev.defaultGst,
        currency: franchiseData.currency || prev.currency
      }))
    }
  }, [franchiseData])

  const fetchFranchiseData = async () => {
    try {
      setFranchiseLoading(true)
      const response = await franchiseService.getById(1)
      if (response.success && response.data) {
        setFranchiseData(response.data)
      }
    } catch (error) {
      toast.error('Failed to load franchise details')
      console.error(error)
    } finally {
      setFranchiseLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      setLoading(true)
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      toast.error(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleFranchiseChange = (e) => {
    const { name, value } = e.target
    setFranchiseData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveGeneralSettings = async (e) => {
    e?.preventDefault()
    try {
      setLoading(true)
      // persist into franchise record (requires new columns in DB)
      const payload = {
        invoice_prefix: generalSettings.invoicePrefix,
        default_gst: generalSettings.defaultGst,
        currency: generalSettings.currency
      }
      const response = await franchiseService.update(1, payload)
      if (response.success) {
        toast.success('General settings saved successfully')
      } else {
        toast.error(response.message || 'Failed to save general settings')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save general settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFranchiseSettings = async (e) => {
    e.preventDefault()

    if (!franchiseData.name || !franchiseData.company_name) {
      toast.error('Name and Company Name are required')
      return
    }

    if (franchiseData.phone && !isValidPhone(franchiseData.phone)) {
      toast.error('Please enter a valid phone/mobile number (10-15 digits).')
      return
    }

    try {
      setFranchiseLoading(true)
      await franchiseService.update(1, franchiseData)
      toast.success('Franchise settings saved successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to save franchise settings')
    } finally {
      setFranchiseLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-3 transition ${activeTab === 'general'
                  ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-semibold'
                  : 'hover:bg-gray-50'
                  }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setActiveTab('franchise')}
                className={`w-full text-left px-4 py-3 transition ${activeTab === 'franchise'
                  ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-semibold'
                  : 'hover:bg-gray-50'
                  }`}
              >
                Franchise Details
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full text-left px-4 py-3 transition ${activeTab === 'account'
                  ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-semibold'
                  : 'hover:bg-gray-50'
                  }`}
              >
                Account
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 transition ${activeTab === 'security'
                  ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-semibold'
                  : 'hover:bg-gray-50'
                  }`}
              >
                Security
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneralSettings} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                  <input
                    type="text"
                    defaultValue="Solarwala Inventory"
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-sm text-gray-500 mt-1">Application name</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>IST (India)</option>
                    <option>UTC</option>
                    <option>EST (US)</option>
                    <option>PST (US)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Spanish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                  <input
                    type="text"
                    value={generalSettings.invoicePrefix}
                    onChange={e => setGeneralSettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. QT-"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default GST %</label>
                  <input
                    type="number"
                    value={generalSettings.defaultGst}
                    onChange={e => setGeneralSettings(prev => ({ ...prev, defaultGst: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={generalSettings.currency}
                    onChange={e => setGeneralSettings(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {/* Franchise Settings */}
          {activeTab === 'franchise' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Franchise Details</h2>
              {franchiseLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading franchise details...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveFranchiseSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Franchise Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={franchiseData.name || ''}
                        onChange={handleFranchiseChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Solarwala"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name*</label>
                      <input
                        type="text"
                        name="company_name"
                        value={franchiseData.company_name || ''}
                        onChange={handleFranchiseChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Solarwala Pvt Ltd"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={franchiseData.address || ''}
                      onChange={handleFranchiseChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={franchiseData.city || ''}
                        onChange={handleFranchiseChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        name="state"
                        value={franchiseData.state || ''}
                        onChange={handleFranchiseChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                      <input
                        type="text"
                        name="postal_code"
                        value={franchiseData.postal_code || ''}
                        onChange={handleFranchiseChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="XXXXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={franchiseData.phone || ''}
                        onChange={handleFranchiseChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+91-9999999999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={franchiseData.email || ''}
                        onChange={handleFranchiseChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      name="gst_number"
                      value={franchiseData.gst_number || ''}
                      onChange={handleFranchiseChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="18AABCU9603R1Z5"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={franchiseLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                      {franchiseLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Account ID:</strong> {user?.id || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-900 mt-2">
                    <strong>Member Since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>

              <div className="space-y-6">
                {/* Change Password */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password*</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password*</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password*</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                {/* Two-Factor Authentication */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Security & Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
