import { pino, type Logger, type LevelWithSilent } from 'pino';

export type { Logger };

export function createLogger(level: LevelWithSilent = 'info', pretty = false): Logger {
  return pino({
    level,
    // Never log secrets or personal data that may ride along on requests.
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.phone',
      '*.otp',
    ],
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : {}),
  });
}
