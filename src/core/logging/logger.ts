import { appConfig } from '@/core/config/app-config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(): boolean {
  return appConfig.enableDevLogs;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog()) {
    return;
  }

  const prefix = `[inbox-lite:${level}]`;
  if (context) {
    console.log(prefix, message, context);
    return;
  }
  console.log(prefix, message);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    write('debug', message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    write('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    write('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    write('error', message, context);
  },
};
