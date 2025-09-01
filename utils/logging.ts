// Logging configuration and utility
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

const config = {
  logging: {
    level: 'debug' as LogLevel // 'error' | 'warn' | 'info' | 'debug'
  }
};

// Get current log level
export const getLogLevel = (): LogLevel => {
  // Check if user has set a custom log level
  const customLevel = localStorage.getItem('LOG_LEVEL') as LogLevel;
  if (customLevel && LOG_LEVELS[customLevel] !== undefined) {
    return customLevel;
  }
  
  // Check environment variable
  if (typeof process !== 'undefined' && process.env.LOG_LEVEL) {
    const envLevel = process.env.LOG_LEVEL.toUpperCase() as LogLevel;
    if (LOG_LEVELS[envLevel] !== undefined) {
      return envLevel;
    }
  }
  
  // Default to config
  return config.logging.level;
};

// Check if we should log at this level
export const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
};

// Logger utility
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (shouldLog('ERROR')) {
      console.error(` ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (shouldLog('WARN')) {
      console.warn(` ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (shouldLog('INFO')) {
      console.info(` ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('DEBUG')) {
      console.debug(` ${message}`, ...args);
    }
  },
  
  log: (message: string, ...args: any[]) => {
    if (shouldLog('DEBUG')) {
      console.debug(` ${message}`, ...args);
    }
  }
};

// Set log level at runtime
export const setLogLevel = (level: LogLevel): void => {
  if (LOG_LEVELS[level] !== undefined) {
    localStorage.setItem('LOG_LEVEL', level);
    console.info(`ℹ️ [INFO] Log level set to: ${level}`);
  } else {
    console.error(`🚨 [ERROR] Invalid log level: ${level}`);
  }
};

// Get available log levels
export const getAvailableLogLevels = (): LogLevel[] => {
  return Object.keys(LOG_LEVELS) as LogLevel[];
};
