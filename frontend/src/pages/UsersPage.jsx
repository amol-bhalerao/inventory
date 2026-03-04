import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react'
import { userService } from '../services/services'
import { franchiseService } from '../services/services'
import { useAuthStore } from '../context/authStore'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState([])
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    role: user?.role === 'Super Admin' ? 'Franchise Owner' : 'Staff',
    franchiseId: user?.role === 'Super Admin' ? '' : user?.franchiseId,
    status: 'active'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch franchises first (for Super Admin dropdown)
      if (user?.role === 'Super Admin') {
        try {
          const franchiseResponse = await franchiseService.getAll()
          if (franchiseResponse && franchiseResponse.success) {
            setFranchises(franchiseResponse.data || [])
          } else if (franchiseResponse && franchiseResponse.data) {
            // Some responses have data but not success flag
            setFranchises(Array.isArray(franchiseResponse.data) ? franchiseResponse.data : [])
          }
        } catch (error) {
          console.error('Error fetching franchises:', error)
          setFranchises([])
        }
      }
      
      // Fetch users
      let userResponse
      if (user?.role === 'Super Admin') {
        userResponse = await userService.getAll()
      } else {
        userResponse = await userService.getByFranchise(user?.franchiseId)
      }
      
      if (userResponse && userResponse.success) {
        setUsers(userResponse.data || [])
      } else {
        toast.error(userResponse?.message || 'Failed to load users')
      }
    } catch (error) {
      console.error('Data fetch error:', error)
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await userService.update(editingId, formData)
        toast.success('User updated successfully')
      } else {
        await userService.create(formData)
        toast.success('User created successfully')
      }
      setFormData({
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        role: 'Franchise Owner',
        status: 'active'
      })
      setEditingId(null)
      setShowForm(false)
      fetchData()
    } catch (error) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (userData) => {
    setEditingId(userData.id)
    setFormData({
      firstname: userData.first_name || userData.firstname || '',
      lastname: userData.last_name || userData.lastname || '',
      email: userData.email,
      password: '',
      role: userData.role || (user?.role === 'Super Admin' ? 'Franchise Owner' : 'Staff'),
      franchiseId: userData.franchise_id || userData.franchiseId || user?.franchiseId || '',
      status: userData.is_active ? 'active' : 'inactive'
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.delete(id)
        toast.success('User deleted successfully')
        fetchData()
      } catch (error) {
        toast.error(error.message || 'Failed to delete user')
      }
    }
  }

  const toggleUserStatus = async (user) => {
    try {
      if (user.status === 'active') {
        await userService.deactivate(user.id)
        toast.success('User deactivated')
      } else {
        await userService.activate(user.id)
        toast.success('User activated')
      }
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to update user status')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      role: user?.role === 'Super Admin' ? 'Franchise Owner' : 'Staff',
      franchiseId: user?.role === 'Super Admin' ? '' : user?.franchiseId,
      status: 'active'
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Add New'} User</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name*</label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editingId ? 'New Password (leave empty to keep current)' : 'Password*'}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 transition"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {user?.role === 'Super Admin' ? (
                    <>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Franchise Owner">Franchise Owner</option>
                    </>
                  ) : (
                    <>
                      <option value="Manager">Manager</option>
                      <option value="Staff">Staff</option>
                    </>
                  )}
                </select>
              </div>
              {user?.role === 'Super Admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Franchise*</label>
                  <select
                    name="franchiseId"
                    value={formData.franchiseId}
                    onChange={handleInputChange}
                    required={user?.role === 'Super Admin'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Franchise</option>
                    {franchises.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Update' : 'Create'} User
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Email</th>
                {user?.role === 'Super Admin' && (
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Franchise</th>
                )}
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'Super Admin' ? '6' : '5'} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((userData) => (
                  <tr key={userData.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">
                      {userData.first_name || userData.firstname} {userData.last_name || userData.lastname}
                    </td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{userData.email}</td>
                    {user?.role === 'Super Admin' && (
                      <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          {userData.franchise || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {userData.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        userData.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleUserStatus(userData)}
                          className={`p-2 rounded-lg transition ${
                            userData.status === 'active'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={`${userData.status === 'active' ? 'Deactivate' : 'Activate'} user`}
                        >
                          {userData.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleEdit(userData)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(userData.id)}
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
    </div>
  )
}
