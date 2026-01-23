import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogContext } from './logger';

describe('Logger', () => {
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
    trace: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Create fresh spies before each test
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore all spies after each test
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  describe('Log Levels', () => {
    it('should log ERROR messages', () => {
      logger.error('ERROR_TEST_MESSAGE');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain('ERROR_TEST_MESSAGE');
    });

    it('should log WARN messages', () => {
      logger.warn('WARN_TEST_MESSAGE');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const call = consoleSpy.warn.mock.calls[0][0];
      expect(call).toContain('WARN_TEST_MESSAGE');
    });

    it('should log INFO messages', () => {
      logger.info('INFO_TEST_MESSAGE');
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('INFO_TEST_MESSAGE');
    });

    it('should not log DEBUG messages when level is INFO', () => {
      logger.debug('DEBUG_TEST_MESSAGE');
      // DEBUG is below INFO level, so it shouldn't log
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should not log TRACE messages when level is INFO', () => {
      logger.trace('TRACE_TEST_MESSAGE');
      // TRACE is below INFO level, so it shouldn't log
      expect(consoleSpy.trace).not.toHaveBeenCalled();
    });
  });

  describe('Log Formatting', () => {
    it('should format messages with timestamp and level', () => {
      logger.info('FORMAT_TEST_MESSAGE');
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(call).toContain('[INFO]');
      expect(call).toContain('FORMAT_TEST_MESSAGE');
    });

    it('should include context in formatted message', () => {
      const context: LogContext = {
        component: 'TestComponent',
        userId: 'user123',
      };
      logger.info('CONTEXT_TEST_MESSAGE', context);
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('[TestComponent]');
      expect(call).toContain('[userId:user123]');
      expect(call).toContain('CONTEXT_TEST_MESSAGE');
    });

    it('should include data in formatted message', () => {
      const data = { key: 'value', number: 42 };
      logger.info('DATA_TEST_MESSAGE', undefined, data);
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain(JSON.stringify(data));
      expect(call).toContain('DATA_TEST_MESSAGE');
    });
  });

  describe('Context Formatting', () => {
    it('should format context with component', () => {
      const context: LogContext = { component: 'AuthService' };
      logger.info('COMPONENT_TEST_MESSAGE', context);
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('[AuthService]');
      expect(call).toContain('COMPONENT_TEST_MESSAGE');
    });

    it('should format context with multiple fields', () => {
      const context: LogContext = {
        component: 'LevelEditor',
        levelId: 'level123',
        operation: 'save',
      };
      logger.info('MULTI_CONTEXT_TEST_MESSAGE', context);
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('[LevelEditor]');
      expect(call).toContain('[levelId:level123]');
      expect(call).toContain('[operation:save]');
      expect(call).toContain('MULTI_CONTEXT_TEST_MESSAGE');
    });
  });
});
