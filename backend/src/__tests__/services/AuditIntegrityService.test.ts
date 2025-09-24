import { PrismaClient } from '@prisma/client';
import { AuditIntegrityService, AuditLogEntry } from '@/services/AuditIntegrityService';
import { ActivityLogService } from '@/services/ActivityLogService';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AuditIntegrityService', () => {
  let prisma: PrismaClient;
  let auditIntegrityService: AuditIntegrityService;
  let activityLogService: ActivityLogService;

  beforeEach(async () => {
    prisma = new PrismaClient();
    auditIntegrityService = new AuditIntegrityService();
    activityLogService = new ActivityLogService(prisma);

    // Clear database
    await prisma.auditChain.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();

    // Mock fs operations
    mockFs.ensureDirSync.mockImplementation(() => {});
    mockFs.writeJson.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ size: 1000, mtime: new Date() } as any);
    mockFs.remove.mockResolvedValue(undefined);
    mockFs.createReadStream.mockReturnValue({} as any);
    mockFs.createWriteStream.mockReturnValue({} as any);
  });

  afterEach(async () => {
    await prisma.auditChain.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    jest.clearAllMocks();
  });

  describe('Audit Log Signing', () => {
    it('should sign audit log entries with cryptographic signatures', async () => {
      const logEntry: Omit<AuditLogEntry, 'signature' | 'previousHash'> = {
        id: 'test-log-1',
        userId: 'user-1',
        processId: null,
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource-1',
        details: { test: 'data' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      const signedEntry = await auditIntegrityService.signAuditLogEntry(logEntry);

      expect(signedEntry.signature).toBeDefined();
      expect(signedEntry.signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(signedEntry.previousHash).toBeNull(); // First entry
    });

    it('should create chain links between consecutive log entries', async () => {
      // Create first log entry
      const firstEntry: Omit<AuditLogEntry, 'signature' | 'previousHash'> = {
        id: 'test-log-1',
        userId: 'user-1',
        processId: null,
        action: 'FIRST_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource-1',
        details: { test: 'data1' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      // Mock the database to return the first entry when queried
      const mockActivityLog = {
        id: 'test-log-1',
        signature: 'first-signature'
      };

      jest.spyOn(prisma.activityLog, 'findFirst').mockResolvedValue(mockActivityLog as any);
      jest.spyOn(prisma.auditChain, 'findFirst').mockResolvedValue({ blockIndex: 0 } as any);
      jest.spyOn(prisma.auditChain, 'create').mockResolvedValue({} as any);

      const firstSigned = await auditIntegrityService.signAuditLogEntry(firstEntry);

      // Create second log entry
      const secondEntry: Omit<AuditLogEntry, 'signature' | 'previousHash'> = {
        id: 'test-log-2',
        userId: 'user-1',
        processId: null,
        action: 'SECOND_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource-2',
        details: { test: 'data2' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      const secondSigned = await auditIntegrityService.signAuditLogEntry(secondEntry);

      expect(secondSigned.previousHash).toBe(firstSigned.signature);
      expect(secondSigned.signature).toBeDefined();
      expect(secondSigned.signature).not.toBe(firstSigned.signature);
    });

    it('should store audit chain entries for blockchain-like integrity', async () => {
      const mockCreate = jest.spyOn(prisma.auditChain, 'create').mockResolvedValue({} as any);
      const mockFindFirst = jest.spyOn(prisma.auditChain, 'findFirst').mockResolvedValue({ blockIndex: 5 } as any);

      const logEntry: Omit<AuditLogEntry, 'signature' | 'previousHash'> = {
        id: 'test-log-1',
        userId: 'user-1',
        processId: null,
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource-1',
        details: { test: 'data' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      };

      await auditIntegrityService.signAuditLogEntry(logEntry);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          logId: 'test-log-1',
          hash: expect.any(String),
          signature: expect.any(String),
          timestamp: expect.any(Date),
          blockIndex: 6 // Should increment from 5
        })
      });
    });
  });

  describe('Audit Trail Verification', () => {
    it('should verify the integrity of a valid audit trail', async () => {
      // Mock valid log entries with proper signatures
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'ACTION_1',
          signature: 'valid-signature-1',
          previousHash: null,
          timestamp: new Date('2023-01-01'),
          resourceType: 'test',
          resourceId: 'resource-1',
          details: '{"test": "data1"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        },
        {
          id: 'log-2',
          userId: 'user-1',
          action: 'ACTION_2',
          signature: 'valid-signature-2',
          previousHash: 'valid-signature-1',
          timestamp: new Date('2023-01-02'),
          resourceType: 'test',
          resourceId: 'resource-2',
          details: '{"test": "data2"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prisma.auditChain, 'findMany').mockResolvedValue([]);

      // Mock the signature verification to return true
      const originalVerifySignature = (auditIntegrityService as any).verifyLogSignature;
      (auditIntegrityService as any).verifyLogSignature = jest.fn().mockReturnValue(true);

      const result = await auditIntegrityService.verifyAuditTrail();

      expect(result.isValid).toBe(true);
      expect(result.totalEntries).toBe(2);
      expect(result.verifiedEntries).toBe(2);
      expect(result.invalidEntries).toHaveLength(0);
      expect(result.brokenChain).toBe(false);
      expect(result.errors).toHaveLength(0);

      // Restore original method
      (auditIntegrityService as any).verifyLogSignature = originalVerifySignature;
    });

    it('should detect invalid signatures in audit trail', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'ACTION_1',
          signature: 'invalid-signature',
          previousHash: null,
          timestamp: new Date('2023-01-01'),
          resourceType: 'test',
          resourceId: 'resource-1',
          details: '{"test": "data1"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prisma.auditChain, 'findMany').mockResolvedValue([]);

      // Mock signature verification to return false
      (auditIntegrityService as any).verifyLogSignature = jest.fn().mockReturnValue(false);

      const result = await auditIntegrityService.verifyAuditTrail();

      expect(result.isValid).toBe(false);
      expect(result.totalEntries).toBe(1);
      expect(result.verifiedEntries).toBe(0);
      expect(result.invalidEntries).toHaveLength(1);
      expect(result.errors).toContain('Entry log-1 has invalid signature');
    });

    it('should detect broken chain links', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'ACTION_1',
          signature: 'signature-1',
          previousHash: null,
          timestamp: new Date('2023-01-01'),
          resourceType: 'test',
          resourceId: 'resource-1',
          details: '{"test": "data1"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        },
        {
          id: 'log-2',
          userId: 'user-1',
          action: 'ACTION_2',
          signature: 'signature-2',
          previousHash: 'wrong-previous-hash', // Should be 'signature-1'
          timestamp: new Date('2023-01-02'),
          resourceType: 'test',
          resourceId: 'resource-2',
          details: '{"test": "data2"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prisma.auditChain, 'findMany').mockResolvedValue([]);

      // Mock signature verification to return true
      (auditIntegrityService as any).verifyLogSignature = jest.fn().mockReturnValue(true);

      const result = await auditIntegrityService.verifyAuditTrail();

      expect(result.isValid).toBe(false);
      expect(result.brokenChain).toBe(true);
      expect(result.errors).toContain('Entry log-2 has broken chain link');
    });

    it('should detect missing signatures', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'ACTION_1',
          signature: null, // Missing signature
          previousHash: null,
          timestamp: new Date('2023-01-01'),
          resourceType: 'test',
          resourceId: 'resource-1',
          details: '{"test": "data1"}',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prisma.auditChain, 'findMany').mockResolvedValue([]);

      const result = await auditIntegrityService.verifyAuditTrail();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Entry log-1 is missing signature');
      expect(result.invalidEntries).toHaveLength(1);
    });
  });

  describe('Log Rotation and Archival', () => {
    it('should rotate old audit logs to archive files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      const mockOldLogs = [
        {
          id: 'old-log-1',
          userId: 'user-1',
          action: 'OLD_ACTION',
          timestamp: oldDate,
          signature: 'old-signature',
          resourceType: 'test',
          resourceId: 'old-resource',
          details: '{"old": "data"}',
          ipAddress: '192.168.1.1',
          userAgent: 'old-agent'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockOldLogs as any);
      jest.spyOn(prisma.activityLog, 'deleteMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prisma.auditChain, 'deleteMany').mockResolvedValue({ count: 1 } as any);

      // Mock verification result
      jest.spyOn(auditIntegrityService, 'verifyAuditTrail').mockResolvedValue({
        isValid: true,
        totalEntries: 1,
        verifiedEntries: 1,
        invalidEntries: [],
        brokenChain: false,
        errors: []
      });

      const result = await auditIntegrityService.rotateAuditLogs();

      expect(result.archivedCount).toBe(1);
      expect(result.archiveFile).toContain('audit-logs-');
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('audit-logs-'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            totalEntries: 1,
            integrity: expect.objectContaining({
              isValid: true
            })
          }),
          logs: mockOldLogs
        }),
        { spaces: 2 }
      );
    });

    it('should compress archive files when compression is enabled', async () => {
      // Set compression enabled
      process.env.AUDIT_COMPRESSION_ENABLED = 'true';
      
      const auditService = new AuditIntegrityService();
      
      const mockOldLogs = [
        {
          id: 'old-log-1',
          userId: 'user-1',
          action: 'OLD_ACTION',
          timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
          signature: 'old-signature'
        }
      ];

      jest.spyOn(prisma.activityLog, 'findMany').mockResolvedValue(mockOldLogs as any);
      jest.spyOn(prisma.activityLog, 'deleteMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prisma.auditChain, 'deleteMany').mockResolvedValue({ count: 1 } as any);

      // Mock compression stream
      const mockGzip = {
        pipe: jest.fn().mockReturnThis()
      };
      const mockZlib = {
        createGzip: jest.fn().mockReturnValue(mockGzip)
      };
      jest.doMock('zlib', () => mockZlib);

      // Mock stream events
      const mockReadStream = {
        pipe: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue({
            on: jest.fn((event, callback) => {
              if (event === 'finish') {
                setTimeout(callback, 0);
              }
              return { on: jest.fn() };
            })
          })
        })
      };
      mockFs.createReadStream.mockReturnValue(mockReadStream as any);

      jest.spyOn(auditService, 'verifyAuditTrail').mockResolvedValue({
        isValid: true,
        totalEntries: 1,
        verifiedEntries: 1,
        invalidEntries: [],
        brokenChain: false,
        errors: []
      });

      const result = await auditService.rotateAuditLogs();

      expect(result.archiveFile).toContain('.gz');
      expect(mockFs.remove).toHaveBeenCalled(); // Should remove uncompressed file

      // Clean up
      delete process.env.AUDIT_COMPRESSION_ENABLED;
    });

    it('should clean up old archive files based on retention policy', async () => {
      const oldArchiveFiles = [
        'audit-logs-2020-01-01.json',
        'audit-logs-2020-01-02.json.gz',
        'other-file.txt' // Should be ignored
      ];

      mockFs.readdir.mockResolvedValue(oldArchiveFiles as any);
      
      // Mock old file stats
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 10); // Very old
      
      mockFs.stat.mockImplementation((filePath: string) => {
        if (filePath.includes('audit-logs-')) {
          return Promise.resolve({ size: 1000, mtime: oldDate } as any);
        }
        return Promise.resolve({ size: 500, mtime: new Date() } as any);
      });

      const result = await auditIntegrityService.cleanupOldArchives();

      expect(result.deletedCount).toBe(2); // Only audit log files
      expect(result.freedSpace).toBe(2000); // 2 files × 1000 bytes
      expect(mockFs.remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audit Statistics', () => {
    it('should provide comprehensive audit trail statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        signedLogs: 95,
        chainEntries: 95,
        oldestLog: { timestamp: new Date('2023-01-01') },
        newestLog: { timestamp: new Date('2023-12-31') }
      };

      jest.spyOn(prisma.activityLog, 'count')
        .mockResolvedValueOnce(mockStats.totalLogs)
        .mockResolvedValueOnce(mockStats.signedLogs);
      
      jest.spyOn(prisma.auditChain, 'count').mockResolvedValue(mockStats.chainEntries);
      
      jest.spyOn(prisma.activityLog, 'findFirst')
        .mockResolvedValueOnce(mockStats.oldestLog as any)
        .mockResolvedValueOnce(mockStats.newestLog as any);

      mockFs.readdir.mockResolvedValue(['audit-logs-2023-01-01.json', 'audit-logs-2023-01-02.json.gz'] as any);
      mockFs.stat.mockResolvedValue({ size: 5000 } as any);

      const stats = await auditIntegrityService.getAuditStatistics();

      expect(stats.totalLogs).toBe(100);
      expect(stats.signedLogs).toBe(95);
      expect(stats.unsignedLogs).toBe(5);
      expect(stats.chainEntries).toBe(95);
      expect(stats.oldestLog).toEqual(mockStats.oldestLog.timestamp);
      expect(stats.newestLog).toEqual(mockStats.newestLog.timestamp);
      expect(stats.archiveFiles).toBe(2);
      expect(stats.totalArchiveSize).toBe(10000); // 2 files × 5000 bytes
    });
  });

  describe('Integration with ActivityLogService', () => {
    it('should automatically sign new activity log entries', async () => {
      // Create a test user
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          role: 'USER'
        }
      });

      const logData = {
        userId: user.id,
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource',
        details: { test: 'data' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };

      const createdLog = await activityLogService.logActivity(logData);

      expect(createdLog.signature).toBeDefined();
      expect(createdLog.signature).toMatch(/^[a-f0-9]{64}$/);
      expect(createdLog.previousHash).toBeDefined(); // Could be null for first entry
    });

    it('should handle signing failures gracefully', async () => {
      // Create a test user
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          role: 'USER'
        }
      });

      // Mock signing to fail
      jest.spyOn(auditIntegrityService, 'signAuditLogEntry').mockRejectedValue(new Error('Signing failed'));

      const logData = {
        userId: user.id,
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: 'test-resource',
        details: { test: 'data' }
      };

      // Should not throw, but return unsigned log
      const createdLog = await activityLogService.logActivity(logData);

      expect(createdLog).toBeDefined();
      expect(createdLog.signature).toBeUndefined();
    });
  });

  describe('Scheduled Operations', () => {
    it('should schedule log rotation', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      auditIntegrityService.scheduleLogRotation();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000);
    });
  });
});