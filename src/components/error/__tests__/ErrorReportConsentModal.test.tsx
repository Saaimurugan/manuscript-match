/**
 * Error Report Consent Modal Tests
 * Tests for the error reporting consent user interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorReportConsentModal } from '../ErrorReportConsentModal';
import { errorReportConsentManager } from '../../../services/errorReportConsent';

// Mock the consent manager
jest.mock('../../../services/errorReportConsent', () => ({
  errorReportConsentManager: {
    getConsentStatus: jest.fn(),
    setConsentLevel: jest.fn(),
    revokeConsent: jest.fn(),
  },
}));

const mockConsentManager = errorReportConsentManager as jest.Mocked<typeof errorReportConsentManager>;

describe('ErrorReportConsentModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConsentChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock return values
    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: false,
      level: 'none',
      config: null,
      needsUpdate: false,
      expiresAt: null,
    });
    
    mockConsentManager.setConsentLevel.mockReturnValue({
      level: 'basic',
      includePersonalInfo: false,
      includeUserActions: false,
      includeSystemInfo: true,
      includeStackTraces: true,
      allowExternalReporting: false,
      dataRetentionDays: 7,
      consentTimestamp: new Date().toISOString(),
      consentVersion: '1.0.0',
    });
  });

  it('should not render when isOpen is false', () => {
    render(<ErrorReportConsentModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Error Reporting Preferences')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText('Error Reporting Preferences')).toBeInTheDocument();
    expect(screen.getByText('Help us improve the application')).toBeInTheDocument();
  });

  it('should display all consent level options', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText('No Error Reporting')).toBeInTheDocument();
    expect(screen.getByText('Basic Error Reporting')).toBeInTheDocument();
    expect(screen.getByText('Detailed Error Reporting')).toBeInTheDocument();
    expect(screen.getByText('Full Error Reporting')).toBeInTheDocument();
  });

  it('should show detailed information when showDetails is true', () => {
    render(<ErrorReportConsentModal {...defaultProps} showDetails={true} />);
    
    expect(screen.getByText('No error data will be collected or sent')).toBeInTheDocument();
    expect(screen.getByText('Error messages and stack traces')).toBeInTheDocument();
  });

  it('should show detailed information when "Show detailed information" is clicked', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    const showDetailsButton = screen.getByText('Show detailed information about each option');
    fireEvent.click(showDetailsButton);
    
    expect(screen.getByText('No error data will be collected or sent')).toBeInTheDocument();
  });

  it('should select consent level when radio button is clicked', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    const detailedOption = screen.getByLabelText(/Detailed Error Reporting/);
    fireEvent.click(detailedOption);
    
    expect(detailedOption).toBeChecked();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<ErrorReportConsentModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ErrorReportConsentModal {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should save consent preferences when save button is clicked', async () => {
    const onConsentChange = jest.fn();
    render(<ErrorReportConsentModal {...defaultProps} onConsentChange={onConsentChange} />);
    
    // Select detailed consent
    const detailedOption = screen.getByLabelText(/Detailed Error Reporting/);
    fireEvent.click(detailedOption);
    
    // Click save
    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);
    
    expect(mockConsentManager.setConsentLevel).toHaveBeenCalledWith('detailed');
    expect(onConsentChange).toHaveBeenCalledWith('detailed');
    
    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Should close after timeout
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    }, { timeout: 1500 });
  });

  it('should show consent update warning when needed', () => {
    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: true,
      level: 'basic',
      config: {
        level: 'basic',
        includePersonalInfo: false,
        includeUserActions: false,
        includeSystemInfo: true,
        includeStackTraces: true,
        allowExternalReporting: false,
        dataRetentionDays: 7,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0.0',
      },
      needsUpdate: true,
      expiresAt: new Date().toISOString(),
    });

    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText('Consent Update Required')).toBeInTheDocument();
    expect(screen.getByText(/Your consent preferences need to be updated/)).toBeInTheDocument();
  });

  it('should show revoke consent button when user has consent', () => {
    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: true,
      level: 'basic',
      config: {
        level: 'basic',
        includePersonalInfo: false,
        includeUserActions: false,
        includeSystemInfo: true,
        includeStackTraces: true,
        allowExternalReporting: false,
        dataRetentionDays: 7,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0.0',
      },
      needsUpdate: false,
      expiresAt: new Date().toISOString(),
    });

    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText('Revoke All Consent')).toBeInTheDocument();
  });

  it('should revoke consent when revoke button is clicked', () => {
    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: true,
      level: 'basic',
      config: {
        level: 'basic',
        includePersonalInfo: false,
        includeUserActions: false,
        includeSystemInfo: true,
        includeStackTraces: true,
        allowExternalReporting: false,
        dataRetentionDays: 7,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0.0',
      },
      needsUpdate: false,
      expiresAt: new Date().toISOString(),
    });

    const onConsentChange = jest.fn();
    render(<ErrorReportConsentModal {...defaultProps} onConsentChange={onConsentChange} />);
    
    const revokeButton = screen.getByText('Revoke All Consent');
    fireEvent.click(revokeButton);
    
    expect(mockConsentManager.revokeConsent).toHaveBeenCalled();
    expect(onConsentChange).toHaveBeenCalledWith('none');
  });

  it('should show consent expiration date when available', () => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: true,
      level: 'basic',
      config: {
        level: 'basic',
        includePersonalInfo: false,
        includeUserActions: false,
        includeSystemInfo: true,
        includeStackTraces: true,
        allowExternalReporting: false,
        dataRetentionDays: 7,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0.0',
      },
      needsUpdate: false,
      expiresAt: expirationDate.toISOString(),
    });

    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText(/Current consent expires on/)).toBeInTheDocument();
  });

  it('should display privacy information', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    expect(screen.getByText('Privacy Information')).toBeInTheDocument();
    expect(screen.getByText(/All data is encrypted in transit and at rest/)).toBeInTheDocument();
    expect(screen.getByText(/You can change these preferences at any time/)).toBeInTheDocument();
  });

  it('should handle save errors gracefully', async () => {
    mockConsentManager.setConsentLevel.mockImplementation(() => {
      throw new Error('Save failed');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<ErrorReportConsentModal {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save consent:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should disable buttons when loading', () => {
    render(<ErrorReportConsentModal {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('should set initial selected level from consent status', () => {
    mockConsentManager.getConsentStatus.mockReturnValue({
      hasConsent: true,
      level: 'detailed',
      config: {
        level: 'detailed',
        includePersonalInfo: false,
        includeUserActions: true,
        includeSystemInfo: true,
        includeStackTraces: true,
        allowExternalReporting: true,
        dataRetentionDays: 30,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0.0',
      },
      needsUpdate: false,
      expiresAt: new Date().toISOString(),
    });

    render(<ErrorReportConsentModal {...defaultProps} />);
    
    const detailedOption = screen.getByLabelText(/Detailed Error Reporting/);
    expect(detailedOption).toBeChecked();
  });
});