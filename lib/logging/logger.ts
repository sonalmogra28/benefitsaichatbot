/**
 * Centralized Logging System
 * Provides structured logging for the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log('error', message, context, error);
  }

  securityEvent(message: string, context?: Record<string, any>): void {
    this.log('warn', `SECURITY: ${message}`, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
  }

  apiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.log('info', `API ${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration,
      ...context,
    });
  }

  auditEvent(message: string, context?: Record<string, any>): void {
    this.log('info', `AUDIT: ${message}`, {
      ...context,
      auditEvent: true,
      timestamp: new Date().toISOString(),
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // In development, log to console
    if (this.isDevelopment) {
      this.logToConsole(logEntry);
    }

    // In production, you would typically send to a logging service
    if (this.isProduction) {
      this.logToService(logEntry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, error } = entry;
    
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    const logData = context ? { ...context, error: error?.message } : { error: error?.message };

    switch (level) {
      case 'debug':
        console.debug(logMessage, logData);
        break;
      case 'info':
        console.info(logMessage, logData);
        break;
      case 'warn':
        logger.warn(logMessage, logData);
        break;
      case 'error':
        logger.error(logMessage, logData);
        if (error) {
          logger.error(error.stack || 'Unknown error');
        }
        break;
    }
  }

  private logToService(entry: LogEntry): void {
    // In production, this would send logs to a service like:
    // - Azure Application Insights
    // - AWS CloudWatch
    // - Datadog
    // - Sentry
    // For now, just log to console
    this.logToConsole(entry);
  }
}

// Export singleton instance
export const logger = new Logger();
