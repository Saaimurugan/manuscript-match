/**
 * Blocked user notification component
 * Displays when a user's account has been blocked
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface BlockedUserNotificationProps {
  onContactSupport?: () => void;
  supportEmail?: string;
  supportPhone?: string;
}

/**
 * Component that displays when a user account is blocked
 */
export const BlockedUserNotification: React.FC<BlockedUserNotificationProps> = ({
  onContactSupport,
  supportEmail = 'support@example.com',
  supportPhone,
}) => {
  const { logout } = useAuth();

  // Auto-logout blocked users after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      logout();
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [logout]);

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else if (supportEmail) {
      window.location.href = `mailto:${supportEmail}?subject=Account Blocked - Support Request`;
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Account Blocked
          </h2>

          {/* Message */}
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 mb-6">
            <p className="text-gray-700 mb-4">
              Your account has been temporarily blocked by an administrator.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Access Restricted
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      You cannot access the application while your account is blocked.
                      Please contact support for assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>What this means:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You cannot log in to your account</li>
                <li>All active sessions have been terminated</li>
                <li>Your data remains secure and intact</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={handleContactSupport}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </button>

            {supportPhone && (
              <button
                onClick={() => window.location.href = `tel:${supportPhone}`}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Support: {supportPhone}
              </button>
            )}

            <button
              onClick={() => logout()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Return to Login
            </button>
          </div>

          {/* Contact Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500 space-y-2">
              <p><strong>Need Help?</strong></p>
              <div className="flex flex-col space-y-1">
                <p>Email: <a href={`mailto:${supportEmail}`} className="text-red-600 hover:text-red-500">{supportEmail}</a></p>
                {supportPhone && (
                  <p>Phone: <a href={`tel:${supportPhone}`} className="text-red-600 hover:text-red-500">{supportPhone}</a></p>
                )}
              </div>
            </div>
          </div>

          {/* Auto-logout notice */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              You will be automatically logged out in 30 seconds for security purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserNotification;