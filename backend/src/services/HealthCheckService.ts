import { config } from '@/config/environment';
import { DatabaseClient } from './database/DatabaseClient';
import { PubMedClient } from './database/PubMedClient';
import { ElsevierClient } from './database/ElsevierClient';
import { WileyClient } from './database/WileyClient';
import { TaylorFrancisClient } from './database/TaylorFrancisClient';
import { DatabaseType } from '@/types';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: ComponentHealth;
    externalApis: Record<string, ComponentHealth>;
    memory: ComponentHealth;
    disk?: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

export class HealthCheckService {
  private startTime: Date;
  private databaseClients: Map<DatabaseType, DatabaseClient>;

  constructor() {
    this.startTime = new Date();
    this.databaseClients = new Map();
    this.initializeDatabaseClients();
  }

  private initializeDatabaseClients(): void {
    // Initialize clients for health checks
    this.databaseClients.set(DatabaseType.PUBMED, new PubMedClient());
    
    if (config.externalApis.elsevier.apiKey) {
      this.databaseClients.set(DatabaseType.ELSEVIER, new ElsevierClient(config.externalApis.elsevier.apiKey));
    }
    
    this.databaseClients.set(DatabaseType.WILEY, new WileyClient());
    this.databaseClients.set(DatabaseType.TAYLOR_FRANCIS, new TaylorFrancisClient());
  }

  async getHealthStatus(): Promise<HealthCheckResult> {
    // Run all health checks in parallel
    const [
      databaseHealth,
      externalApiHealth,
      memoryHealth,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkExternalApis(),
      this.checkMemory(),
    ]);

    // Determine overall status
    const checks = {
      database: databaseHealth.status === 'fulfilled' ? databaseHealth.value : this.createUnhealthyResult('Database check failed'),
      externalApis: externalApiHealth.status === 'fulfilled' ? externalApiHealth.value : { overall: this.createUnhealthyResult('External API checks failed') },
      memory: memoryHealth.status === 'fulfilled' ? memoryHealth.value : this.createUnhealthyResult('Memory check failed'),
    };

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: config.env,
      checks,
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Import Prisma client dynamically to avoid circular dependencies
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkExternalApis(): Promise<Record<string, ComponentHealth>> {
    const apiChecks = Array.from(this.databaseClients.entries()).map(async ([database, client]): Promise<[string, ComponentHealth]> => {
      const startTime = Date.now();
      
      try {
        // Perform a lightweight health check (e.g., ping endpoint or simple query)
        await this.performApiHealthCheck(client, database);
        
        return [database, {
          status: 'healthy' as const,
          responseTime: Date.now() - startTime,
        }];
      } catch (error) {
        return [database, {
          status: 'degraded' as const, // External APIs being down shouldn't make the whole service unhealthy
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown API error',
        }];
      }
    });

    const results = await Promise.allSettled(apiChecks);
    const apiHealth: Record<string, ComponentHealth> = {};

    results.forEach((result, index) => {
      const databases = Array.from(this.databaseClients.keys());
      const database = databases[index];
      if (database && result.status === 'fulfilled') {
        const [dbName, health] = result.value;
        apiHealth[dbName] = health;
      } else if (database) {
        apiHealth[database] = {
          status: 'unhealthy',
          error: 'Health check failed',
        };
      }
    });

    return apiHealth;
  }

  private async performApiHealthCheck(client: DatabaseClient, database: DatabaseType): Promise<void> {
    // For now, we'll just check if the client can be instantiated
    // In a real implementation, you might want to make a lightweight API call
    if (!client) {
      throw new Error(`${database} client not available`);
    }
    
    // You could add specific health check methods to each client
    // For example: await client.healthCheck();
  }

  private checkMemory(): ComponentHealth {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
        heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent),
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
    };
  }

  private determineOverallStatus(checks: any): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses: string[] = [];
    
    // Collect all status values
    statuses.push(checks.database.status);
    statuses.push(checks.memory.status);
    
    // External APIs being down should only make the service degraded, not unhealthy
    const apiStatuses = Object.values(checks.externalApis).map((api: any) => api.status);
    const hasUnhealthyApis = apiStatuses.includes('unhealthy');
    const hasDegradedApis = apiStatuses.includes('degraded');
    
    // If core services (database, memory) are unhealthy, the whole service is unhealthy
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    // If core services are degraded or APIs are having issues, service is degraded
    if (statuses.includes('degraded') || hasUnhealthyApis || hasDegradedApis) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private createUnhealthyResult(error: string): ComponentHealth {
    return {
      status: 'unhealthy',
      error,
    };
  }

  // Quick health check for liveness probes
  async isAlive(): Promise<boolean> {
    try {
      // Just check if the process is running and can respond
      return true;
    } catch {
      return false;
    }
  }

  // Readiness check for readiness probes
  async isReady(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }
}