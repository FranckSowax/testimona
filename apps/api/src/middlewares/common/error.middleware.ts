import express from 'express';
import logger from '../../services/commons/logger.service';

/**
 * Wraps an async route handler to catch errors and pass them to Express error handler.
 * Eliminates the need for try/catch in every controller method.
 */
export function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('Unhandled route error', {
        method: req.method,
        path: req.path,
        error: err.message,
      });
      next(err);
    });
  };
}

/**
 * Global error handling middleware.
 * Must be registered AFTER all routes.
 */
export function globalErrorHandler(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  logger.error('Global error handler', { error: err.message, stack: err.stack });

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
