/**
 * Generic Zod validation middleware factory.
 *
 * Replaces the per-route Joi boilerplate with a single, type-safe helper.
 * Validates `body`, `query`, or `params` against a Zod schema and stores the
 * parsed (and coerced) result on `req.validated.{body|query|params}`.
 */
import express from 'express';
import { ZodError, type ZodSchema } from 'zod';

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

type Source = 'body' | 'query' | 'params';

export function validate<T>(
  schema: ZodSchema<T>,
  source: Source = 'body',
): express.RequestHandler {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'request validation failed',
          details: formatZodError(result.error),
        },
      });
      return;
    }
    req.validated = req.validated ?? {};
    req.validated[source] = result.data;
    next();
  };
}

function formatZodError(err: ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}
