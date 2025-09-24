import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from './ActivityLogService';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  processId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  signature?: string;
  previousHash?: string;
}

export interface AuditChainEntry {
  id: string;
  logId: string;
  hash: string;
  previousHash: string | null;
  signature: string;
  timestamp: Date;
  blockIndex: number;
}

export interface LogRotationConfig {
  maxLogAge: number; // in days
  maxLogSize: number; // in MB
  compressionEnabled: boolean;
  archiveLocation: string;
  retentionPeriod: number; // in days
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  invalidEntries: AuditLogEntry[];
  brokenChain: boolean;
  errors: string[];
}

export class AuditIntegrityService {
  private prisma: PrismaClient;
  private activityLogService: ActivityLogService | null = null;
  private secretKey: string;
  private rotationConfig: LogRotationConfig;

  constructor() {
    this.prisma = new PrismaClient();
    this.secretKey = process.env.AUDIT_SECRET_KEY || this.generateSecretKey();
    
    this.rotationConfig = {
      maxLogAge: parseInt(process.env.AUDIT_MAX_LOG_AGE || '90'), // 90 days
      maxLogSize: parseInt(process.env.AUDIT_MAX_LOG_SIZE || '100'), // 100 MB
      compressionEnabled: process.env.AUDIT_COMPRESSION_ENABLED === 'true',
      archiveLocation: process.env.AUDIT_ARCHIVE_LOCATION || './audit-archives',
      retentionPeriod: parseInt(process.env.AUDIT_RETENTION_PERIOD || '2555') // 7 years
    };

    // Ensure archive directory exists
    fs.ensureDirSync(this.rotationConfig.archiveLocation);
  }

  public setActivityLogService(activityLogService: ActivityLogService): void {
    this.activityLogService = activityLogService;
  }

