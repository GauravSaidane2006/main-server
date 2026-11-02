import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGetCustomersQuery, useToggleCustomerActiveMutation, useDeleteCustomerMutation } from '../store/api/api'

const formatRelative = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAll, setShowAll] = useState(true)

  const { data, isLoading } = useGetCustomersQuery({
    page,
    limit: 20,
    search,
    isActive: showAll ? undefined : true
  })

  const [toggleActive] = useToggleCustomerActiveMutation()
  const [deleteCustomer] = useDeleteCustomerMutation()

  const handleToggle = async (id) => {
    if (confirm('Toggle customer active status?')) {
      await toggleActive(id)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this customer? This cannot be undone.')) {
      await deleteCustomer(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1">Manage registered customer servers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search customers..."
          className="flex-1 max-w-md px-4 py-2 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary"
        />
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => { setShowAll(e.target.value); setPage(1) }}
            className="rounded"
          />
          Show all
        </label>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-bg-mid rounded-xl border border-bg-light overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data?.customers?.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-light">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Organization</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Tier</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Version</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Connection</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((customer) => (
                <tr key={customer._id} className="border-b border-bg-light/50 hover:bg-bg-dark/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{customer.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{customer.email}</td>
                  <td className="px-6 py-4 text-gray-400">{customer.organizationName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                      {customer.licenseTier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    v{customer.currentVersion?.server || '1.0.0'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                      customer.connectionStatus === 'online' ? 'bg-secondary/20 text-secondary' :
                      customer.connectionStatus === 'offline' ? 'bg-danger/20 text-danger' :
                      'bg-bg-light text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        customer.connectionStatus === 'online' ? 'bg-secondary animate-pulse' :
                        customer.connectionStatus === 'offline' ? 'bg-danger' : 'bg-gray-400'
                      }`} />
                      {customer.connectionStatus === 'online' ? 'Online' :
                       customer.connectionStatus === 'offline' ? 'Offline' : 'Unknown'}
                    </span>
                    {customer.lastHeartbeat && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {formatRelative(customer.lastHeartbeat)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      customer.isActive
                        ? 'bg-secondary/20 text-secondary'
                        : 'bg-danger/20 text-danger'
                    }`}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggle(customer._id)}
                      className="text-sm text-gray-400 hover:text-white transition-colors mr-3"
                    >
                      {customer.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(customer._id)}
                      className="text-sm text-danger hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-400">No customers found</div>
        )}
      </motion.div>

      {/* Pagination */}
      {data?.pagination?.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded ${
                p === page ? 'bg-primary text-white' : 'bg-bg-mid text-gray-400 hover:bg-bg-light'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
