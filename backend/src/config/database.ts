import { PrismaClient } from '@prisma/client';
import { config } from './environment';

// Create Prisma client instance with optimized connection pooling
export const prisma = new PrismaClient({
  log: config.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: config.database.url,
    },
  },
  // Add connection pool configuration for better concurrent handling
  __internal: {
    engine: {
      // Increase connection pool size for SQLite
      connectionLimit: 25, // Increased from default 10
      poolTimeout: 30000, // 30 seconds timeout
      // Enable WAL mode for better concurrent access
      engineType: 'binary',
    },
  },
});

// Connection pool management
let connectionCount = 0;
const MAX_CONNECTIONS = 25;
const connectionQueue: Array<() => void> = [];

// Connection semaphore to prevent pool exhaustion
export async function acquireConnection<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const executeOperation = async () => {
      if (connectionCount >= MAX_CONNECTIONS) {
        // Queue the operation if we're at max connections
        connectionQueue.push(executeOperation);
        return;
      }
      
      connectionCount++;
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        connectionCount--;
        // Process next operation in queue
        if (connectionQueue.length > 0) {
          const nextOperation = connectionQueue.shift();
          if (nextOperation) {
            setTimeout(nextOperation, 0);
          }
        }
      }
    };
    
    executeOperation();
  });
}

// Database connection helper
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Database disconnection helper
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}