import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetUpdateStatusQuery, useCheckForUpdatesMutation, useApplyUpdateMutation } from '../../store/api/api';
import Button from './Button';
import Modal from './Modal';

const UpdateChecker = ({ currentVersion, className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const { data: updateStatus, isLoading: statusLoading } = useGetUpdateStatusQuery();
  const [checkForUpdates, { isLoading: checking }] = useCheckForUpdatesMutation();
  const [applyUpdate, { isLoading: applying }] = useApplyUpdateMutation();

  const hasUpdate = updateStatus?.hasUpdate;
  const updates = updateStatus?.updates || [];

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates({
      currentServerVersion: currentVersion,
      currentClientVersion: currentVersion
    });
  }, [currentVersion, checkForUpdates]);

  const handleCheck = async () => {
    try {
      await checkForUpdates({
        currentServerVersion: currentVersion,
        currentClientVersion: currentVersion
      }).unwrap();
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const handleApply = async () => {
    if (!selectedUpdate) return;

    try {
      await applyUpdate({
        version: selectedUpdate.availableVersion,
        component: selectedUpdate.component
      }).unwrap();

      setShowModal(false);
      setSelectedUpdate(null);

      // Show success message
      alert(`Update to v${selectedUpdate.availableVersion} is being applied in the background. The server will restart shortly. Please refresh the page in a few seconds.`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Update failed. Please try again or contact support.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className={`inline-flex items-center ${className}`}>
        {statusLoading || checking ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Checking...</span>
          </div>
        ) : hasUpdate ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Update Available</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
              v{updates[0]?.availableVersion}
            </span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheck}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Check for Updates</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Available Updates"
            size="lg"
          >
            <div className="space-y-4">
              {updates.map((update, index) => (
                <motion.div
                  key={`${update.component}-${update.availableVersion}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedUpdate === update
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => setSelectedUpdate(update)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {update.component.charAt(0).toUpperCase() + update.component.slice(1)}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm text-slate-600">
                          v{update.currentVersion} → v{update.availableVersion}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Released {formatDate(update.releaseDate)}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedUpdate === update
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300'
                    }`}>
                      {selectedUpdate === update && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">Patch Notes:</p>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                      {update.patchNotes}
                    </div>
                  </div>

                  {update.changelog && update.changelog.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">Changes:</p>
                      <ul className="space-y-1">
                        {update.changelog.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              change.category === 'feature' ? 'bg-green-100 text-green-800' :
                              change.category === 'fix' ? 'bg-red-100 text-red-800' :
                              change.category === 'security' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {change.category}
                            </span>
                            <span className="text-slate-600">{change.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {update.fileSize && (
                    <p className="text-xs text-slate-400 mt-2">
                      Download size: {(update.fileSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </motion.div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApply}
                  disabled={!selectedUpdate || applying}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500"
                >
                  {applying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Applying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Apply Update
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

export default UpdateChecker;
