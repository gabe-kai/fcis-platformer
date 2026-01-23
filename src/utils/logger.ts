type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  component?: string;
  userId?: string;
  gameId?: string;
  levelId?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Logger {
  error(message: string, context?: LogContext, data?: object): void;
  warn(message: string, context?: LogContext, data?: object): void;
  info(message: string, context?: LogContext, data?: object): void;
  debug(message: string, context?: LogContext, data?: object): void;
  trace(message: string, context?: LogContext, data?: object): void;
}

class LoggerImpl implements Logger {
  private logLevel: LogLevel;
  private enabled: boolean;

  constructor(level: LogLevel = 'INFO', enabled: boolean = true) {
    this.logLevel = level;
    this.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;

    const levels: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);

    return messageIndex >= currentIndex;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    data?: object
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? this.formatContext(context) : '';
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';

    return `[${timestamp}] [${level}] ${contextStr}${message}${dataStr}`;
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    if (context.component) parts.push(`[${context.component}]`);
    if (context.userId) parts.push(`[userId:${context.userId}]`);
    if (context.gameId) parts.push(`[gameId:${context.gameId}]`);
    if (context.levelId) parts.push(`[levelId:${context.levelId}]`);
    if (context.operation) parts.push(`[operation:${context.operation}]`);

    return parts.join(' ') + ' ';
  }

  error(message: string, context?: LogContext, data?: object): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, context, data));
      // In production, send to error tracking service
    }
  }

  warn(message: string, context?: LogContext, data?: object): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, context, data));
    }
  }

  info(message: string, context?: LogContext, data?: object): void {
    if (this.shouldLog('INFO')) {
      console.info(this.formatMessage('INFO', message, context, data));
    }
  }

  debug(message: string, context?: LogContext, data?: object): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(this.formatMessage('DEBUG', message, context, data));
    }
  }

  trace(message: string, context?: LogContext, data?: object): void {
    if (this.shouldLog('TRACE')) {
      console.trace(this.formatMessage('TRACE', message, context, data));
    }
  }
}

// Export singleton instance
export const logger = new LoggerImpl(
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'INFO',
  import.meta.env.PROD ? false : true // Disable in production by default
);
