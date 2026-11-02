import { useGetTrialStatusQuery } from '../../store/api/api';
import { Link } from 'react-router-dom';

export default function TrialStatusBanner() {
  const { data: trialStatus, isLoading } = useGetTrialStatusQuery();

  if (isLoading || !trialStatus?.isTrial) return null;

  const { daysRemaining, endDate } = trialStatus;

  const getUrgencyStyles = () => {
    if (daysRemaining <= 2) {
      return {
        bg: 'bg-danger-50',
        border: 'border-danger-200',
        text: 'text-danger-700',
        badge: 'bg-danger-100 text-danger-700',
        icon: 'text-danger-500'
      };
    }
    if (daysRemaining <= 4) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        icon: 'text-amber-500'
      };
    }
    return {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      text: 'text-primary-700',
      badge: 'bg-primary-100 text-primary-700',
      icon: 'text-primary-500'
    };
  };

  const styles = getUrgencyStyles();
  const expiryDate = new Date(endDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${styles.badge}`}>
            <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className={`font-semibold ${styles.text}`}>
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your free trial
            </p>
            <p className={`text-sm ${styles.text} opacity-75`}>
              Trial expires on {expiryDate}
            </p>
          </div>
        </div>
        <Link
          to="/settings"
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            daysRemaining <= 2
              ? 'bg-danger-500 text-white hover:bg-danger-600'
              : daysRemaining <= 4
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          Subscribe Now
        </Link>
      </div>
    </div>
  );
}
