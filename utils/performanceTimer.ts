// Performance timing utility for measuring operation latency
import { logger, shouldLog } from './logging';

export interface TimerResult {
  label: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export interface PerformanceTimer {
  end: () => TimerResult;
  endWithLog: (level?: 'debug' | 'info' | 'warn') => TimerResult;
  getElapsed: () => number;
}

class Timer implements PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end(): TimerResult {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    return {
      label: this.label,
      duration,
      startTime: this.startTime,
      endTime
    };
  }

  endWithLog(level: 'debug' | 'info' | 'warn' = 'info'): TimerResult {
    const result = this.end();
    
    // Use console methods directly to avoid duplicate prefixes from logger
    switch(level) {
      case 'debug':
        if (shouldLog('DEBUG')) {
          console.log(`⏱️ [TIMER] ${this.label}: ${result.duration.toFixed(0)}ms`);
        }
        break;
      case 'info':
        if (shouldLog('INFO')) {
          console.log(`⏱️ [TIMER] ${this.label}: ${result.duration.toFixed(0)}ms`);
        }
        break;
      case 'warn':
        if (shouldLog('WARN')) {
          console.warn(`⏱️ [TIMER] ${this.label}: ${result.duration.toFixed(0)}ms`);
        }
        break;
    }
    
    return result;
  }

  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

export const performanceTimer = {
  /**
   * Start timing an operation
   * @param label - Name of the operation being timed
   * @returns Timer instance with end() method
   */
  start: (label: string): PerformanceTimer => {
    return new Timer(label);
  },

  /**
   * Time a synchronous operation
   * @param label - Name of the operation
   * @param operation - Function to execute and time
   * @param level - Log level for the timing result
   * @returns Result of the operation
   */
  timeSync: <T>(
    label: string, 
    operation: () => T, 
    level: 'debug' | 'info' | 'warn' = 'info'
  ): T => {
    const timer = performanceTimer.start(label);
    try {
      const result = operation();
      timer.endWithLog(level);
      return result;
    } catch (error) {
      timer.endWithLog('warn');
      throw error;
    }
  },

  /**
   * Time an asynchronous operation
   * @param label - Name of the operation
   * @param operation - Async function to execute and time
   * @param level - Log level for the timing result
   * @returns Promise with the result of the operation
   */
  timeAsync: async <T>(
    label: string, 
    operation: () => Promise<T>, 
    level: 'debug' | 'info' | 'warn' = 'info'
  ): Promise<T> => {
    const timer = performanceTimer.start(label);
    try {
      const result = await operation();
      timer.endWithLog(level);
      return result;
    } catch (error) {
      timer.endWithLog('warn');
      throw error;
    }
  },

  /**
   * Time multiple operations and log summary
   * @param label - Name of the batch operation
   * @param operations - Array of operations to time
   * @param level - Log level for the timing results
   * @returns Array of results
   */
  timeBatch: async <T>(
    label: string,
    operations: Array<{ name: string; operation: () => Promise<T> }>,
    level: 'debug' | 'info' | 'warn' = 'info'
  ): Promise<T[]> => {
    const batchTimer = performanceTimer.start(label);
    const results: T[] = [];
    const timings: Array<{ name: string; duration: number }> = [];

    for (const { name, operation } of operations) {
      const timer = performanceTimer.start(`${label} - ${name}`);
      try {
        const result = await operation();
        const timing = timer.end();
        results.push(result);
        timings.push({ name, duration: timing.duration });
      } catch (error) {
        timer.endWithLog('warn');
        throw error;
      }
    }

    const batchResult = batchTimer.end();
    const totalTime = batchResult.duration;
    const avgTime = totalTime / operations.length;
    
    const message = `⏱️ [TIMER] ${label} - Total: ${totalTime.toFixed(0)}ms, Avg: ${avgTime.toFixed(0)}ms, Count: ${operations.length}`;
    
    switch(level) {
      case 'debug':
        logger.debug(message);
        logger.debug(`⏱️ [TIMER] ${label} - Individual timings:`, timings);
        break;
      case 'info':
        logger.info(message);
        break;
      case 'warn':
        logger.warn(message);
        break;
    }

    return results;
  }
};

// Convenience functions for common use cases
export const timeOperation = performanceTimer.timeSync;
export const timeAsyncOperation = performanceTimer.timeAsync;
export const timeBatchOperations = performanceTimer.timeBatch;
