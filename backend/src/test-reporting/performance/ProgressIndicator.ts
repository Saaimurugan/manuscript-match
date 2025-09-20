/**
 * Progress Indicator System
 * 
 * Provides comprehensive progress tracking and indicators for long-running
 * report generation processes with console output and event-based updates.
 */

import { EventEmitter } from 'events';

export interface ProgressConfig {
  showPercentage: boolean;
  showETA: boolean;
  showThroughput: boolean;
  showMemoryUsage: boolean;
  updateInterval: number; // milliseconds
  enableConsoleOutput: boolean;
  enableSpinner: boolean;
  barLength: number;
}

export interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  startTime: Date;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  throughput: number; // items per second
  memoryUsage: number; // MB
  stage: string;
  message: string;
}

export interface ProgressUpdate {
  current?: number;
  total?: number;
  stage?: string;
  message?: string;
  increment?: number;
}

export class ProgressIndicator extends EventEmitter {
  private config: ProgressConfig;
  private state: ProgressState;
  private updateTimer: NodeJS.Timeout | null = null;
  private spinnerTimer: NodeJS.Timeout | null = null;
  private spinnerIndex = 0;
  private readonly spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private lastConsoleOutput = '';

  constructor(config: Partial<ProgressConfig> = {}) {
    super();
    
    this.config = {
      showPercentage: true,
      showETA: true,
      showThroughput: true,
      showMemoryUsage: false,
      updateInterval: 100, // 100ms
      enableConsoleOutput: true,
      enableSpinner: true,
      barLength: 40,
      ...config
    };

    this.state = {
      current: 0,
      total: 100,
      percentage: 0,
      startTime: new Date(),
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      throughput: 0,
      memoryUsage: 0,
      stage: 'Initializing',
      message: ''
    };
  }

  /**
   * Start progress tracking
   */
  start(total: number, initialMessage = 'Starting...'): void {
    this.state = {
      current: 0,
      total,
      percentage: 0,
      startTime: new Date(),
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      throughput: 0,
      memoryUsage: 0,
      stage: 'Processing',
      message: initialMessage
    };

    if (this.config.enableConsoleOutput) {
      this.startConsoleUpdates();
    }

    if (this.config.enableSpinner) {
      this.startSpinner();
    }

    this.emit('started', this.state);
  }

  /**
   * Update progress
   */
  update(update: ProgressUpdate): void {
    const now = new Date();
    
    // Update current progress
    if (update.increment !== undefined) {
      this.state.current += update.increment;
    } else if (update.current !== undefined) {
      this.state.current = update.current;
    }

    // Update total if provided
    if (update.total !== undefined) {
      this.state.total = update.total;
    }

    // Update stage and message
    if (update.stage !== undefined) {
      this.state.stage = update.stage;
    }
    
    if (update.message !== undefined) {
      this.state.message = update.message;
    }

    // Calculate derived values
    this.state.percentage = this.state.total > 0 ? (this.state.current / this.state.total) * 100 : 0;
    this.state.elapsedTime = now.getTime() - this.state.startTime.getTime();
    
    // Calculate throughput (items per second)
    if (this.state.elapsedTime > 0) {
      this.state.throughput = (this.state.current / this.state.elapsedTime) * 1000;
    }

    // Calculate ETA
    if (this.state.throughput > 0 && this.state.current < this.state.total) {
      const remaining = this.state.total - this.state.current;
      this.state.estimatedTimeRemaining = (remaining / this.state.throughput) * 1000;
    } else {
      this.state.estimatedTimeRemaining = 0;
    }

    // Update memory usage if enabled
    if (this.config.showMemoryUsage) {
      const memUsage = process.memoryUsage();
      this.state.memoryUsage = memUsage.heapUsed / 1024 / 1024; // Convert to MB
    }

    this.emit('updated', this.state);
  }

  /**
   * Complete progress tracking
   */
  complete(message = 'Completed!'): void {
    this.state.current = this.state.total;
    this.state.percentage = 100;
    this.state.message = message;
    this.state.estimatedTimeRemaining = 0;

    this.stopUpdates();

    if (this.config.enableConsoleOutput) {
      this.renderConsoleOutput(true); // Final render
      console.log(); // New line after completion
    }

    this.emit('completed', this.state);
  }

