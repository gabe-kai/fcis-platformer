# Unified Logging Plan

## Overview

This document defines the unified logging strategy for the FCIS Platformer Game Editor. Consistent logging is critical for debugging, monitoring, and maintaining the application across all development phases.

## Logging Principles

1. **Consistency:** All logs follow the same format and structure
2. **Context:** Every log includes sufficient context for debugging
3. **Levels:** Appropriate log levels used consistently
4. **Performance:** Logging should not significantly impact performance
5. **Privacy:** No sensitive user data in logs
6. **Structured:** Logs are structured for easy parsing and analysis

## Log Levels

We use the standard log levels with specific use cases:

### ERROR
- **When:** Application errors, exceptions, failures
- **Examples:**
  - Uncaught exceptions
  - API failures
  - Critical operation failures
  - Data corruption
- **Action Required:** Yes - requires investigation
- **Format:** `[ERROR] [Component] [Context] Message | Error details`

### WARN
- **When:** Unexpected situations that don't break functionality
- **Examples:**
  - Deprecated API usage
  - Performance degradation
  - Invalid user input (handled gracefully)
  - Missing optional resources
- **Action Required:** Monitor - may need attention
- **Format:** `[WARN] [Component] [Context] Message | Details`

### INFO
- **When:** Important application flow events
- **Examples:**
  - User authentication
  - Game save/load operations
  - Level export/import
  - Sharing operations
  - Major state changes
- **Action Required:** No - informational only
- **Format:** `[INFO] [Component] [Context] Message | Relevant data`

### DEBUG
- **When:** Detailed information for debugging
- **Examples:**
  - Function entry/exit
  - Variable values
  - State transitions
  - API request/response details
- **Action Required:** No - development/debugging only
- **Format:** `[DEBUG] [Component] [Context] Message | Debug data`

### TRACE
- **When:** Very detailed execution flow
- **Examples:**
  - Loop iterations
  - Individual pixel operations
  - Frequent state updates
- **Action Required:** No - very verbose, use sparingly
- **Format:** `[TRACE] [Component] [Context] Message | Trace data`

## Log Format

### Standard Format
```
[TIMESTAMP] [LEVEL] [COMPONENT] [CONTEXT] Message | Additional Data
```

### Format Components

1. **TIMESTAMP:** ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
2. **LEVEL:** One of ERROR, WARN, INFO, DEBUG, TRACE
3. **COMPONENT:** Source component/service (e.g., `AuthService`, `LevelEditor`, `GameEngine`)
4. **CONTEXT:** Additional context (e.g., `userId:123`, `levelId:abc`, `operation:save`)
5. **Message:** Human-readable message
6. **Additional Data:** Structured JSON object (optional)

### Examples

```
2024-01-15T10:30:45.123Z [INFO] [AuthService] [userId:user123] User authenticated successfully | {"provider": "google", "email": "user@example.com"}
2024-01-15T10:31:12.456Z [ERROR] [LevelEditor] [levelId:level456] Failed to save level | {"error": "Storage quota exceeded", "levelSize": 5242880}
2024-01-15T10:32:00.789Z [WARN] [GraphicsManager] [gameId:game789] Large image uploaded | {"size": 10485760, "format": "PNG", "dimensions": "2048x2048"}
2024-01-15T10:33:15.234Z [DEBUG] [CameraController] [levelId:level456] Camera position updated | {"x": 1200, "y": 800, "mode": "free_movement"}
```

## Component Logging Guidelines

### Authentication Service
- **INFO:** Login attempts (success/failure), logout, token refresh
- **WARN:** Invalid credentials, expired tokens, rate limiting
- **ERROR:** Authentication failures, token validation errors

### Storage Service
- **INFO:** Save/load operations, storage quota checks
- **WARN:** Storage quota warnings, slow operations
- **ERROR:** Storage failures, data corruption, quota exceeded

### Game Engine
- **INFO:** Game start/stop, level transitions, checkpoint saves
- **DEBUG:** Frame rate, physics updates, collision detection
- **ERROR:** Rendering errors, physics errors, game crashes

### Level Editor
- **INFO:** Level create/delete, platform placement, property changes
- **DEBUG:** Canvas operations, tool selection, grid operations
- **ERROR:** Editor errors, save failures, invalid operations

### Graphics Manager
- **INFO:** Graphics upload, assignment, deletion
- **WARN:** Large file uploads, unsupported formats, storage warnings
- **ERROR:** Upload failures, image processing errors

### Export Service
- **INFO:** Export operations, PDF generation, page tiling
- **DEBUG:** Grid calculations, alignment mark generation
- **ERROR:** Export failures, PDF generation errors

### Scan Service
- **INFO:** Scan upload, processing start/complete, reconstruction
- **DEBUG:** Alignment mark detection, image processing steps
- **WARN:** Low confidence detections, manual correction needed
- **ERROR:** Processing failures, reconstruction errors

