/**
 * Error Report Consent Modal
 * Provides user interface for managing error reporting consent
 */

import React, { useState, useEffect } from 'react';
import { 
  errorReportConsentManager, 
  type ConsentLevel, 
  type ConsentConfig,
  type ConsentStatus 
} from '../../services/errorReportConsent';

interface ErrorReportConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentChange?: (level: ConsentLevel) => void;
  showDetails?: boolean;
}

const CONSENT_DESCRIPTIONS: Record<ConsentLevel, {
  title: string;
  description: string;
  details: string[];
}> = {
  none: {
    title: 'No Error Reporting',
    description: 'Disable all error reporting and data collection.',
    details: [
      'No error data will be collected or sent',
      'You will need to manually report any issues',
      'Application errors will only be logged locally',
    ],
  },
  basic: {
    title: 'Basic Error Reporting',
    description: 'Collect essential error information for debugging.',
    details: [
      'Error messages and stack traces',
      'Basic system information (browser, OS)',
      'No personal information or user actions',
      'Data stored locally only',
      'Data retained for 7 days',
    ],
  },
  detailed: {
    title: 'Detailed Error Reporting',
    description: 'Enhanced error reporting with user context.',
    details: [
      'All basic error information',
      'User actions leading to the error',
      'Component and application state',
      'Reports may be sent to our servers',
      'Data retained for 30 days',
    ],
  },
  full: {
    title: 'Full Error Reporting',
    description: 'Comprehensive error reporting for best support.',
    details: [
      'All detailed error information',
      'User session information (anonymized)',
      'Performance and usage analytics',
      'Automatic error report submission',
      'Data retained for 90 days',
    ],
  },
};

export const ErrorReportConsentModal: React.FC<ErrorReportConsentModalProps> = ({
  isOpen,
  onClose,
  onConsentChange,
  showDetails = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ConsentLevel>('basic');
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(showDetails);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const status = errorReportConsentManager.getConsentStatus();
      setConsentStatus(status);
      setSelectedLevel(status.level);
    }
  }, [isOpen]);

  const handleConsentSubmit = async () => {
    setIsLoading(true);
    
    try {
      const config = errorReportConsentManager.setConsentLevel(selectedLevel);
      const newStatus = errorReportConsentManager.getConsentStatus();
      
      setConsentStatus(newStatus);
      onConsentChange?.(selectedLevel);
      
      // Show success message briefly before closing
      setTimeout(() => {
        onClose();
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to save consent:', error);
      setIsLoading(false);
    }
  };

  const handleRevokeConsent = () => {
    errorReportConsentManager.revokeConsent();
    setSelectedLevel('none');
    setConsentStatus(errorReportConsentManager.getConsentStatus());
    onConsentChange?.('none');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Error Reporting Preferences
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Help us improve the application by choosing how much information you're 
              comfortable sharing when errors occur. Your privacy is important to us.
            </p>
            
            {consentStatus?.needsUpdate && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Consent Update Required
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your consent preferences need to be updated due to privacy policy changes 
                      or expiration. Please review and confirm your preferences.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {(Object.keys(CONSENT_DESCRIPTIONS) as ConsentLevel[]).map((level) => {
              const config = CONSENT_DESCRIPTIONS[level];
              return (
                <div
                  key={level}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedLevel === level
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLevel(level)}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="consentLevel"
                      value={level}
                      checked={selectedLevel === level}
                      onChange={() => setSelectedLevel(level)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {config.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {config.description}
                      </p>
                      {showAdvanced && (
                        <ul className="text-xs text-gray-500 space-y-1">
                          {config.details.map((detail, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!showAdvanced && (
            <div className="mb-6">
              <button
                onClick={() => setShowAdvanced(true)}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Show detailed information about each option
              </button>
            </div>
          )}

          <div className="bg-gray-50 rounded-md p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Privacy Information</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All data is encrypted in transit and at rest</li>
              <li>• You can change these preferences at any time</li>
              <li>• Data is automatically deleted after the retention period</li>
              <li>• No personal information is shared with third parties</li>
              <li>• You can request data deletion at any time</li>
            </ul>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              {consentStatus?.hasConsent && (
                <button
                  onClick={handleRevokeConsent}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Revoke All Consent
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConsentSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>

          {consentStatus?.expiresAt && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              Current consent expires on {new Date(consentStatus.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorReportConsentModal;