import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { AppError } from '@cloudpackage/shared';
import type { ApiResponse } from '@cloudpackage/shared/types';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    (c as Context).status(err.status as StatusCode);
    return (c as Context).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    } satisfies ApiResponse);
  }

  console.error('Unhandled error:', err.message, err.stack);
  (c as Context).status(500);
  return (c as Context).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  } satisfies ApiResponse);
}
