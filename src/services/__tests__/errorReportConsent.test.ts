/**
 * Error Report Consent Tests
 * Tests for error reporting consent management functionality
 */

import { ErrorReportConsentManager, type ConsentLevel } from '../errorReportConsent';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ErrorReportConsentManager', () => {
  let consentManager: ErrorReportConsentManager;

  beforeEach(() => {
    mockLocalStorage.clear();
    consentManager = new ErrorReportConsentManager();
  });

  describe('getConsentStatus', () => {
    it('should return no consent by default', () => {
      const status = consentManager.getConsentStatus();

      expect(status.hasConsent).toBe(false);
      expect(status.level).toBe('none');
      expect(status.config).toBeNull();
      expect(status.needsUpdate).toBe(false);
    });

    it('should return existing consent status', () => {
      consentManager.setConsentLevel('basic');
      const status = consentManager.getConsentStatus();

      expect(status.hasConsent).toBe(true);
      expect(status.level).toBe('basic');
      expect(status.config).not.toBeNull();
      expect(status.needsUpdate).toBe(false);
    });
  });

  describe('setConsentLevel', () => {
    it('should set basic consent level', () => {
      const config = consentManager.setConsentLevel('basic');

      expect(config.level).toBe('basic');
      expect(config.includePersonalInfo).toBe(false);
      expect(config.includeUserActions).toBe(false);
      expect(config.includeSystemInfo).toBe(true);
      expect(config.includeStackTraces).toBe(true);
      expect(config.allowExternalReporting).toBe(false);
      expect(config.dataRetentionDays).toBe(7);
    });

    it('should set detailed consent level', () => {
      const config = consentManager.setConsentLevel('detailed');

      expect(config.level).toBe('detailed');
      expect(config.includePersonalInfo).toBe(false);
      expect(config.includeUserActions).toBe(true);
      expect(config.includeSystemInfo).toBe(true);
      expect(config.includeStackTraces).toBe(true);
      expect(config.allowExternalReporting).toBe(true);
      expect(config.dataRetentionDays).toBe(30);
    });

    it('should set full consent level', () => {
      const config = consentManager.setConsentLevel('full');

      expect(config.level).toBe('full');
      expect(config.includePersonalInfo).toBe(true);
      expect(config.includeUserActions).toBe(true);
      expect(config.includeSystemInfo).toBe(true);
      expect(config.includeStackTraces).toBe(true);
      expect(config.allowExternalReporting).toBe(true);
      expect(config.dataRetentionDays).toBe(90);
    });

    it('should set none consent level', () => {
      const config = consentManager.setConsentLevel('none');

      expect(config.level).toBe('none');
      expect(config.includePersonalInfo).toBe(false);
      expect(config.includeUserActions).toBe(false);
      expect(config.includeSystemInfo).toBe(false);
      expect(config.includeStackTraces).toBe(false);
      expect(config.allowExternalReporting).toBe(false);
      expect(config.dataRetentionDays).toBe(0);
    });

    it('should persist consent to localStorage', () => {
      consentManager.setConsentLevel('detailed');

      const stored = mockLocalStorage.getItem('errorReporting_consent');
      expect(stored).not.toBeNull();

      const config = JSON.parse(stored!);
      expect(config.level).toBe('detailed');
    });
  });

  describe('updateConsentConfig', () => {
    it('should update existing consent configuration', () => {
      consentManager.setConsentLevel('basic');
      
      const updated = consentManager.updateConsentConfig({
        includeUserActions: true,
        dataRetentionDays: 14,
      });

      expect(updated?.level).toBe('basic');
      expect(updated?.includeUserActions).toBe(true);
      expect(updated?.dataRetentionDays).toBe(14);
      expect(updated?.includeSystemInfo).toBe(true); // Should preserve existing
    });

    it('should throw error if no existing configuration', () => {
      expect(() => {
        consentManager.updateConsentConfig({ includeUserActions: true });
      }).toThrow('No existing consent configuration to update');
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent and clear data', () => {
      consentManager.setConsentLevel('full');
      
      // Add some mock data to localStorage
      mockLocalStorage.setItem('errorReports_pending', '[]');
      mockLocalStorage.setItem('errorReports_failed', '[]');
      
      consentManager.revokeConsent();

      const status = consentManager.getConsentStatus();
      expect(status.hasConsent).toBe(false);
      expect(status.level).toBe('none');

      // Check that data was cleared
      expect(mockLocalStorage.getItem('errorReports_pending')).toBeNull();
      expect(mockLocalStorage.getItem('errorReports_failed')).toBeNull();
    });
  });

  describe('isDataTypeAllowed', () => {
    it('should return false for no consent', () => {
      expect(consentManager.isDataTypeAllowed('includePersonalInfo')).toBe(false);
      expect(consentManager.isDataTypeAllowed('includeUserActions')).toBe(false);
    });

    it('should return correct values for basic consent', () => {
      consentManager.setConsentLevel('basic');

      expect(consentManager.isDataTypeAllowed('includePersonalInfo')).toBe(false);
      expect(consentManager.isDataTypeAllowed('includeUserActions')).toBe(false);
      expect(consentManager.isDataTypeAllowed('includeSystemInfo')).toBe(true);
      expect(consentManager.isDataTypeAllowed('includeStackTraces')).toBe(true);
      expect(consentManager.isDataTypeAllowed('allowExternalReporting')).toBe(false);
    });

    it('should return correct values for full consent', () => {
      consentManager.setConsentLevel('full');

      expect(consentManager.isDataTypeAllowed('includePersonalInfo')).toBe(true);
      expect(consentManager.isDataTypeAllowed('includeUserActions')).toBe(true);
      expect(consentManager.isDataTypeAllowed('includeSystemInfo')).toBe(true);
      expect(consentManager.isDataTypeAllowed('includeStackTraces')).toBe(true);
      expect(consentManager.isDataTypeAllowed('allowExternalReporting')).toBe(true);
    });
  });

  describe('isErrorReportingAllowed', () => {
    it('should return false for no consent', () => {
      expect(consentManager.isErrorReportingAllowed()).toBe(false);
    });

    it('should return false for none consent level', () => {
      consentManager.setConsentLevel('none');
      expect(consentManager.isErrorReportingAllowed()).toBe(false);
    });

    it('should return true for valid consent levels', () => {
      consentManager.setConsentLevel('basic');
      expect(consentManager.isErrorReportingAllowed()).toBe(true);

      consentManager.setConsentLevel('detailed');
      expect(consentManager.isErrorReportingAllowed()).toBe(true);

      consentManager.setConsentLevel('full');
      expect(consentManager.isErrorReportingAllowed()).toBe(true);
    });
  });

  describe('needsConsentUpdate', () => {
    it('should return false for recent consent', () => {
      consentManager.setConsentLevel('basic');
      expect(consentManager.needsConsentUpdate()).toBe(false);
    });

    it('should return true for expired consent', () => {
      const config = consentManager.setConsentLevel('basic');
      
      // Manually set old timestamp
      const oldTimestamp = new Date();
      oldTimestamp.setDate(oldTimestamp.getDate() - 400); // 400 days ago
      config.consentTimestamp = oldTimestamp.toISOString();
      
      expect(consentManager.needsConsentUpdate(config)).toBe(true);
    });

    it('should return true for outdated consent version', () => {
      const config = consentManager.setConsentLevel('basic');
      config.consentVersion = '0.9.0'; // Old version
      
      expect(consentManager.needsConsentUpdate(config)).toBe(true);
    });
  });

  describe('getDataRetentionDays', () => {
    it('should return 0 for no consent', () => {
      expect(consentManager.getDataRetentionDays()).toBe(0);
    });

    it('should return correct retention days for each level', () => {
      consentManager.setConsentLevel('basic');
      expect(consentManager.getDataRetentionDays()).toBe(7);

      consentManager.setConsentLevel('detailed');
      expect(consentManager.getDataRetentionDays()).toBe(30);

      consentManager.setConsentLevel('full');
      expect(consentManager.getDataRetentionDays()).toBe(90);

      consentManager.setConsentLevel('none');
      expect(consentManager.getDataRetentionDays()).toBe(0);
    });
  });

  describe('exportConsentData', () => {
    it('should export complete consent data', () => {
      consentManager.setConsentLevel('detailed');
      
      const exported = consentManager.exportConsentData();

      expect(exported.config).not.toBeNull();
      expect(exported.config?.level).toBe('detailed');
      expect(exported.status.hasConsent).toBe(true);
      expect(exported.dataTypes.personalInfo).toBe(false);
      expect(exported.dataTypes.userActions).toBe(true);
      expect(exported.dataTypes.systemInfo).toBe(true);
      expect(exported.dataTypes.stackTraces).toBe(true);
      expect(exported.dataTypes.externalReporting).toBe(true);
    });
  });

  describe('getConsentExpirationDate', () => {
    it('should return null for no consent', () => {
      expect(consentManager.getConsentExpirationDate()).toBeNull();
    });

    it('should return correct expiration date', () => {
      consentManager.setConsentLevel('basic');
      
      const expirationDate = consentManager.getConsentExpirationDate();
      expect(expirationDate).not.toBeNull();
      
      const now = new Date();
      const expectedExpiration = new Date(now);
      expectedExpiration.setDate(expectedExpiration.getDate() + 365);
      
      // Allow for small time differences
      const timeDiff = Math.abs(expirationDate!.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds difference
    });
  });
});