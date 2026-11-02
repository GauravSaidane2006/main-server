import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setCredentials, logout } from '../slices/authSlice'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)
  if (result.error && result.error.status === 401) {
    api.dispatch(logout())
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Admin', 'Customer', 'Version', 'Dashboard'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/admin/login', method: 'POST', body: credentials }),
      invalidatesTags: ['Admin']
    }),
    getProfile: builder.query({
      query: () => '/admin/profile',
      providesTags: ['Admin']
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/admin/profile', method: 'PUT', body: data }),
      invalidatesTags: ['Admin']
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/admin/password', method: 'PUT', body: data })
    }),

    // Dashboard
    getDashboard: builder.query({
      query: () => '/dashboard/overview',
      providesTags: ['Dashboard']
    }),
    getStats: builder.query({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard']
    }),

    // Customers
    getCustomers: builder.query({
      query: (params) => ({ url: '/customers', params }),
      providesTags: ['Customer']
    }),
    getCustomer: builder.query({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Customer', id }]
    }),
    toggleCustomerActive: builder.mutation({
      query: (id) => ({ url: `/customers/${id}/toggle-active`, method: 'PATCH' }),
      invalidatesTags: ['Customer', 'Dashboard']
    }),
    updateCustomerLicense: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/customers/${id}/license`, method: 'PATCH', body: data }),
      invalidatesTags: ['Customer']
    }),
    deleteCustomer: builder.mutation({
      query: (id) => ({ url: `/customers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Customer', 'Dashboard']
    }),

    // Versions
    getVersions: builder.query({
      query: (params) => ({ url: '/versions', params }),
      providesTags: ['Version']
    }),
    createVersion: builder.mutation({
      query: (formData) => ({
        url: '/versions',
        method: 'POST',
        body: formData,
        formData: true
      }),
      invalidatesTags: ['Version', 'Dashboard']
    }),
    setLatestVersion: builder.mutation({
      query: (id) => ({ url: `/versions/${id}/set-latest`, method: 'PATCH' }),
      invalidatesTags: ['Version']
    }),
    deleteVersion: builder.mutation({
      query: (id) => ({ url: `/versions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Version', 'Dashboard']
    }),

    // Admins
    getAdmins: builder.query({
      query: () => '/admin',
      providesTags: ['Admin']
    }),
    createAdmin: builder.mutation({
      query: (data) => ({ url: '/admin', method: 'POST', body: data }),
      invalidatesTags: ['Admin']
    }),
    deleteAdmin: builder.mutation({
      query: (id) => ({ url: `/admin/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Admin']
    })
  })
})

export const {
  useLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetDashboardQuery,
  useGetStatsQuery,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useToggleCustomerActiveMutation,
  useUpdateCustomerLicenseMutation,
  useDeleteCustomerMutation,
  useGetVersionsQuery,
  useCreateVersionMutation,
  useSetLatestVersionMutation,
  useDeleteVersionMutation,
  useGetAdminsQuery,
  useCreateAdminMutation,
  useDeleteAdminMutation
} = api
