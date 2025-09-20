/**
 * Performance Integration Tests
 * 
 * Simple integration tests to verify performance optimizations are working.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  StreamingProcessor,
  TemplateCache,
  OptimizedFileIO,
  ProgressIndicator
} from '../../performance';

describe('Performance Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '../../../temp/perf-integration');
  
  beforeEach(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('StreamingProcessor should handle basic processing with memory monitoring', async () => {
    const processor = new StreamingProcessor({
      batchSize: 5,
      maxMemoryUsage: 50, // 50MB memory limit
      enableBackpressure: true
    });

    const testData = Array(20).fill(null).map((_, i) => ({ id: i, data: `test-${i}` }));
    
    const results = await processor.processTestCasesStream(
      testData,
      async (batch) => {
        return batch.map(item => ({
          name: `test-${item.id}`,
          status: 'passed' as any,
          duration: 100,
          category: 'unit' as any,
          fullName: `test-${item.id}`,
          ancestorTitles: []
        }));
      }
    );

    expect(results).toHaveLength(20);
    expect(results[0]?.name).toBe('test-0');
    
    const stats = processor.getStats();
    expect(stats.totalProcessed).toBe(20);
    expect(stats.batchesProcessed).toBeGreaterThan(0);
  });

  test('TemplateCache should cache and retrieve templates', async () => {
    const cache = new TemplateCache({
      maxSize: 1,
      maxEntries: 5,
      enableMetrics: true
    });

    const mockCompiler = jest.fn(async (content: string) => {
      return { compiled: content.toUpperCase() };
    });

    // First call - should compile
    const result1 = await cache.getTemplate('test-template', mockCompiler);
    expect(mockCompiler).toHaveBeenCalledTimes(1);
    
    // Second call - should use cache
    const result2 = await cache.getTemplate('test-template', mockCompiler);
    expect(mockCompiler).toHaveBeenCalledTimes(1); // Should not compile again
    
    expect(result1).toEqual(result2);
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  test('OptimizedFileIO should write and read files efficiently', async () => {
    const fileIO = new OptimizedFileIO({
      enableBatching: true,
      batchSize: 3,
      enableCaching: true
    });

    const testFile = path.join(testOutputDir, 'test-file.txt');
    const content = 'Test content for file I/O';

    // Write file
    await fileIO.writeFile(testFile, content, { immediate: true });
    
    // Read file
    const readContent = await fileIO.readFile(testFile, { useCache: true });
    
    expect(readContent).toBe(content);
    
    const stats = fileIO.getStats();
    expect(stats.filesWritten).toBe(1);
    expect(stats.filesRead).toBe(1);
  });

  test('ProgressIndicator should track progress correctly', async () => {
    const progress = new ProgressIndicator({
      enableConsoleOutput: false, // Disable for testing
      updateInterval: 10
    });

    const updates: number[] = [];
    progress.on('updated', (state) => {
      updates.push(state.percentage);
    });

    progress.start(10, 'Testing');
    
    for (let i = 1; i <= 10; i++) {
      progress.update({ current: i });
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    progress.complete();
    
    const finalState = progress.getState();
    expect(finalState.percentage).toBe(100);
    expect(finalState.current).toBe(10);
    expect(updates.length).toBeGreaterThan(0);
  });

  test('Performance components should work together', async () => {
    const fileIO = new OptimizedFileIO({ enableBatching: true });
    const progress = new ProgressIndicator({ enableConsoleOutput: false });
    
    progress.start(5, 'Writing multiple files');
    
    const files = Array(5).fill(null).map((_, i) => ({
      path: path.join(testOutputDir, `file-${i}.txt`),
      content: `Content for file ${i}`
    }));

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      await fileIO.writeFile(file.path, file.content);
      progress.update({ current: i + 1 });
    }
    
    progress.complete();
    
    // Verify all files were written
    for (const file of files) {
      const content = await fileIO.readFile(file.path);
      expect(content).toBe(file.content);
    }
    
    const stats = fileIO.getStats();
    expect(stats.filesWritten).toBe(5);
    expect(stats.filesRead).toBe(5);
  });

  test('should monitor memory usage during processing', async () => {
    const processor = new StreamingProcessor({
      batchSize: 10,
      maxMemoryUsage: 100, // 100MB memory limit
      enableBackpressure: true
    });

    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    
    // Create large test data to simulate memory usage
    const largeTestData = Array(100).fill(null).map((_, i) => ({
      id: i,
      data: 'x'.repeat(1000) // 1KB per item
    }));

    await processor.processTestCasesStream(
      largeTestData,
      async (batch) => {
        // Simulate memory-intensive processing
        const tempArray = new Array(1000).fill('memory test data');
        return batch.map(item => ({
          name: `memory-test-${item.id}`,
          status: 'passed' as any,
          duration: 50,
          category: 'unit' as any,
          fullName: `memory-test-${item.id}`,
          ancestorTitles: [],
          tempData: tempArray // This will use memory
        }));
      }
    );

    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB for this test)
    expect(memoryIncrease).toBeLessThan(50);
    expect(processor.isMemoryUsageHealthy()).toBe(true);
  });

  test('should handle memory pressure with backpressure', async () => {
    const processor = new StreamingProcessor({
      batchSize: 5,
      maxMemoryUsage: 10, // Very low limit to trigger backpressure
      enableBackpressure: true
    });

    let memoryPressureDetected = false;
    processor.on('memoryPressure', () => {
      memoryPressureDetected = true;
    });

    const testData = Array(50).fill(null).map((_, i) => ({ id: i, data: `test-${i}` }));

    await processor.processTestCasesStream(
      testData,
      async (batch) => {
        // Create memory pressure
        const largeArray = new Array(10000).fill('memory pressure test');
        await new Promise(resolve => setTimeout(resolve, 10));
        return batch.map(item => ({
          name: `pressure-test-${item.id}`,
          status: 'passed' as any,
          duration: 100,
          category: 'unit' as any,
          fullName: `pressure-test-${item.id}`,
          ancestorTitles: [],
          largeData: largeArray.slice(0, 100) // Keep some data
        }));
      }
    );

    // Should handle memory pressure gracefully
    expect(processor.isMemoryUsageHealthy()).toBe(true);
  });
});