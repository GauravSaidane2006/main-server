import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { logout } from '../store/slices/authSlice'
import { useGetProfileQuery } from '../store/api/api'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/versions', label: 'Versions', icon: '📦' }
]

export default function Layout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: admin } = useGetProfileQuery()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-bg-dark">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-mid border-r border-bg-light flex flex-col">
        <div className="p-6 border-b border-bg-light">
          <h1 className="text-xl font-bold text-white">🔐 ComplyTrack</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-gray-400 hover:bg-bg-light hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-bg-light">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {admin?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{admin?.role || 'admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors text-sm font-medium"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
