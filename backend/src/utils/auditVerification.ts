import { AuditIntegrityService } from '@/services/AuditIntegrityService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { PrismaClient } from '@prisma/client';

/**
 * Utility functions for audit trail verification and management
 */
export class AuditVerificationUtils {
  private auditIntegrityService: AuditIntegrityService;
  private activityLogService: ActivityLogService;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.auditIntegrityService = new AuditIntegrityService();
    this.activityLogService = new ActivityLogService(this.prisma);
  }

  /**
   * Verify the integrity of the entire audit trail
   */
  async verifyFullAuditTrail(): Promise<{
    isValid: boolean;
    summary: string;
    details: any;
  }> {
    try {
      const result = await this.auditIntegrityService.verifyAuditTrail();
      
      const summary = result.isValid 
        ? `✅ Audit trail is valid: ${result.verifiedEntries}/${result.totalEntries} entries verified`
        : `❌ Audit trail has issues: ${result.errors.length} errors found`;

      return {
        isValid: result.isValid,
        summary,
        details: result
      };
    } catch (error) {
      return {
        isValid: false,
        summary: `❌ Verification failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Get audit trail statistics
   */
  async getAuditStatistics(): Promise<{
    summary: string;
    details: any;
  }> {
    try {
      const stats = await this.auditIntegrityService.getAuditStatistics();
      
      const signedPercentage = stats.totalLogs > 0 
        ? Math.round((stats.signedLogs / stats.totalLogs) * 100)
        : 0;

      const summary = `📊 Audit Statistics: ${stats.totalLogs} total logs, ${signedPercentage}% signed, ${stats.archiveFiles} archive files`;

      return {
        summary,
        details: stats
      };
    } catch (error) {
      return {
        summary: `❌ Failed to get statistics: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Perform log rotation
   */
  async performLogRotation(): Promise<{
    success: boolean;
    summary: string;
    details: any;
  }> {
    try {
      const result = await this.auditIntegrityService.rotateAuditLogs();
      
      const summary = result.archivedCount > 0
        ? `📦 Rotated ${result.archivedCount} logs to ${result.archiveFile}`
        : `ℹ️ No logs needed rotation`;

      return {
        success: true,
        summary,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        summary: `❌ Rotation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Clean up old archives
   */
  async cleanupOldArchives(): Promise<{
    success: boolean;
    summary: string;
    details: any;
  }> {
    try {
      const result = await this.auditIntegrityService.cleanupOldArchives();
      
      const summary = result.deletedCount > 0
        ? `🗑️ Cleaned up ${result.deletedCount} old archive files, freed ${Math.round(result.freedSpace / 1024 / 1024)}MB`
        : `ℹ️ No old archives to clean up`;

      return {
        success: true,
        summary,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        summary: `❌ Cleanup failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Test the audit integrity system by creating and verifying a test log
   */
  async testAuditIntegrity(): Promise<{
    success: boolean;
    summary: string;
    details: any;
  }> {
    try {
      // Create a test log entry
      const testLog = await this.activityLogService.logActivity({
        userId: null,
        action: 'AUDIT_INTEGRITY_TEST',
        resourceType: 'system',
        resourceId: 'test',
        details: {
          test: true,
          timestamp: new Date().toISOString(),
          purpose: 'Audit integrity verification test'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'audit-test-utility'
      });

      // Verify the log was signed
      if (!testLog.signature) {
        return {
          success: false,
          summary: '❌ Test log was not signed',
          details: { testLog }
        };
      }

      // Verify the audit trail
      const verification = await this.auditIntegrityService.verifyAuditTrail();

      return {
        success: verification.isValid,
        summary: verification.isValid 
          ? '✅ Audit integrity test passed'
          : '❌ Audit integrity test failed',
        details: {
          testLog,
          verification
        }
      };
    } catch (error) {
      return {
        success: false,
        summary: `❌ Test failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Run a comprehensive audit health check
   */
  async runHealthCheck(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    summary: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      details?: any;
    }>;
  }> {
    const checks = [];
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check 1: Verify audit trail integrity
    try {
      const verification = await this.verifyFullAuditTrail();
      checks.push({
        name: 'Audit Trail Integrity',
        status: verification.isValid ? 'pass' : 'fail',
        message: verification.summary,
        details: verification.details
      });
      
      if (!verification.isValid) {
        overallHealth = 'critical';
      }
    } catch (error) {
      checks.push({
        name: 'Audit Trail Integrity',
        status: 'fail',
        message: `Verification failed: ${error.message}`
      });
      overallHealth = 'critical';
    }

    // Check 2: Get audit statistics
    try {
      const stats = await this.getAuditStatistics();
      const details = stats.details;
      
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = stats.summary;
      
      if (details.totalLogs > 0) {
        const signedPercentage = (details.signedLogs / details.totalLogs) * 100;
        if (signedPercentage < 95) {
          status = 'warn';
          message += ` (${Math.round(100 - signedPercentage)}% unsigned logs)`;
          if (overallHealth === 'healthy') overallHealth = 'warning';
        }
      }
      
      checks.push({
        name: 'Audit Statistics',
        status,
        message,
        details
      });
    } catch (error) {
      checks.push({
        name: 'Audit Statistics',
        status: 'fail',
        message: `Failed to get statistics: ${error.message}`
      });
      overallHealth = 'critical';
    }

    // Check 3: Test audit signing
    try {
      const test = await this.testAuditIntegrity();
      checks.push({
        name: 'Audit Signing Test',
        status: test.success ? 'pass' : 'fail',
        message: test.summary,
        details: test.details
      });
      
      if (!test.success && overallHealth !== 'critical') {
        overallHealth = 'warning';
      }
    } catch (error) {
      checks.push({
        name: 'Audit Signing Test',
        status: 'fail',
        message: `Test failed: ${error.message}`
      });
      overallHealth = 'critical';
    }

    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    const summary = `Audit Health Check: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`;

    return {
      overallHealth,
      summary,
      checks
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * CLI utility for running audit verification commands
 */
export async function runAuditCommand(command: string): Promise<void> {
  const utils = new AuditVerificationUtils();
  
  try {
    switch (command) {
      case 'verify':
        const verification = await utils.verifyFullAuditTrail();
        console.log(verification.summary);
        if (!verification.isValid) {
          console.log('Errors:', verification.details.errors);
        }
        break;

      case 'stats':
        const stats = await utils.getAuditStatistics();
        console.log(stats.summary);
        console.log('Details:', JSON.stringify(stats.details, null, 2));
        break;

      case 'rotate':
        const rotation = await utils.performLogRotation();
        console.log(rotation.summary);
        break;

      case 'cleanup':
        const cleanup = await utils.cleanupOldArchives();
        console.log(cleanup.summary);
        break;

      case 'test':
        const test = await utils.testAuditIntegrity();
        console.log(test.summary);
        break;

      case 'health':
        const health = await utils.runHealthCheck();
        console.log(`\n${health.summary}`);
        console.log(`Overall Health: ${health.overallHealth.toUpperCase()}\n`);
        
        health.checks.forEach(check => {
          const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
          console.log(`${icon} ${check.name}: ${check.message}`);
        });
        break;

      default:
        console.log('Available commands: verify, stats, rotate, cleanup, test, health');
        break;
    }
  } catch (error) {
    console.error('Command failed:', error.message);
  } finally {
    await utils.close();
  }
}

// If run directly from command line
if (require.main === module) {
  const command = process.argv[2] || 'health';
  runAuditCommand(command);
}