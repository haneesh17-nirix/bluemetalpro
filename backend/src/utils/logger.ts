import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'bluemetal-api',
    env: process.env.NODE_ENV,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,service,env',
          },
        },
      }),
});

export function logAction(
  event: string,
  detail: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  logger[level]({ ...detail, event });
}
