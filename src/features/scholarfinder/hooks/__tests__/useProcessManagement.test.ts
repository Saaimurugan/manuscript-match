/**
 * Tests for useProcessManagement hooks
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { processQueryKeys } from '../useProcessManagement';

describe('useProcessManagement', () => {
  describe('processQueryKeys', () => {
    it('should generate correct query keys', () => {
      expect(processQueryKeys.all).toEqual(['processes']);
      expect(processQueryKeys.lists()).toEqual(['processes', 'list']);
      expect(processQueryKeys.detail('test-id')).toEqual(['processes', 'detail', 'test-id']);
      expect(processQueryKeys.statistics()).toEqual(['processes', 'statistics']);
    });

    it('should generate list query keys with filters', () => {
      const filters = { search: 'test' };
      expect(processQueryKeys.list(filters)).toEqual(['processes', 'list', filters]);
    });
  });
});