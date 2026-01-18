// ============================================================================
// Production Logger
// ============================================================================
// Environment-aware logging that suppresses debug/info in production
// while preserving warn/error messages for monitoring

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging (development only)
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging (development only)
   * Use for general informational messages
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning-level logging (always visible)
   * Use for recoverable issues or deprecation notices
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging (always visible)
   * Use for errors that should be monitored
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Performance timing helper (development only)
   */
  time: (label: string) => {
    if (isDev) {
      console.time(`[PERF] ${label}`);
    }
  },

  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(`[PERF] ${label}`);
    }
  },

  /**
   * Group logging helper (development only)
   */
  group: (label: string) => {
    if (isDev) {
      console.group(`[GROUP] ${label}`);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

// Type-safe log levels for conditional logging
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log at a specific level
 */
export function log(level: LogLevel, ...args: unknown[]) {
  logger[level](...args);
}
