/**
 * Test file to verify React Query setup compiles correctly
 */

import { queryClient, queryKeys, cacheUtils } from '../lib/queryClient';
import { 
  useProcesses, 
  useCreateProcess, 
  useAuth,
  useApiErrorHandler 
} from '../hooks';

// Test that queryClient is properly configured
describe('React Query Setup', () => {
  test('queryClient should be defined', () => {
    expect(queryClient).toBeDefined();
  });

  test('queryKeys should be properly structured', () => {
    expect(queryKeys.processes.all()).toEqual(['processes']);
    expect(queryKeys.processes.detail('test-id')).toEqual(['processes', 'detail', 'test-id']);
    expect(queryKeys.metadata.detail('test-id')).toEqual(['metadata', 'test-id', 'detail']);
  });

  test('cacheUtils should be defined', () => {
    expect(cacheUtils.invalidateProcess).toBeDefined();
    expect(cacheUtils.clearAll).toBeDefined();
  });
});

// Test that hooks are properly exported
describe('React Query Hooks', () => {
  test('process hooks should be defined', () => {
    expect(useProcesses).toBeDefined();
    expect(useCreateProcess).toBeDefined();
  });

  test('auth hooks should be defined', () => {
    expect(useAuth).toBeDefined();
  });

  test('error handling hooks should be defined', () => {
    expect(useApiErrorHandler).toBeDefined();
  });
});

export {};