/**
 * Centralized logging system
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  maxEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false, // File logging disabled in browser environment
      maxEntries: 1000,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? ` | Error: ${entry.error.message}` : '';
    const userStr = entry.userId ? ` | User: ${entry.userId}` : '';
    const requestStr = entry.requestId ? ` | Request: ${entry.requestId}` : '';
    
    return `[${timestamp}] ${levelName}: ${entry.message}${userStr}${requestStr}${contextStr}${errorStr}`;
  }

  private addEntry(entry: LogEntry): void {
    // Add to memory store
    this.entries.push(entry);
    
    // Keep only the last maxEntries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole && this.shouldLog(entry.level)) {
      const message = this.formatMessage(entry);
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(message);
          if (entry.error) console.error(entry.error);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.DEBUG:
          console.debug(message);
          break;
      }
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.addEntry({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      error,
      context,
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addEntry({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context,
    });
  }

  info(message: string, context?: Record<string, any>): void {
    this.addEntry({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context,
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addEntry({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context,
    });
  }

  // Context-aware logging methods
  withContext(userId?: string, requestId?: string) {
    return {
      error: (message: string, error?: Error, context?: Record<string, any>) => {
        this.addEntry({
          level: LogLevel.ERROR,
          message,
          timestamp: new Date(),
          error,
          context,
          userId,
          requestId,
        });
      },
      warn: (message: string, context?: Record<string, any>) => {
        this.addEntry({
          level: LogLevel.WARN,
          message,
          timestamp: new Date(),
          context,
          userId,
          requestId,
        });
      },
      info: (message: string, context?: Record<string, any>) => {
        this.addEntry({
          level: LogLevel.INFO,
          message,
          timestamp: new Date(),
          context,
          userId,
          requestId,
        });
      },
      debug: (message: string, context?: Record<string, any>) => {
        this.addEntry({
          level: LogLevel.DEBUG,
          message,
          timestamp: new Date(),
          context,
          userId,
          requestId,
        });
      },
    };
  }

  // Get recent log entries
  getRecentLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filteredEntries = this.entries;
    
    if (level !== undefined) {
      filteredEntries = this.entries.filter(entry => entry.level <= level);
    }
    
    return filteredEntries.slice(-limit);
  }

  // Get logs for specific user
  getUserLogs(userId: string, limit = 50): LogEntry[] {
    return this.entries
      .filter(entry => entry.userId === userId)
      .slice(-limit);
  }

  // Clear logs (useful for development)
  clear(): void {
    this.entries = [];
  }

  // Get system stats
  getStats() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;

    const recent24h = this.entries.filter(entry => entry.timestamp.getTime() > last24h);
    const recent1h = this.entries.filter(entry => entry.timestamp.getTime() > last1h);

    return {
      totalEntries: this.entries.length,
      last24h: {
        total: recent24h.length,
        errors: recent24h.filter(e => e.level === LogLevel.ERROR).length,
        warnings: recent24h.filter(e => e.level === LogLevel.WARN).length,
      },
      last1h: {
        total: recent1h.length,
        errors: recent1h.filter(e => e.level === LogLevel.ERROR).length,
        warnings: recent1h.filter(e => e.level === LogLevel.WARN).length,
      },
      config: this.config,
    };
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Convenience function to create a request-scoped logger
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.withContext(userId, requestId);
}

// Export types
export type { LogEntry, LoggerConfig };