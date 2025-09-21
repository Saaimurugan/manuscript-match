/**
 * Error Report Consent Management
 * Handles user consent for error reporting and privacy compliance
 */

// Consent levels
export type ConsentLevel = 'none' | 'basic' | 'detailed' | 'full';

// Consent configuration
export interface ConsentConfig {
  level: ConsentLevel;
  includePersonalInfo: boolean;
  includeUserActions: boolean;
  includeSystemInfo: boolean;
  includeStackTraces: boolean;
  allowExternalReporting: boolean;
  dataRetentionDays: number;
  consentTimestamp: string;
  consentVersion: string;
}

// Consent status
export interface ConsentStatus {
  hasConsent: boolean;
  level: ConsentLevel;
  config: ConsentConfig | null;
  needsUpdate: boolean;
  expiresAt: string | null;
}

// Default consent configurations for each level
const CONSENT_CONFIGURATIONS: Record<ConsentLevel, Partial<ConsentConfig>> = {
  none: {
    includePersonalInfo: false,
    includeUserActions: false,
    includeSystemInfo: false,
    includeStackTraces: false,
    allowExternalReporting: false,
    dataRetentionDays: 0,
  },
  basic: {
    includePersonalInfo: false,
    includeUserActions: false,
    includeSystemInfo: true,
    includeStackTraces: true,
    allowExternalReporting: false,
    dataRetentionDays: 7,
  },
  detailed: {
    includePersonalInfo: false,
    includeUserActions: true,
    includeSystemInfo: true,
    includeStackTraces: true,
    allowExternalReporting: true,
    dataRetentionDays: 30,
  },
  full: {
    includePersonalInfo: true,
    includeUserActions: true,
    includeSystemInfo: true,
    includeStackTraces: true,
    allowExternalReporting: true,
    dataRetentionDays: 90,
  },
};

// Storage keys
const STORAGE_KEYS = {
  CONSENT_CONFIG: 'errorReporting_consent',
  CONSENT_TIMESTAMP: 'errorReporting_consentTimestamp',
  CONSENT_VERSION: 'errorReporting_consentVersion',
} as const;

// Current consent version (increment when privacy policy changes)
const CURRENT_CONSENT_VERSION = '1.0.0';

// Consent expiration (1 year)
const CONSENT_EXPIRATION_DAYS = 365;

export class ErrorReportConsentManager {
  private currentConfig: ConsentConfig | null = null;

  constructor() {
    this.loadConsentConfig();
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): ConsentStatus {
    const config = this.getCurrentConfig();
    
    if (!config) {
      return {
        hasConsent: false,
        level: 'none',
        config: null,
        needsUpdate: false,
        expiresAt: null,
      };
    }

    const needsUpdate = this.needsConsentUpdate(config);
    const expiresAt = this.calculateExpirationDate(config.consentTimestamp);

    return {
      hasConsent: config.level !== 'none' && !needsUpdate,
      level: config.level,
      config,
      needsUpdate,
      expiresAt,
    };
  }

  /**
   * Set user consent level
   */
  setConsentLevel(level: ConsentLevel): ConsentConfig {
    const baseConfig = CONSENT_CONFIGURATIONS[level];
    const timestamp = new Date().toISOString();

    const config: ConsentConfig = {
      level,
      consentTimestamp: timestamp,
      consentVersion: CURRENT_CONSENT_VERSION,
      ...baseConfig,
    } as ConsentConfig;

    this.currentConfig = config;
    this.saveConsentConfig(config);

    return config;
  }

  /**
   * Update consent configuration
   */
  updateConsentConfig(updates: Partial<ConsentConfig>): ConsentConfig | null {
    const currentConfig = this.getCurrentConfig();
    
    if (!currentConfig) {
      throw new Error('No existing consent configuration to update');
    }

    const updatedConfig: ConsentConfig = {
      ...currentConfig,
      ...updates,
      consentTimestamp: new Date().toISOString(),
      consentVersion: CURRENT_CONSENT_VERSION,
    };

    this.currentConfig = updatedConfig;
    this.saveConsentConfig(updatedConfig);

    return updatedConfig;
  }

  /**
   * Revoke consent
   */
  revokeConsent(): void {
    this.setConsentLevel('none');
    this.clearStoredData();
  }

