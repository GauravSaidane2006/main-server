import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { useLoginMutation } from '../store/api/api'
import { setCredentials } from '../store/slices/authSlice'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const result = await login({ email, password }).unwrap()
      dispatch(setCredentials(result))
    } catch (err) {
      setError(err.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-bg-mid rounded-2xl shadow-2xl border border-bg-light p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">🔐 ComplyTrack</h1>
            <p className="text-gray-400 mt-2">Admin Dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="admin@complytrack.io"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
