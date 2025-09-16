import { EventEmitter } from 'events';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: (error: Error) => boolean;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date | undefined;
  nextAttempt?: Date | undefined;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date | undefined;
  private nextAttempt?: Date | undefined;
  private resetTimer?: NodeJS.Timeout | undefined;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {
    super();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.nextAttempt && new Date() < this.nextAttempt) {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Next attempt at ${this.nextAttempt.toISOString()}`);
      }
      this.state = CircuitBreakerState.HALF_OPEN;
      this.emit('halfOpen', this.name);
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = undefined;
      this.nextAttempt = undefined;
      this.clearResetTimer();
      this.emit('closed', this.name);
    }
  }

  private onFailure(error: Error): void {
    // Check if this is an expected error that shouldn't count towards circuit breaking
    if (this.options.expectedErrors && this.options.expectedErrors(error)) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.scheduleReset();
      this.emit('opened', this.name, error);
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.scheduleReset();
      this.emit('opened', this.name, error);
    }
  }

  private scheduleReset(): void {
    this.clearResetTimer();
    this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
    
    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitBreakerState.OPEN) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.emit('halfOpen', this.name);
      }
    }, this.options.resetTimeout);
  }

  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
    this.clearResetTimer();
    this.emit('reset', this.name);
  }

  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.scheduleReset();
    this.emit('forceOpened', this.name);
  }

  forceClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.clearResetTimer();
    this.emit('forceClosed', this.name);
  }
}