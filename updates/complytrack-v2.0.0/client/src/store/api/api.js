import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setCredentials, setAccessToken, logout } from '../slices/authSlice'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401 && !extraOptions?._skipReauth) {
    const refreshResult = await baseQuery({ url: '/auth/refresh-token', method: 'POST' }, api, { ...extraOptions, _retry: true })

    if (refreshResult.data?.accessToken) {
      api.dispatch(setAccessToken(refreshResult.data.accessToken))
      if (refreshResult.data.user) {
        api.dispatch(setCredentials(refreshResult.data))
      }
      result = await baseQuery(args, api, extraOptions)
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Compliance', 'ComplianceStats', 'User', 'Template',
    'Report', 'Alert', 'Dashboard', 'Risk', 'Contract', 'Organization', 'Notice', 'Questionnaire', 'SectorPdf', 'Developer', 'Comment', 'License', 'Update', 'MainServer', 'Trial'
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials })
    }),
    register: builder.mutation({
      query: (data) => ({ url: '/auth/register', method: 'POST', body: data })
    }),
    getProfile: builder.query({
      query: () => '/auth/me',
      providesTags: ['User']
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/auth/profile', method: 'PUT', body: data }),
      invalidatesTags: ['User']
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/change-password', method: 'POST', body: data })
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      extraOptions: { _skipReauth: true }
    }),

    getComplianceItems: builder.query({
      query: (params) => ({ url: '/compliance', params }),
      providesTags: ['Compliance']
    }),
    getComplianceItem: builder.query({
      query: (id) => `/compliance/${id}`,
      providesTags: (result, error, id) => [{ type: 'Compliance', id }]
    }),
    createComplianceItem: builder.mutation({
      query: (data) => ({ url: '/compliance', method: 'POST', body: data }),
      invalidatesTags: ['Compliance', 'ComplianceStats', 'Dashboard']
    }),
    updateComplianceItem: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/compliance/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => ['Compliance', 'ComplianceStats', 'Dashboard', { type: 'Compliance', id }]
    }),
    deleteComplianceItem: builder.mutation({
      query: (id) => ({ url: `/compliance/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Compliance', 'ComplianceStats', 'Dashboard']
    }),
    updateComplianceStatus: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/compliance/${id}/status`, method: 'PATCH', body: data }),
      invalidatesTags: (result, error, { id }) => ['Compliance', 'ComplianceStats', 'Dashboard', { type: 'Compliance', id }]
    }),
    getComplianceStats: builder.query({
      query: () => '/compliance/stats',
      providesTags: ['ComplianceStats']
    }),
    bulkCreateFromTemplate: builder.mutation({
      query: (data) => ({ url: '/compliance/bulk-from-template', method: 'POST', body: data }),
      invalidatesTags: ['Compliance', 'ComplianceStats']
    }),

    assignComplianceUsers: builder.mutation({
      query: ({ id, assignedTo }) => ({ url: `/compliance/${id}/assign`, method: 'PATCH', body: { assignedTo } }),
      invalidatesTags: (result, error, { id }) => ['Compliance', { type: 'Compliance', id }]
    }),
    bulkAssignCompliance: builder.mutation({
      query: ({ complianceIds, assignedTo }) => ({ url: '/compliance/bulk-assign', method: 'POST', body: { complianceIds, assignedTo } }),
      invalidatesTags: ['Compliance', 'ComplianceStats']
    }),
    uploadComplianceProof: builder.mutation({
      query: ({ id, formData }) => ({ url: `/compliance/${id}/proof`, method: 'POST', body: formData, formData: true }),
      invalidatesTags: (result, error, { id }) => ['Compliance', { type: 'Compliance', id }]
    }),

    getComments: builder.query({
      query: (complianceId) => `/compliance-comments/${complianceId}`,
      providesTags: ['Comment']
    }),
    addComment: builder.mutation({
      query: ({ complianceId, text }) => ({ url: `/compliance-comments/${complianceId}`, method: 'POST', body: { text } }),
      invalidatesTags: ['Comment']
    }),
    deleteComment: builder.mutation({
      query: (id) => ({ url: `/compliance-comments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Comment']
    }),

    getTemplates: builder.query({
      query: (params) => ({ url: '/templates', params }),
      providesTags: ['Template']
    }),
    getTemplate: builder.query({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Template', id }]
    }),
    createTemplate: builder.mutation({
      query: (data) => ({ url: '/templates', method: 'POST', body: data }),
      invalidatesTags: ['Template']
    }),
    updateTemplate: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/templates/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => ['Template', { type: 'Template', id }]
    }),
    deleteTemplate: builder.mutation({
      query: (id) => ({ url: `/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Template']
    }),
    seedTemplates: builder.mutation({
      query: () => ({ url: '/templates/seed', method: 'POST' }),
      invalidatesTags: ['Template']
    }),

    getReports: builder.query({
      query: (params) => ({ url: '/reports', params }),
      providesTags: ['Report']
    }),
    getReport: builder.query({
      query: (id) => `/reports/${id}`,
      providesTags: (result, error, id) => [{ type: 'Report', id }]
    }),
    generateReport: builder.mutation({
      query: (data) => ({ url: '/reports/generate', method: 'POST', body: data }),
      invalidatesTags: ['Report']
    }),
    deleteReport: builder.mutation({
      query: (id) => ({ url: `/reports/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Report']
    }),

    getAlerts: builder.query({
      query: (params) => ({ url: '/alerts', params }),
      providesTags: ['Alert']
    }),
    getUnreadCount: builder.query({
      query: () => '/alerts/unread-count',
      providesTags: ['Alert']
    }),
    markAlertRead: builder.mutation({
      query: (id) => ({ url: `/alerts/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Alert']
    }),
    markAllAlertsRead: builder.mutation({
      query: () => ({ url: '/alerts/mark-all-read', method: 'PATCH' }),
      invalidatesTags: ['Alert']
    }),
    generateDeadlineAlerts: builder.mutation({
      query: () => ({ url: '/alerts/generate-deadline-alerts', method: 'POST' }),
      invalidatesTags: ['Alert']
    }),
    deleteAlert: builder.mutation({
      query: (id) => ({ url: `/alerts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Alert']
    }),

    getDashboardSummary: builder.query({
      query: () => '/dashboard/summary',
      providesTags: ['Dashboard']
    }),
    getComplianceHealth: builder.query({
      query: () => '/dashboard/compliance-health',
      providesTags: ['Dashboard']
    }),
    getUpcomingDeadlines: builder.query({
      query: () => '/dashboard/upcoming-deadlines',
      providesTags: ['Dashboard']
    }),

    getRiskAssessments: builder.query({
      query: (params) => ({ url: '/risks', params }),
      providesTags: ['Risk']
    }),
    assessRisk: builder.mutation({
      query: (data) => ({ url: '/risks/assess', method: 'POST', body: data }),
      invalidatesTags: ['Risk', 'Compliance', 'ComplianceStats']
    }),
    getRiskSummary: builder.query({
      query: () => '/risks/summary',
      providesTags: ['Risk']
    }),
    updateRiskStatus: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/risks/${id}/status`, method: 'PATCH', body: data }),
      invalidatesTags: ['Risk']
    }),

    getContracts: builder.query({
      query: (params) => ({ url: '/contracts', params }),
      providesTags: ['Contract']
    }),
    getContract: builder.query({
      query: (id) => `/contracts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Contract', id }]
    }),
    createContract: builder.mutation({
      query: (data) => ({ url: '/contracts', method: 'POST', body: data }),
      invalidatesTags: ['Contract']
    }),
    updateContract: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/contracts/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => ['Contract', { type: 'Contract', id }]
    }),
    deleteContract: builder.mutation({
      query: (id) => ({ url: `/contracts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Contract']
    }),
    getContractStats: builder.query({
      query: () => '/contracts/stats',
      providesTags: ['Contract']
    }),

    getOrganization: builder.query({
      query: () => '/organization',
      providesTags: ['Organization']
    }),
    updateOrganization: builder.mutation({
      query: (data) => ({ url: '/organization', method: 'PUT', body: data }),
      invalidatesTags: ['Organization']
    }),
    refreshHealthScore: builder.mutation({
      query: () => ({ url: '/organization/refresh-health-score', method: 'POST' }),
      invalidatesTags: ['Organization', 'Dashboard']
    }),

    uploadDocument: builder.mutation({
      query: (formData) => ({
        url: '/verification/upload',
        method: 'POST',
        body: formData,
        formData: true
      }),
      invalidatesTags: ['Organization']
    }),
    getVerificationStatus: builder.query({
      query: () => '/verification/status',
      providesTags: ['Organization']
    }),
    reviewDocument: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/verification/review/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['Organization']
    }),
    devBypass: builder.mutation({
      query: () => ({
        url: '/verification/dev-bypass',
        method: 'POST'
      }),
      invalidatesTags: ['Organization']
    }),
    getSectorHelp: builder.query({
      query: (sector) => `/verification/help/${sector}`
    }),
    getHelpContent: builder.query({
      query: (sector) => `/verification/help-content/${sector}`
    }),

    getOnboardingRequirements: builder.query({
      query: () => '/onboarding/requirements',
      providesTags: ['Organization']
    }),
    getOnboardingHelp: builder.query({
      query: ({ sector, industry }) => ({
        url: '/onboarding/help',
        params: { sector, industry }
      })
    }),
    getDocumentDetail: builder.query({
      query: ({ sector, docType }) => `/onboarding/help/${sector}/${docType}`
    }),

    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User']
    }),
    createUser: builder.mutation({
      query: (data) => ({ url: '/users', method: 'POST', body: data }),
      invalidatesTags: ['User']
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/users/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['User']
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User']
    }),

    getCompanyReport: builder.query({
      query: () => '/users/company-report',
      providesTags: ['Organization', 'Compliance', 'User']
    }),

    getComplianceOptions: builder.query({
      query: () => '/compliance-setup/options',
      providesTags: ['Organization']
    }),
    saveComplianceSelection: builder.mutation({
      query: (data) => ({ url: '/compliance-setup/save', method: 'POST', body: data }),
      invalidatesTags: ['Organization', 'Compliance', 'ComplianceStats']
    }),
    autoCreateCompliances: builder.mutation({
      query: () => ({ url: '/compliance-setup/auto-create', method: 'POST' }),
      invalidatesTags: ['Organization', 'Compliance', 'ComplianceStats', 'Dashboard']
    }),

    getNotices: builder.query({
      query: (params) => ({ url: '/notices', params }),
      providesTags: ['Notice']
    }),
    getNotice: builder.query({
      query: (id) => `/notices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Notice', id }]
    }),
    markNoticeRead: builder.mutation({
      query: (id) => ({ url: `/notices/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notice']
    }),
    markAllNoticesRead: builder.mutation({
      query: () => ({ url: '/notices/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notice']
    }),
    deleteNotice: builder.mutation({
      query: (id) => ({ url: `/notices/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notice']
    }),

    getQuestions: builder.query({
      query: () => '/questionnaire/questions',
      providesTags: ['Questionnaire']
    }),
    saveAnswers: builder.mutation({
      query: (data) => ({ url: '/questionnaire/save', method: 'POST', body: data }),
      invalidatesTags: ['Questionnaire', 'Organization', 'Compliance']
    }),
    getImpact: builder.query({
      query: () => '/questionnaire/impact',
      providesTags: ['Questionnaire']
    }),

    getSectorPdfs: builder.query({
      query: () => '/sector-pdfs',
      providesTags: ['SectorPdf']
    }),
    generateSectorPdfs: builder.mutation({
      query: () => ({ url: '/sector-pdfs/generate', method: 'POST' }),
      invalidatesTags: ['SectorPdf']
    }),

    getDeveloperStats: builder.query({
      query: () => '/developer/stats',
      providesTags: ['Developer']
    }),
    getDeveloperOrganizations: builder.query({
      query: (params) => ({ url: '/developer/organizations', params }),
      providesTags: ['Developer']
    }),
    getDeveloperOrganizationDetails: builder.query({
      query: (id) => `/developer/organizations/${id}`,
      providesTags: ['Developer']
    }),
    getDeveloperCompliance: builder.query({
      query: (params) => ({ url: '/developer/compliance', params }),
      providesTags: ['Developer']
    }),
    getDeveloperAlerts: builder.query({
      query: (params) => ({ url: '/developer/alerts', params }),
      providesTags: ['Developer']
    }),
    getDeveloperPendingVerifications: builder.query({
      query: (params) => ({ url: '/verification/all', params }),
      providesTags: ['Developer']
    }),

    getLicenseStatus: builder.query({
      query: () => '/license/status',
      providesTags: ['License']
    }),
    activateLicense: builder.mutation({
      query: (data) => ({ url: '/license/activate', method: 'POST', body: data }),
      invalidatesTags: ['License']
    }),
    validateLicenseKey: builder.mutation({
      query: (data) => ({ url: '/license/validate', method: 'POST', body: data })
    }),
    getAllLicenses: builder.query({
      query: () => '/license/all',
      providesTags: ['License']
    }),
    revokeLicense: builder.mutation({
      query: ({ id, reason }) => ({ url: `/license/${id}/revoke`, method: 'POST', body: { reason } }),
      invalidatesTags: ['License']
    }),

    // Update endpoints (main server)
    getUpdateStatus: builder.query({
      query: () => '/updates/status',
      providesTags: ['Update']
    }),
    checkForUpdates: builder.mutation({
      query: (data) => ({ url: '/updates/check', method: 'POST', body: data }),
      invalidatesTags: ['Update']
    }),
    applyUpdate: builder.mutation({
      query: (data) => ({ url: '/updates/apply', method: 'POST', body: data }),
      invalidatesTags: ['Update']
    }),
    getUpdateChangelog: builder.query({
      query: (params) => ({ url: '/updates/changelog', params }),
      providesTags: ['Update']
    }),

    // Main server connection monitoring
    getMainServerStatus: builder.query({
      query: () => '/main-server/status',
      providesTags: ['MainServer']
    }),
    refreshMainServerStatus: builder.mutation({
      query: () => ({ url: '/main-server/refresh', method: 'POST' }),
      invalidatesTags: ['MainServer']
    }),

    // Trial status
    getTrialStatus: builder.query({
      query: () => '/trial/status',
      providesTags: ['Trial']
    })
  })
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useLogoutMutation,

  useGetComplianceItemsQuery,
  useGetComplianceItemQuery,
  useCreateComplianceItemMutation,
  useUpdateComplianceItemMutation,
  useDeleteComplianceItemMutation,
  useUpdateComplianceStatusMutation,
  useGetComplianceStatsQuery,
  useBulkCreateFromTemplateMutation,

  useAssignComplianceUsersMutation,
  useBulkAssignComplianceMutation,
  useUploadComplianceProofMutation,

  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,

  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useSeedTemplatesMutation,

  useGetReportsQuery,
  useGetReportQuery,
  useGenerateReportMutation,
  useDeleteReportMutation,

  useGetAlertsQuery,
  useGetUnreadCountQuery,
  useMarkAlertReadMutation,
  useMarkAllAlertsReadMutation,
  useGenerateDeadlineAlertsMutation,
  useDeleteAlertMutation,

  useGetDashboardSummaryQuery,
  useGetComplianceHealthQuery,
  useGetUpcomingDeadlinesQuery,

  useGetRiskAssessmentsQuery,
  useAssessRiskMutation,
  useGetRiskSummaryQuery,
  useUpdateRiskStatusMutation,

  useGetContractsQuery,
  useGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
  useGetContractStatsQuery,

  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useRefreshHealthScoreMutation,

  useUploadDocumentMutation,
  useGetVerificationStatusQuery,
  useReviewDocumentMutation,
  useDevBypassMutation,
  useGetSectorHelpQuery,
  useGetHelpContentQuery,

  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,

  useGetCompanyReportQuery,

  useGetComplianceOptionsQuery,
  useSaveComplianceSelectionMutation,
  useAutoCreateCompliancesMutation,

  useGetNoticesQuery,
  useGetNoticeQuery,
  useMarkNoticeReadMutation,
  useMarkAllNoticesReadMutation,
  useDeleteNoticeMutation,

  useGetQuestionsQuery,
  useSaveAnswersMutation,
  useGetImpactQuery,

  useGetSectorPdfsQuery,
  useGenerateSectorPdfsMutation,

  useGetDeveloperStatsQuery,
  useGetDeveloperOrganizationsQuery,
  useGetDeveloperOrganizationDetailsQuery,
  useGetDeveloperComplianceQuery,
  useGetDeveloperAlertsQuery,
  useGetDeveloperPendingVerificationsQuery,

  useGetOnboardingRequirementsQuery,
  useGetOnboardingHelpQuery,
  useGetDocumentDetailQuery,

  useGetLicenseStatusQuery,
  useActivateLicenseMutation,
  useValidateLicenseKeyMutation,
  useGetAllLicensesQuery,
  useRevokeLicenseMutation,

  useGetUpdateStatusQuery,
  useCheckForUpdatesMutation,
  useApplyUpdateMutation,
  useGetUpdateChangelogQuery,

  useGetMainServerStatusQuery,
  useRefreshMainServerStatusMutation,

  useGetTrialStatusQuery
} = api
