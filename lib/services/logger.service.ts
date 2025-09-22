/**
 * Centralized logging service for the application
 * Supports multiple log levels and destinations (console, cloud logging)
 */

import { getLoggingConfig, getEnvironment } from '@/config/environments';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  companyId?: string;
  sessionId?: string;
  requestId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  environment: string;
}

class Logger {
  private static instance: Logger;
  private config = getLoggingConfig();
  private environment = getEnvironment();

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.level;

    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const env = entry.environment.padEnd(11);

    let message = `[${timestamp}] [${level}] [${env}] ${entry.message}`;

    if (entry.context) {
      message += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      message += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.environment === 'development') {
        message += `\n${entry.error.stack}`;
      }
    }

    return message;
  }

  private async logToConsole(entry: LogEntry): Promise<void> {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(entry);

    // In production, console logging should be handled by the runtime
    // In development, we can use console methods for debugging
    if (this.environment === 'development') {
      switch (entry.level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
  }

  private async logToCloud(entry: LogEntry): Promise<void> {
    if (!this.config.enableCloudLogging) return;

    try {
      // For now, just log to console in production
      // In a real implementation, this would send to Azure Application Insights
      console.log(`[CLOUD] ${JSON.stringify(entry)}`);
    } catch (error) {
      // Fallback: cloud logging failed, but we can't use console here as it would create a cycle
      // Log to stderr directly only in development
      if (
        this.environment === 'development' &&
        typeof process !== 'undefined'
      ) {
        process.stderr.write(`Failed to write to cloud logs: ${error}\n`);
      }
    }
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      environment: this.environment,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Log to multiple destinations
    await Promise.all([this.logToConsole(entry), this.logToCloud(entry)]);
  }

  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  // Specialized logging methods
  public logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const message = `API ${method} ${path} - ${statusCode} (${duration}ms)`;
    const level: LogLevel =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, message, context);
  }

  public logAuthEvent(
    event: 'login' | 'logout' | 'signup' | 'password-reset',
    userId?: string,
    success = true,
    context?: LogContext,
  ): void {
    const message = `Auth event: ${event} - ${success ? 'Success' : 'Failed'}`;
    const level: LogLevel = success ? 'info' : 'warn';

    this.log(level, message, { ...context, userId, action: event });
  }

  public logAIInteraction(
    model: string,
    tokensUsed: number,
    duration: number,
    success: boolean,
    context?: LogContext,
  ): void {
    const message = `AI interaction with ${model} - ${tokensUsed} tokens in ${duration}ms`;
    const level: LogLevel = success ? 'info' : 'error';

    this.log(level, message, {
      ...context,
      metadata: {
        model,
        tokensUsed,
        duration,
        success,
      },
    });
  }

  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext,
  ): void {
    const message = `Security event: ${event} (Severity: ${severity})`;
    const level: LogLevel =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.log(level, message, { ...context, action: `security:${event}` });
  }

  // Performance logging
  public startTimer(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.debug(`Performance: ${label} took ${duration}ms`);
    };
  }

  // Structured logging for monitoring
  public metric(
    name: string,
    value: number,
    unit = '',
    tags?: Record<string, string>,
  ): void {
    this.info(`Metric: ${name}`, {
      metadata: {
        metricName: name,
        value,
        unit,
        tags,
      },
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) =>
  logger.warn(message, context);
export const logError = (
  message: string,
  error?: Error,
  context?: LogContext,
) => logger.error(message, error, context);
