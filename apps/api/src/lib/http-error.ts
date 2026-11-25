import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Logger } from './logger';

/** Throw from any handler to send a specific status and message. Express 5 forwards async throws. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Not found: ${req.method} ${req.path}`));
};

export function errorHandler(logger?: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request', issues: err.issues });
      return;
    }
    if (err instanceof HttpError) {
      res
        .status(err.status)
        .json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
      return;
    }
    // body-parser errors (malformed JSON, payload too large) carry their own status
    if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
      res.status(err.status).json({ error: err.expose ? err.message : 'Bad request' });
      return;
    }
    logger?.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Something went wrong' });
  };
}
