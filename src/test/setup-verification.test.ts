/**
 * Test to verify the testing setup is working correctly
 */

import { describe, it, expect, vi } from 'vitest';

describe('Test Setup Verification', () => {
  it('should have vitest working correctly', () => {
    expect(true).toBe(true);
  });

  it('should have mocking capabilities', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  it('should have environment variables mocked', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});