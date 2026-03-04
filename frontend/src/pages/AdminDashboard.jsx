import { useEffect, useState } from 'react'
import { dashboardService } from '../services/services'
import toast from 'react-hot-toast'
import { Building, Users, DollarSign, RefreshCw } from 'lucide-react'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    franchises: 0,
    users: 0,
    totalRevenue: 0,
    recentFranchises: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await dashboardService.getAdminDashboard()
      
      if (response && response.success) {
        setData(response.data || {
          franchises: 0,
          users: 0,
          totalRevenue: 0,
          recentFranchises: []
        })
      } else {
        // Use default data if API fails
        setData({
          franchises: 0,
          users: 0,
          totalRevenue: 0,
          recentFranchises: []
        })
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      // Don't show error toast, just use default data
      setData({
        franchises: 0,
        users: 0,
        totalRevenue: 0,
        recentFranchises: []
      })
    } finally {
      setLoading(false)
    }
  }

  const Skeleton = ({ className = '' }) => (
    <div className={`bg-gray-200 animate-pulse ${className}`}></div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-10 w-20" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-2">Total Franchises</h3>
              <p className="text-3xl font-bold text-gray-900">{data?.franchises || 0}</p>
            </div>
            <Building size={40} className="text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900">{data?.users || 0}</p>
            </div>
            <Users size={40} className="text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">${Number(data?.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <DollarSign size={40} className="text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Recent Franchises */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Franchises</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Franchise Name</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700 hidden md:table-cell">Email</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700 hidden lg:table-cell">Phone</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentFranchises && data.recentFranchises.length > 0 ? (
                data.recentFranchises.map((franchise) => (
                  <tr key={franchise.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 px-6 text-sm font-medium">{franchise.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 hidden md:table-cell">{franchise.email}</td>
                    <td className="py-4 px-6 text-sm hidden lg:table-cell">{franchise.phone || '-'}</td>
                    <td className="py-4 px-6 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        franchise.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {franchise.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 px-6 text-center text-gray-500">
                    No franchises found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
