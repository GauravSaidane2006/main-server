import { configureStore } from '@reduxjs/toolkit'
import { api } from './api/api'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer
  },
  middleware: (getDefault) =>
    getDefault().concat(api.middleware)
})
