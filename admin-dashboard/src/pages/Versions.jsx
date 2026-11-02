import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGetVersionsQuery, useCreateVersionMutation, useSetLatestVersionMutation, useDeleteVersionMutation } from '../store/api/api'

export default function Versions() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    version: '',
    component: 'full',
    patchNotes: '',
    isStable: true
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const { data, isLoading } = useGetVersionsQuery()
  const [createVersion] = useCreateVersionMutation()
  const [setLatest] = useSetLatestVersionMutation()
  const [deleteVersion] = useDeleteVersionMutation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    try {
      const submitData = new FormData()
      submitData.append('version', formData.version)
      submitData.append('component', formData.component)
      submitData.append('patchNotes', formData.patchNotes)
      submitData.append('isStable', String(formData.isStable))

      if (selectedFile) {
        submitData.append('package', selectedFile)
      }

      await createVersion(submitData).unwrap()
      setShowForm(false)
      setFormData({ version: '', component: 'full', patchNotes: '', isStable: true })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      alert(err.data?.message || 'Failed to create version')
    } finally {
      setUploading(false)
    }
  }

  const handleSetLatest = async (id) => {
    if (confirm('Set this as the latest version?')) {
      await setLatest(id)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this version?')) {
      await deleteVersion(id)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const allowed = ['.zip', '.tar.gz', '.tgz', '.exe', '.msi']
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!allowed.includes(ext) && !allowed.some(a => file.name.endsWith(a))) {
        alert('Invalid file type. Allowed: .zip, .tar.gz, .exe, .msi')
        e.target.value = ''
        return
      }
      setSelectedFile(file)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Versions</h1>
          <p className="text-gray-400 mt-1">Manage software versions and releases</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Version'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-mid rounded-xl border border-bg-light p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Create New Version</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Version Number</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.2.3"
                  className="w-full px-4 py-2 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary"
                  required
                  pattern="\d+\.\d+\.\d+"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Component</label>
                <select
                  value={formData.component}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary"
                >
                  <option value="full">Full Stack</option>
                  <option value="server">Server Only</option>
                  <option value="client">Client Only</option>
                </select>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Update Package</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-bg-light rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".zip,.tar.gz,.tgz,.exe,.msi"
                    className="hidden"
                  />
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center gap-2 text-white">
                        <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">{selectedFile.name}</span>
                        <span className="text-xs text-gray-400">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">.zip, .tar.gz, .exe, .msi (max 500MB)</p>
                      </div>
                    )}
                  </div>
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Upload the update ZIP package. Customers will download this file when they apply the update.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Patch Notes</label>
              <textarea
                value={formData.patchNotes}
                onChange={(e) => setFormData({ ...formData, patchNotes: e.target.value })}
                placeholder="What's new in this version..."
                rows={4}
                className="w-full px-4 py-2 bg-bg-dark border border-bg-light rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isStable}
                onChange={(e) => setFormData({ ...formData, isStable: e.target.checked })}
                id="stable"
                className="rounded"
              />
              <label htmlFor="stable" className="text-gray-400">Stable Release</label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-bg-light text-white rounded-lg hover:bg-bg-dark transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Create Version'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Versions list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">Loading versions...</div>
        ) : data?.versions?.length > 0 ? (
          data.versions.map((version, i) => (
            <motion.div
              key={version._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-bg-mid rounded-xl border p-6 ${
                version.isLatest ? 'border-primary/50 ring-1 ring-primary/25' : 'border-bg-light'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">v{version.version}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      version.component === 'full' ? 'bg-primary/20 text-primary' :
                      version.component === 'server' ? 'bg-secondary/20 text-secondary' :
                      'bg-accent/20 text-accent'
                    }`}>
                      {version.component}
                    </span>
                    {version.isLatest && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary">
                        LATEST
                      </span>
                    )}
                    {!version.isStable && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                        PRE-RELEASE
                      </span>
                    )}
                    {version.downloadUrl && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        HAS PACKAGE
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 mt-2">{version.patchNotes}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>Released {new Date(version.releaseDate).toLocaleDateString()}</span>
                    {version.fileSize && <span>Size: {formatFileSize(version.fileSize)}</span>}
                    {version.downloadUrl && <span className="text-secondary">{version.downloadUrl}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!version.isLatest && (
                    <button
                      onClick={() => handleSetLatest(version._id)}
                      className="px-3 py-1 text-sm bg-secondary/10 text-secondary rounded hover:bg-secondary/20 transition-colors"
                    >
                      Set Latest
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(version._id)}
                    className="px-3 py-1 text-sm bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">No versions published yet</div>
        )}
      </div>
    </div>
  )
}
