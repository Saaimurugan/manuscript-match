/**
 * ErrorLogger Usage Examples
 * Demonstrates how to use the ErrorLogger utility in React components
 */

import React, { useEffect, useState } from 'react';
import { errorLogger, LogLevel, ExternalServices } from '../services/errorLogger';

// Example component that demonstrates ErrorLogger usage
export const ErrorLoggerDemo: React.FC = () => {
  const [logStats, setLogStats] = useState<Record<string, number>>({});
  const [config, setConfig] = useState(errorLogger.getConfig());

  useEffect(() => {
    // Configure external services (example)
    if (process.env.NODE_ENV === 'production') {
      // Example: Add Sentry integration
      // errorLogger.addExternalService(ExternalServices.Sentry('YOUR_SENTRY_DSN'));
      
      // Example: Add custom API endpoint
      // errorLogger.addExternalService(ExternalServices.CustomAPI('/api/logs', 'your-api-key'));
    }

    // Update stats periodically
    const interval = setInterval(() => {
      setLogStats(errorLogger.getLogStatistics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDebugLog = () => {
    errorLogger.debug('Debug message from demo', { 
      component: 'ErrorLoggerDemo',
      action: 'debug_button_click',
      timestamp: new Date().toISOString()
    });
  };

  const handleInfoLog = () => {
    errorLogger.info('Info message from demo', { 
      component: 'ErrorLoggerDemo',
      action: 'info_button_click',
      user: 'demo_user'
    });
  };

  const handleWarningLog = () => {
    errorLogger.warn('Warning message from demo', { 
      component: 'ErrorLoggerDemo',
      action: 'warning_button_click',
      reason: 'demonstration'
    });
  };

  const handleErrorLog = () => {
    const demoError = new Error('Demo error for testing');
    errorLogger.error('Error message from demo', demoError, undefined, { 
      component: 'ErrorLoggerDemo',
      action: 'error_button_click',
      severity: 'medium'
    });
  };

  const handleCriticalLog = () => {
    const criticalError = new Error('Critical demo error');
    criticalError.stack = `Error: Critical demo error
    at handleCriticalLog (ErrorLoggerDemo.tsx:65:25)
    at onClick (ErrorLoggerDemo.tsx:120:5)`;
    
    errorLogger.critical('Critical error from demo', criticalError, undefined, { 
      component: 'ErrorLoggerDemo',
      action: 'critical_button_click',
      impact: 'high',
      requiresImmediate: true
    });
  };

  const handleConfigUpdate = () => {
    const newConfig = {
      minLevel: config.minLevel === LogLevel.DEBUG ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsoleLogging: !config.enableConsoleLogging,
    };
    
    errorLogger.updateConfig(newConfig);
    setConfig(errorLogger.getConfig());
  };

  const handleFlushLogs = async () => {
    try {
      await errorLogger.flush();
      errorLogger.info('Logs flushed successfully');
    } catch (error) {
      errorLogger.error('Failed to flush logs', error as Error);
    }
  };

  const handleClearLogs = () => {
    errorLogger.clearLocalLogEntries();
    setLogStats(errorLogger.getLogStatistics());
    errorLogger.info('Local logs cleared');
  };

  const handleViewLogs = () => {
    const entries = errorLogger.getLocalLogEntries();
    console.group('📋 Local Log Entries');
    entries.forEach((entry, index) => {
      console.log(`${index + 1}.`, {
        level: LogLevel[entry.level],
        message: entry.message,
        timestamp: entry.timestamp,
        context: entry.context,
        error: entry.error?.message,
      });
    });
    console.groupEnd();
    
    errorLogger.info('Log entries displayed in console', { 
      totalEntries: entries.length 
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ErrorLogger Demo</h1>
      
      {/* Configuration Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <strong>Min Level:</strong> {LogLevel[config.minLevel]}
          </div>
          <div>
            <strong>Console Logging:</strong> {config.enableConsoleLogging ? 'Enabled' : 'Disabled'}
          </div>
          <div>
            <strong>Local Storage:</strong> {config.enableLocalStorage ? 'Enabled' : 'Disabled'}
          </div>
          <div>
            <strong>Remote Logging:</strong> {config.enableRemoteLogging ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <button
          onClick={handleConfigUpdate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Config
        </button>
      </div>

      {/* Statistics Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Log Statistics</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{logStats.total || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{logStats.error || 0}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">{logStats.critical || 0}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{logStats.warn || 0}</div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{logStats.info || 0}</div>
            <div className="text-sm text-gray-600">Info</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{logStats.debug || 0}</div>
            <div className="text-sm text-gray-600">Debug</div>
          </div>
        </div>
      </div>

      {/* Logging Actions */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Logging</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={handleDebugLog}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Log Debug
          </button>
          <button
            onClick={handleInfoLog}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Log Info
          </button>
          <button
            onClick={handleWarningLog}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Log Warning
          </button>
          <button
            onClick={handleErrorLog}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Log Error
          </button>
          <button
            onClick={handleCriticalLog}
            className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
          >
            Log Critical
          </button>
        </div>
      </div>

      {/* Management Actions */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Log Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={handleViewLogs}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            View Logs
          </button>
          <button
            onClick={handleFlushLogs}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Flush Logs
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click the logging buttons to generate different types of log entries</li>
          <li>Check the browser console to see the formatted log output</li>
          <li>Use "View Logs" to see all stored log entries in the console</li>
          <li>Toggle configuration to see how it affects logging behavior</li>
          <li>Use "Flush Logs" to send logs to external services (if configured)</li>
          <li>Use "Clear Logs" to remove all local log entries</li>
        </ol>
      </div>
    </div>
  );
};

// Example of using ErrorLogger in error boundaries
export const withErrorLogging = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        errorLogger.error(
          'Unhandled error in component',
          new Error(error.message),
          undefined,
          {
            component: Component.name,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
          }
        );
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        errorLogger.error(
          'Unhandled promise rejection in component',
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          undefined,
          {
            component: Component.name,
            type: 'promise_rejection',
          }
        );
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, []);

    return <Component {...props} />;
  };
};

// Example hook for using ErrorLogger in functional components
export const useErrorLogger = (componentName: string) => {
  const logError = (message: string, error?: Error, context?: Record<string, any>) => {
    errorLogger.error(message, error, undefined, {
      component: componentName,
      ...context,
    });
  };

  const logWarning = (message: string, context?: Record<string, any>) => {
    errorLogger.warn(message, {
      component: componentName,
      ...context,
    });
  };

  const logInfo = (message: string, context?: Record<string, any>) => {
    errorLogger.info(message, {
      component: componentName,
      ...context,
    });
  };

  const logDebug = (message: string, context?: Record<string, any>) => {
    errorLogger.debug(message, {
      component: componentName,
      ...context,
    });
  };

  return {
    logError,
    logWarning,
    logInfo,
    logDebug,
    logger: errorLogger,
  };
};

export default ErrorLoggerDemo;