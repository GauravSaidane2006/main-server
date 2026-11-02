import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  admin: null,
  token: localStorage.getItem('admin_token') || null,
  isAuthenticated: !!localStorage.getItem('admin_token')
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.admin = action.payload.admin
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('admin_token', action.payload.token)
    },
    logout: (state) => {
      state.admin = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('admin_token')
    }
  }
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
