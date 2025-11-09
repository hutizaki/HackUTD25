import { Request, Response, NextFunction } from 'express';
import { ErrorMessages, createErrorResponse } from './errors';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Route error:', error);
      res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR));
    });
  };
}