  /**
   * Check if specific data type is allowed
   */
  isDataTypeAllowed(dataType: keyof ConsentConfig): boolean {
    const config = this.getCurrentConfig();
    
    if (!config || config.level === 'none') {
      return false;
    }

    return Boolean(config[dataType]);
  }

  /**
   * Check if error reporting is allowed
   */
  isErrorReportingAllowed(): boolean {
    const status = this.getConsentStatus();
    return status.hasConsent && !status.needsUpdate;
  }

  /**
   * Check if external reporting is allowed
   */
  isExternalReportingAllowed(): boolean {
    return this.isDataTypeAllowed('allowExternalReporting');
  }

  /**
   * Get data retention period in days
   */
  getDataRetentionDays(): number {
    const config = this.getCurrentConfig();
    return config?.dataRetentionDays || 0;
  }

  /**
   * Get consent configuration for specific level
   */
  getConsentConfigForLevel(level: ConsentLevel): ConsentConfig {
    const baseConfig = CONSENT_CONFIGURATIONS[level];
    const timestamp = new Date().toISOString();

    return {
      level,
      consentTimestamp: timestamp,
      consentVersion: CURRENT_CONSENT_VERSION,
      ...baseConfig,
    } as ConsentConfig;
  }

  /**
   * Check if consent needs to be updated
   */
  needsConsentUpdate(config?: ConsentConfig): boolean {
    const currentConfig = config || this.getCurrentConfig();
    
    if (!currentConfig) {
      return true;
    }

    // Check if consent version is outdated
    if (currentConfig.consentVersion !== CURRENT_CONSENT_VERSION) {
      return true;
    }

    // Check if consent has expired
    const consentDate = new Date(currentConfig.consentTimestamp);
    const expirationDate = new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + CONSENT_EXPIRATION_DAYS);

    return new Date() > expirationDate;
  }

  /**
   * Get consent expiration date
   */
  getConsentExpirationDate(): Date | null {
    const config = this.getCurrentConfig();
    
    if (!config) {
      return null;
    }

    const consentDate = new Date(config.consentTimestamp);
    const expirationDate = new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + CONSENT_EXPIRATION_DAYS);

    return expirationDate;
  }

  /**
   * Export consent data for user review
   */
  exportConsentData(): {
    config: ConsentConfig | null;
    status: ConsentStatus;
    dataTypes: Record<string, boolean>;
  } {
    const config = this.getCurrentConfig();
    const status = this.getConsentStatus();

    const dataTypes = {
      personalInfo: this.isDataTypeAllowed('includePersonalInfo'),
      userActions: this.isDataTypeAllowed('includeUserActions'),
      systemInfo: this.isDataTypeAllowed('includeSystemInfo'),
      stackTraces: this.isDataTypeAllowed('includeStackTraces'),
      externalReporting: this.isDataTypeAllowed('allowExternalReporting'),
    };

    return {
      config,
      status,
      dataTypes,
    };
  }

  /**
   * Get current configuration
   */
  private getCurrentConfig(): ConsentConfig | null {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    return this.loadConsentConfig();
  }

  /**
   * Load consent configuration from storage
   */
  private loadConsentConfig(): ConsentConfig | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONSENT_CONFIG);
      
      if (stored) {
        const config = JSON.parse(stored) as ConsentConfig;
        this.currentConfig = config;
        return config;
      }
    } catch (error) {
      console.error('Failed to load consent configuration:', error);
    }

    return null;
  }

  /**
   * Save consent configuration to storage
   */
  private saveConsentConfig(config: ConsentConfig): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.CONSENT_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save consent configuration:', error);
    }
  }

  /**
   * Calculate expiration date
   */
  private calculateExpirationDate(consentTimestamp: string): string {
    const consentDate = new Date(consentTimestamp);
    const expirationDate = new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + CONSENT_EXPIRATION_DAYS);
    return expirationDate.toISOString();
  }

  /**
   * Clear all stored consent and error report data
   */
  private clearStoredData(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Clear consent data
      localStorage.removeItem(STORAGE_KEYS.CONSENT_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.CONSENT_TIMESTAMP);
      localStorage.removeItem(STORAGE_KEYS.CONSENT_VERSION);

      // Clear error report data
      localStorage.removeItem('errorReports_pending');
      localStorage.removeItem('errorReports_failed');
      localStorage.removeItem('errorReports_userActions');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
    }
  }
}

// Create singleton instance
export const errorReportConsentManager = new ErrorReportConsentManager();

export default errorReportConsentManager;