  /**
   * Fail progress tracking
   */
  fail(error: string): void {
    this.state.message = `Failed: ${error}`;
    this.stopUpdates();

    if (this.config.enableConsoleOutput) {
      this.renderConsoleOutput(true);
      console.log(); // New line after failure
    }

    this.emit('failed', { ...this.state, error });
  }

  /**
   * Start console updates
   */
  private startConsoleUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.renderConsoleOutput();
    }, this.config.updateInterval);
  }

  /**
   * Start spinner animation
   */
  private startSpinner(): void {
    if (!this.config.enableSpinner) return;

    this.spinnerTimer = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length;
    }, 80); // Spinner animation speed
  }

  /**
   * Stop all updates
   */
  private stopUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = null;
    }
  }

  /**
   * Render console output
   */
  private renderConsoleOutput(final = false): void {
    if (!this.config.enableConsoleOutput) return;

    const parts: string[] = [];

    // Spinner
    if (this.config.enableSpinner && !final) {
      const spinnerChar = this.spinnerChars[this.spinnerIndex];
      if (spinnerChar) {
        parts.push(spinnerChar);
      }
    } else if (final) {
      parts.push(this.state.percentage === 100 ? '✅' : '❌');
    }

    // Stage
    parts.push(`[${this.state.stage}]`);

    // Progress bar
    const progressBar = this.createProgressBar();
    parts.push(progressBar);

    // Percentage
    if (this.config.showPercentage) {
      parts.push(`${this.state.percentage.toFixed(1)}%`);
    }

    // Current/Total
    parts.push(`(${this.state.current}/${this.state.total})`);

    // ETA
    if (this.config.showETA && this.state.estimatedTimeRemaining > 0) {
      const eta = this.formatDuration(this.state.estimatedTimeRemaining);
      parts.push(`ETA: ${eta}`);
    }

    // Throughput
    if (this.config.showThroughput && this.state.throughput > 0) {
      parts.push(`${this.state.throughput.toFixed(1)}/s`);
    }

    // Memory usage
    if (this.config.showMemoryUsage) {
      parts.push(`${this.state.memoryUsage.toFixed(1)}MB`);
    }

    // Message
    if (this.state.message) {
      parts.push(`- ${this.state.message}`);
    }

    const output = parts.join(' ');

    // Clear previous line and write new output
    if (this.lastConsoleOutput) {
      process.stdout.write('\r' + ' '.repeat(this.lastConsoleOutput.length) + '\r');
    }
    
    process.stdout.write(output);
    this.lastConsoleOutput = output;

    if (final) {
      process.stdout.write('\n');
      this.lastConsoleOutput = '';
    }
  }

  /**
   * Create progress bar string
   */
  private createProgressBar(): string {
    const filledLength = Math.floor((this.state.percentage / 100) * this.config.barLength);
    const emptyLength = this.config.barLength - filledLength;
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    return `[${filled}${empty}]`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Create a sub-progress indicator for nested operations
   */
  createSubProgress(
    weight: number, // Weight of this sub-operation (0-1)
    config?: Partial<ProgressConfig>
  ): SubProgressIndicator {
    return new SubProgressIndicator(this, weight, config);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopUpdates();
    this.removeAllListeners();
  }
}

/**
 * Sub-progress indicator for nested operations
 */
export class SubProgressIndicator extends EventEmitter {
  private subState: ProgressState;
  private weight: number;

  constructor(
    private parent: ProgressIndicator,
    weight: number,
    _config?: Partial<ProgressConfig>
  ) {
    super();
    this.weight = weight;
    
    this.subState = {
      current: 0,
      total: 100,
      percentage: 0,
      startTime: new Date(),
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      throughput: 0,
      memoryUsage: 0,
      stage: 'Sub-task',
      message: ''
    };
  }

  start(total: number, message = 'Starting sub-task...'): void {
    this.subState.total = total;
    this.subState.current = 0;
    this.subState.message = message;
    this.subState.startTime = new Date();
    
    this.emit('started', this.subState);
  }

