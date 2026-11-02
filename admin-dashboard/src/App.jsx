import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Versions from './pages/Versions'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth)

  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<Customers />} />
          <Route path="versions" element={<Versions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
