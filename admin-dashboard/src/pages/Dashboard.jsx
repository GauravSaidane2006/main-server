import { motion } from 'framer-motion'
import { useGetDashboardQuery, useGetStatsQuery } from '../store/api/api'

const StatCard = ({ label, value, icon, color = 'primary', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`bg-bg-mid rounded-xl p-6 border border-bg-light`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </div>
  </motion.div>
)

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboardQuery()
  const { data: stats } = useGetStatsQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  const overview = dashboard?.overview || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your system</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Customers" value={overview.totalCustomers || 0} icon="👥" delay={0} />
        <StatCard label="Active Customers" value={overview.activeCustomers || 0} icon="✅" color="secondary" delay={0.1} />
        <StatCard label="Recent Updates" value={overview.recentUpdates || 0} icon="🔄" color="accent" delay={0.2} />
        <StatCard label="Latest Version" value={`v${overview.latestVersion || '1.0.0'}`} icon="📦" color="primary" delay={0.3} />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-mid rounded-xl border border-bg-light"
        >
          <div className="p-6 border-b border-bg-light">
            <h2 className="text-lg font-semibold text-white">Recent Customers</h2>
          </div>
          <div className="p-6">
            {dashboard?.recentCustomersList?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentCustomersList.map((customer, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-bg-dark rounded-lg">
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="text-gray-400 text-sm">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        customer.isActive ? 'bg-secondary/20 text-secondary' : 'bg-danger/20 text-danger'
                      }`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <p className="text-gray-500 text-xs mt-1">{customer.licenseTier}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No customers yet</p>
            )}
          </div>
        </motion.div>

        {/* Recent updates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-bg-mid rounded-xl border border-bg-light"
        >
          <div className="p-6 border-b border-bg-light">
            <h2 className="text-lg font-semibold text-white">Recent Updates</h2>
          </div>
          <div className="p-6">
            {dashboard?.customerUpdates?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.customerUpdates.map((update, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-bg-dark rounded-lg">
                    <div>
                      <p className="text-white font-medium">{update.name}</p>
                      <p className="text-gray-400 text-sm">
                        v{update.currentVersion?.server || '1.0.0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        {update.lastUpdateApplied
                          ? new Date(update.lastUpdateApplied).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No updates recorded</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Registration trends */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-bg-mid rounded-xl border border-bg-light p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Registration Trends</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-bg-dark rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.registrations?.last24h || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Last 24 hours</p>
            </div>
            <div className="text-center p-4 bg-bg-dark rounded-lg">
              <p className="text-2xl font-bold text-secondary">{stats.registrations?.last7d || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Last 7 days</p>
            </div>
            <div className="text-center p-4 bg-bg-dark rounded-lg">
              <p className="text-2xl font-bold text-accent">{stats.registrations?.last30d || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Last 30 days</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
