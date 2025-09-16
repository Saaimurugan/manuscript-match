import { CircuitBreaker, CircuitBreakerState } from '@/utils/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  const mockOperation = jest.fn();

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
    });
    mockOperation.mockClear();
  });

  afterEach(() => {
    circuitBreaker.removeAllListeners();
  });

  describe('CLOSED state', () => {
    it('should execute operations successfully', async () => {
      mockOperation.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should track failures but remain closed below threshold', async () => {
      mockOperation.mockRejectedValue(new Error('Service error'));

      // Fail twice (below threshold of 3)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service error');
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service error');

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(2);
    });

    it('should open when failure threshold is reached', async () => {
      mockOperation.mockRejectedValue(new Error('Service error'));
      const openedSpy = jest.fn();
      circuitBreaker.on('opened', openedSpy);

      // Fail 3 times (meets threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service error');
      }

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.OPEN);
      expect(stats.failureCount).toBe(3);
      expect(openedSpy).toHaveBeenCalledWith('test-service', expect.any(Error));
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Force circuit breaker to open
      mockOperation.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      }
      mockOperation.mockClear();
    });

    it('should reject operations immediately when open', async () => {
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow('Circuit breaker test-service is OPEN');

      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const halfOpenSpy = jest.fn();
      circuitBreaker.on('halfOpen', halfOpenSpy);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now be in HALF_OPEN state
      mockOperation.mockResolvedValue('success');
      await circuitBreaker.execute(mockOperation);

      expect(halfOpenSpy).toHaveBeenCalledWith('test-service');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Force to OPEN then wait for HALF_OPEN
      mockOperation.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      }
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      mockOperation.mockClear();
    });

    it('should close on successful operation', async () => {
      mockOperation.mockResolvedValue('success');
      const closedSpy = jest.fn();
      circuitBreaker.on('closed', closedSpy);

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(closedSpy).toHaveBeenCalledWith('test-service');
    });

    it('should open again on failure', async () => {
      mockOperation.mockRejectedValue(new Error('Still failing'));
      const openedSpy = jest.fn();
      circuitBreaker.on('opened', openedSpy);

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Still failing');

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
      expect(openedSpy).toHaveBeenCalledWith('test-service', expect.any(Error));
    });
  });

  describe('expected errors', () => {
    it('should not count expected errors towards failure threshold', async () => {
      const cbWithExpectedErrors = new CircuitBreaker('test-expected', {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: (error: Error) => error.message.includes('expected'),
      });

      const expectedError = new Error('This is an expected error');
      const unexpectedError = new Error('Unexpected error');

      mockOperation.mockRejectedValueOnce(expectedError);
      mockOperation.mockRejectedValueOnce(expectedError);
      mockOperation.mockRejectedValueOnce(unexpectedError);

      // Expected errors shouldn't count
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('expected');
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('expected');
      
      // Should still be closed
      expect(cbWithExpectedErrors.getStats().state).toBe(CircuitBreakerState.CLOSED);
      
      // Unexpected error should count
      await expect(cbWithExpectedErrors.execute(mockOperation)).rejects.toThrow('Unexpected');
      
      // Should still be closed (only 1 unexpected failure)
      expect(cbWithExpectedErrors.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('manual control', () => {
    it('should allow manual reset', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);

      circuitBreaker.reset();
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });

    it('should allow forcing open', () => {
      const forceOpenedSpy = jest.fn();
      circuitBreaker.on('forceOpened', forceOpenedSpy);

      circuitBreaker.forceOpen();

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
      expect(forceOpenedSpy).toHaveBeenCalledWith('test-service');
    });

    it('should allow forcing closed', () => {
      circuitBreaker.forceOpen();
      const forceClosedSpy = jest.fn();
      circuitBreaker.on('forceClosed', forceClosedSpy);

      circuitBreaker.forceClosed();

      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(forceClosedSpy).toHaveBeenCalledWith('test-service');
    });
  });

  describe('statistics', () => {
    it('should track success and failure counts', async () => {
      mockOperation.mockResolvedValueOnce('success1');
      mockOperation.mockResolvedValueOnce('success2');
      mockOperation.mockRejectedValueOnce(new Error('failure1'));

      await circuitBreaker.execute(mockOperation);
      await circuitBreaker.execute(mockOperation);
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();

      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.totalRequests).toBe(3);
    });

    it('should track last failure time', async () => {
      const beforeFailure = new Date();
      mockOperation.mockRejectedValue(new Error('failure'));

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();

      const stats = circuitBreaker.getStats();
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
      expect(stats.lastFailureTime!.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime());
    });
  });
});