  /**
   * Generate a secret key for audit signing
   */
  private generateSecretKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('Generated new audit secret key. Store this securely:', key);
    return key;
  }

  /**
   * Create a cryptographic hash of log entry data
   */
  private createLogHash(entry: Omit<AuditLogEntry, 'signature' | 'previousHash'>): string {
    const data = {
      id: entry.id,
      userId: entry.userId,
      processId: entry.processId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: entry.timestamp.toISOString()
    };

    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Create a cryptographic signature for log entry
   */
  private createLogSignature(hash: string, previousHash: string | null): string {
    const signatureData = previousHash ? `${hash}:${previousHash}` : hash;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureData)
      .digest('hex');
  }

  /**
   * Verify a log entry signature
   */
  private verifyLogSignature(
    entry: AuditLogEntry,
    expectedPreviousHash: string | null
  ): boolean {
    try {
      const hash = this.createLogHash(entry);
      const expectedSignature = this.createLogSignature(hash, expectedPreviousHash);
      return entry.signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying log signature:', error);
      return false;
    }
  }

  /**
   * Sign a new audit log entry
   */
  async signAuditLogEntry(entry: Omit<AuditLogEntry, 'signature' | 'previousHash'>): Promise<AuditLogEntry> {
    try {
      // Get the last log entry to create chain
      const lastEntry = await this.prisma.activityLog.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { id: true, signature: true }
      });

      const hash = this.createLogHash(entry);
      const previousHash = lastEntry?.signature || null;
      const signature = this.createLogSignature(hash, previousHash);

      const signedEntry: AuditLogEntry = {
        ...entry,
        signature,
        previousHash
      };

      // Store in audit chain table for additional integrity
      await this.storeAuditChainEntry(signedEntry, hash);

      return signedEntry;
    } catch (error) {
      console.error('Error signing audit log entry:', error);
      throw new Error('Failed to sign audit log entry');
    }
  }

  /**
   * Store audit chain entry for blockchain-like integrity
   */
  private async storeAuditChainEntry(entry: AuditLogEntry, hash: string): Promise<void> {
    try {
      const lastChainEntry = await this.prisma.auditChain.findFirst({
        orderBy: { blockIndex: 'desc' }
      });

      const blockIndex = (lastChainEntry?.blockIndex || 0) + 1;

      await this.prisma.auditChain.create({
        data: {
          logId: entry.id,
          hash,
          previousHash: entry.previousHash,
          signature: entry.signature!,
          timestamp: entry.timestamp,
          blockIndex
        }
      });
    } catch (error) {
      console.error('Error storing audit chain entry:', error);
      // Don't throw here to avoid breaking the main logging flow
    }
  }

  /**
   * Verify the integrity of the entire audit trail
   */
  async verifyAuditTrail(startDate?: Date, endDate?: Date): Promise<AuditVerificationResult> {
    const result: AuditVerificationResult = {
      isValid: true,
      totalEntries: 0,
      verifiedEntries: 0,
      invalidEntries: [],
      brokenChain: false,
      errors: []
    };

    try {
      // Build query conditions
      const whereConditions: any = {};
      if (startDate || endDate) {
        whereConditions.timestamp = {};
        if (startDate) whereConditions.timestamp.gte = startDate;
        if (endDate) whereConditions.timestamp.lte = endDate;
      }

      // Get all log entries in chronological order
      const logEntries = await this.prisma.activityLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'asc' }
      });

      result.totalEntries = logEntries.length;

      if (logEntries.length === 0) {
        return result;
      }

      let previousHash: string | null = null;

      for (let i = 0; i < logEntries.length; i++) {
        const entry = logEntries[i] as AuditLogEntry;

        // Check if entry has signature
        if (!entry.signature) {
          result.errors.push(`Entry ${entry.id} is missing signature`);
          result.invalidEntries.push(entry);
          result.isValid = false;
          continue;
        }

        // Verify signature
        const isValidSignature = this.verifyLogSignature(entry, previousHash);
        if (!isValidSignature) {
          result.errors.push(`Entry ${entry.id} has invalid signature`);
          result.invalidEntries.push(entry);
          result.isValid = false;
        } else {
          result.verifiedEntries++;
        }

        // Check chain integrity
        if (entry.previousHash !== previousHash) {
          result.errors.push(`Entry ${entry.id} has broken chain link`);
          result.brokenChain = true;
          result.isValid = false;
        }

        previousHash = entry.signature;
      }

      // Verify against audit chain if available
      await this.verifyAgainstAuditChain(result, logEntries);

    } catch (error) {
      result.errors.push(`Verification failed: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Verify log entries against the audit chain
   */
  private async verifyAgainstAuditChain(
    result: AuditVerificationResult,
    logEntries: any[]
  ): Promise<void> {
    try {
      const chainEntries = await this.prisma.auditChain.findMany({
        orderBy: { blockIndex: 'asc' }
      });

      for (const chainEntry of chainEntries) {
        const logEntry = logEntries.find(log => log.id === chainEntry.logId);
        if (!logEntry) {
          result.errors.push(`Chain entry ${chainEntry.id} references missing log ${chainEntry.logId}`);
          result.isValid = false;
          continue;
        }

        if (logEntry.signature !== chainEntry.signature) {
          result.errors.push(`Chain entry ${chainEntry.id} signature mismatch`);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.errors.push(`Chain verification failed: ${error.message}`);
    }
  }

  /**
   * Rotate old audit logs to archive
   */
  async rotateAuditLogs(): Promise<{
    archivedCount: number;
    archivedSize: number;
    archiveFile: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.rotationConfig.maxLogAge);

      // Get logs to archive
      const logsToArchive = await this.prisma.activityLog.findMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      if (logsToArchive.length === 0) {
        return {
          archivedCount: 0,
          archivedSize: 0,
          archiveFile: ''
        };
      }

      // Create archive file
      const archiveFileName = `audit-logs-${cutoffDate.toISOString().split('T')[0]}.json`;
      const archiveFilePath = path.join(this.rotationConfig.archiveLocation, archiveFileName);

      const archiveData = {
        metadata: {
          archiveDate: new Date().toISOString(),
          totalEntries: logsToArchive.length,
          dateRange: {
            start: logsToArchive[0].timestamp,
            end: logsToArchive[logsToArchive.length - 1].timestamp
          },
          integrity: await this.verifyAuditTrail(
            logsToArchive[0].timestamp,
            logsToArchive[logsToArchive.length - 1].timestamp
          )
        },
        logs: logsToArchive
      };

      // Write archive file
      await fs.writeJson(archiveFilePath, archiveData, { spaces: 2 });

      // Compress if enabled
      let finalArchiveFile = archiveFilePath;
      if (this.rotationConfig.compressionEnabled) {
        const zlib = require('zlib');
        const compressedFile = `${archiveFilePath}.gz`;
        const readStream = fs.createReadStream(archiveFilePath);
        const writeStream = fs.createWriteStream(compressedFile);
        const gzip = zlib.createGzip();

        await new Promise((resolve, reject) => {
          readStream
            .pipe(gzip)
            .pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });

        // Remove uncompressed file
        await fs.remove(archiveFilePath);
        finalArchiveFile = compressedFile;
      }

      // Get file size
      const stats = await fs.stat(finalArchiveFile);
      const archivedSize = stats.size;

      // Remove archived logs from database
      await this.prisma.activityLog.deleteMany({
        where: {
          id: {
            in: logsToArchive.map(log => log.id)
          }
        }
      });

      // Also clean up corresponding audit chain entries
      await this.prisma.auditChain.deleteMany({
        where: {
          logId: {
            in: logsToArchive.map(log => log.id)
          }
        }
      });

      // Log the rotation activity
      if (this.activityLogService) {
        await this.activityLogService.logActivity({
        userId: null,
        processId: null,
        action: 'AUDIT_LOG_ROTATION',
        resourceType: 'audit',
        resourceId: null,
        details: {
          archivedCount: logsToArchive.length,
          archivedSize,
          archiveFile: finalArchiveFile,
          cutoffDate: cutoffDate.toISOString()
        },
        ipAddress: null,
        userAgent: 'system'
      });
      }

      return {
        archivedCount: logsToArchive.length,
        archivedSize,
        archiveFile: finalArchiveFile
      };

    } catch (error) {
      console.error('Error rotating audit logs:', error);
      throw new Error(`Failed to rotate audit logs: ${error.message}`);
    }
  }

  /**
   * Clean up old archive files based on retention policy
   */
  async cleanupOldArchives(): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    try {
      const retentionCutoff = new Date();
      retentionCutoff.setDate(retentionCutoff.getDate() - this.rotationConfig.retentionPeriod);

      const archiveFiles = await fs.readdir(this.rotationConfig.archiveLocation);
      let deletedCount = 0;
      let freedSpace = 0;

      for (const fileName of archiveFiles) {
        if (!fileName.startsWith('audit-logs-')) continue;

        const filePath = path.join(this.rotationConfig.archiveLocation, fileName);
        const stats = await fs.stat(filePath);

        if (stats.mtime < retentionCutoff) {
          freedSpace += stats.size;
          await fs.remove(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0 && this.activityLogService) {
        // Log the cleanup activity
        await this.activityLogService.logActivity({
          userId: null,
          processId: null,
          action: 'AUDIT_ARCHIVE_CLEANUP',
          resourceType: 'audit',
          resourceId: null,
          details: {
            deletedCount,
            freedSpace,
            retentionCutoff: retentionCutoff.toISOString()
          },
          ipAddress: null,
          userAgent: 'system'
        });
      }

      return { deletedCount, freedSpace };

    } catch (error) {
      console.error('Error cleaning up old archives:', error);
      throw new Error(`Failed to cleanup old archives: ${error.message}`);
    }
  }

  /**
   * Get audit trail statistics
   */
  async getAuditStatistics(): Promise<{
    totalLogs: number;
    signedLogs: number;
    unsignedLogs: number;
    chainEntries: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    archiveFiles: number;
    totalArchiveSize: number;
  }> {
    try {
      const [
        totalLogs,
        signedLogs,
        chainEntries,
        oldestLog,
        newestLog
      ] = await Promise.all([
        this.prisma.activityLog.count(),
        this.prisma.activityLog.count({
          where: { signature: { not: null } }
        }),
        this.prisma.auditChain.count(),
        this.prisma.activityLog.findFirst({
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true }
        }),
        this.prisma.activityLog.findFirst({
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })
      ]);

      // Get archive statistics
      let archiveFiles = 0;
      let totalArchiveSize = 0;

      try {
        const archiveFileList = await fs.readdir(this.rotationConfig.archiveLocation);
        for (const fileName of archiveFileList) {
          if (fileName.startsWith('audit-logs-')) {
            archiveFiles++;
            const filePath = path.join(this.rotationConfig.archiveLocation, fileName);
            const stats = await fs.stat(filePath);
            totalArchiveSize += stats.size;
          }
        }
      } catch (error) {
        console.warn('Could not read archive directory:', error.message);
      }

      return {
        totalLogs,
        signedLogs,
        unsignedLogs: totalLogs - signedLogs,
        chainEntries,
        oldestLog: oldestLog?.timestamp || null,
        newestLog: newestLog?.timestamp || null,
        archiveFiles,
        totalArchiveSize
      };

    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw new Error(`Failed to get audit statistics: ${error.message}`);
    }
  }

  /**
   * Schedule automatic log rotation
   */
  scheduleLogRotation(): void {
    // Run rotation daily at 2 AM
    const rotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    const runRotation = async () => {
      try {
        console.log('Starting scheduled audit log rotation...');
        const result = await this.rotateAuditLogs();
        console.log(`Audit log rotation completed: ${result.archivedCount} logs archived`);
        
        // Also cleanup old archives
        const cleanupResult = await this.cleanupOldArchives();
        console.log(`Archive cleanup completed: ${cleanupResult.deletedCount} files deleted`);
        
      } catch (error) {
        console.error('Scheduled audit log rotation failed:', error);
      }
    };

    // Run immediately if there are old logs
    setTimeout(runRotation, 5000); // 5 seconds after startup
    
    // Then run daily
    setInterval(runRotation, rotationInterval);
  }
}