/**
 * Blocked user guard component that monitors for blocked users
 * and displays appropriate notifications
 */

import React from 'react';
import { useBlockedUserDetection } from '../../hooks/useBlockedUserDetection';
import { BlockedUserNotification } from './BlockedUserNotification';

export interface BlockedUserGuardProps {
  children: React.ReactNode;
  supportEmail?: string;
  supportPhone?: string;
  checkInterval?: number;
  autoLogoutDelay?: number;
  onUserBlocked?: (blockInfo: any) => void;
}

/**
 * Guard component that monitors for blocked users and shows notifications
 */
export const BlockedUserGuard: React.FC<BlockedUserGuardProps> = ({
  children,
  supportEmail = 'support@example.com',
  supportPhone,
  checkInterval = 30000,
  autoLogoutDelay = 30000,
  onUserBlocked,
}) => {
  const { isBlocked, showNotification, dismissNotification } = useBlockedUserDetection({
    checkInterval,
    autoLogout: true,
    autoLogoutDelay,
    onUserBlocked,
  });

  // Show blocked user notification if user is blocked
  if (isBlocked && showNotification) {
    return (
      <BlockedUserNotification
        supportEmail={supportEmail}
        supportPhone={supportPhone}
        onContactSupport={() => {
          // Custom contact support logic can be added here
          if (supportEmail) {
            window.location.href = `mailto:${supportEmail}?subject=Account Blocked - Support Request&body=Hello,%0D%0A%0D%0AMy account has been blocked and I need assistance.%0D%0A%0D%0APlease help me understand why my account was blocked and what steps I need to take to resolve this issue.%0D%0A%0D%0AThank you.`;
          }
        }}
      />
    );
  }

  // Render children normally if user is not blocked
  return <>{children}</>;
};

export default BlockedUserGuard;