### Sharing Service
- **INFO:** Share operations, library access, import/export
- **WARN:** Permission issues, content moderation flags
- **ERROR:** Sharing failures, network errors

### Camera Controller
- **DEBUG:** Camera position updates, mode changes, scroll calculations
- **WARN:** Boundary violations, performance issues
- **ERROR:** Camera system failures

## Logging Implementation

### Logger Interface

```typescript
interface Logger {
  error(message: string, context?: LogContext, data?: object): void;
  warn(message: string, context?: LogContext, data?: object): void;
  info(message: string, context?: LogContext, data?: object): void;
  debug(message: string, context?: LogContext, data?: object): void;
  trace(message: string, context?: LogContext, data?: object): void;
}

interface LogContext {
  userId?: string;
  gameId?: string;
  levelId?: string;
  component?: string;
  operation?: string;
  [key: string]: any;
}
```

### Logger Implementation

```typescript
// src/utils/logger.ts
class Logger implements Logger {
  private logLevel: LogLevel;
  private enabled: boolean;

  constructor(level: LogLevel = 'INFO', enabled: boolean = true) {
    this.logLevel = level;
    this.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    
    const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
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
export const logger = new Logger(
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'INFO',
  import.meta.env.PROD ? false : true // Disable in production by default
);
```

### Usage Examples

```typescript
// In services
import { logger } from '@/utils/logger';

// Simple log
logger.info('User authenticated', { component: 'AuthService', userId: user.id });

// With additional data
logger.error('Failed to save level', 
  { component: 'LevelEditor', levelId: level.id, operation: 'save' },
  { error: error.message, stack: error.stack }
);

// Debug logging
logger.debug('Camera position updated',
  { component: 'CameraController', levelId: level.id },
  { x: camera.x, y: camera.y, mode: camera.mode }
);
```

## Environment-Specific Configuration

### Development
- **Level:** DEBUG
- **Output:** Console (browser dev tools)
- **Format:** Full format with colors
- **Storage:** No persistence

### Staging
- **Level:** INFO
- **Output:** Console + Remote logging service
- **Format:** Full format
- **Storage:** Remote logging (e.g., Sentry, LogRocket)

### Production
- **Level:** WARN (ERROR and WARN only)
- **Output:** Remote logging service only
- **Format:** Structured JSON
- **Storage:** Remote logging with error tracking
- **Privacy:** Sanitize all user data

## Log Sanitization

Never log:
- Passwords or authentication tokens
- Full user email addresses (use hashed or partial)
- Personal information (names, addresses)
- Complete file contents (log metadata only)
- Sensitive API keys

Always sanitize:
- User IDs (use hashed versions in production)
- File paths (remove user-specific paths)
- Error messages (remove stack traces in production)

## Performance Considerations

1. **Conditional Logging:** Check log level before expensive operations
   ```typescript
   if (logger.isDebugEnabled()) {
     logger.debug('Expensive operation', context, expensiveData());
   }
   ```

2. **Async Logging:** Use async logging for remote services
   ```typescript
   logger.errorAsync(message, context, data); // Non-blocking
   ```

3. **Batch Logging:** Batch multiple logs when possible
4. **Rate Limiting:** Limit log frequency for high-frequency events
5. **Log Sampling:** Sample DEBUG/TRACE logs in production

## Error Tracking Integration

### Sentry (Recommended)
```typescript
// src/utils/errorTracking.ts
import * as Sentry from '@sentry/react';

export function initErrorTracking() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        // Sanitize sensitive data
        return sanitizeEvent(event);
      }
    });
  }
}

// Integrate with logger
logger.error = (message, context, data) => {
  // ... existing logging
  if (import.meta.env.PROD) {
    Sentry.captureException(new Error(message), {
      extra: { context, data }
    });
  }
};
```

## Logging Checklist

For every feature/component:
- [ ] Identify key operations to log
- [ ] Use appropriate log levels
- [ ] Include relevant context
- [ ] Add structured data where helpful
- [ ] Test logging in development
- [ ] Verify no sensitive data in logs
- [ ] Check performance impact
- [ ] Document any special logging requirements

## Monitoring and Alerts

### Key Metrics to Monitor
- Error rate (ERROR logs per minute)
- Warning rate (WARN logs per minute)
- Critical operation failures
- Performance degradation warnings
- User action failures

### Alert Thresholds
- **Critical:** > 10 errors per minute
- **Warning:** > 50 warnings per minute
- **Info:** Monitor trends, no alerts

## Review and Maintenance

- **Weekly:** Review error logs for patterns
- **Monthly:** Review log volume and performance impact
- **Quarterly:** Update logging guidelines based on learnings
- **As needed:** Adjust log levels based on production needs

---

**Document Version:** 1.0  
**Last Updated:** [Date]  
**Status:** Active - Follow for all development