  update(update: ProgressUpdate): void {
    // Update sub-state
    if (update.increment !== undefined) {
      this.subState.current += update.increment;
    } else if (update.current !== undefined) {
      this.subState.current = update.current;
    }

    if (update.total !== undefined) {
      this.subState.total = update.total;
    }

    if (update.message !== undefined) {
      this.subState.message = update.message;
    }

    // Calculate sub-progress percentage
    this.subState.percentage = this.subState.total > 0 ? 
      (this.subState.current / this.subState.total) * 100 : 0;

    // Update parent with weighted progress
    const weightedProgress = (this.subState.percentage / 100) * this.weight;
    this.parent.update({
      increment: weightedProgress,
      message: this.subState.message
    });

    this.emit('updated', this.subState);
  }

  complete(message = 'Sub-task completed!'): void {
    this.subState.current = this.subState.total;
    this.subState.percentage = 100;
    this.subState.message = message;

    // Ensure parent gets the full weighted progress
    const remainingProgress = this.weight - (this.subState.current / this.subState.total) * this.weight;
    if (remainingProgress > 0) {
      this.parent.update({ increment: remainingProgress });
    }

    this.emit('completed', this.subState);
  }

  getState(): ProgressState {
    return { ...this.subState };
  }
}

/**
 * Multi-stage progress tracker for complex operations
 */
export class MultiStageProgress extends EventEmitter {
  private stages: Array<{ name: string; weight: number }> = [];
  private currentStageIndex = 0;
  private mainProgress: ProgressIndicator;
  private currentSubProgress: SubProgressIndicator | null = null;

  constructor(config?: Partial<ProgressConfig>) {
    super();
    this.mainProgress = new ProgressIndicator(config);
  }

  /**
   * Define stages with their relative weights
   */
  defineStages(stages: Array<{ name: string; weight: number }>): void {
    // Normalize weights to sum to 1
    const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
    this.stages = stages.map(stage => ({
      name: stage.name,
      weight: stage.weight / totalWeight
    }));
  }

  /**
   * Start multi-stage progress
   */
  start(message = 'Starting multi-stage operation...'): void {
    this.mainProgress.start(100, message);
    this.emit('started');
  }

  /**
   * Start next stage
   */
  startStage(stageTotal: number, message?: string): SubProgressIndicator {
    if (this.currentStageIndex >= this.stages.length) {
      throw new Error('No more stages defined');
    }

    const stage = this.stages[this.currentStageIndex];
    if (!stage) {
      throw new Error('Stage not found');
    }

    const stageMessage = message || `Processing ${stage.name}...`;

    this.mainProgress.update({
      stage: stage.name,
      message: stageMessage
    });

    this.currentSubProgress = this.mainProgress.createSubProgress(stage.weight);
    this.currentSubProgress.start(stageTotal, stageMessage);

    this.emit('stageStarted', { stage: stage.name, index: this.currentStageIndex });
    return this.currentSubProgress;
  }

  /**
   * Complete current stage and move to next
   */
  completeStage(message?: string): void {
    if (this.currentSubProgress) {
      this.currentSubProgress.complete(message);
      this.currentSubProgress = null;
    }

    const currentStage = this.stages[this.currentStageIndex];
    if (currentStage) {
      this.emit('stageCompleted', { 
        stage: currentStage.name, 
        index: this.currentStageIndex 
      });
    }

    this.currentStageIndex++;
  }

  /**
   * Complete all stages
   */
  complete(message = 'All stages completed!'): void {
    if (this.currentSubProgress) {
      this.currentSubProgress.complete();
    }

    this.mainProgress.complete(message);
    this.emit('completed');
  }

  /**
   * Get main progress indicator
   */
  getMainProgress(): ProgressIndicator {
    return this.mainProgress;
  }

  /**
   * Get current stage progress
   */
  getCurrentStageProgress(): SubProgressIndicator | null {
    return this.currentSubProgress;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.currentSubProgress) {
      this.currentSubProgress.removeAllListeners();
    }
    this.mainProgress.destroy();
    this.removeAllListeners();
  }
}