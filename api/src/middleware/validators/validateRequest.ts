import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createErrorResponse, ErrorMessages } from '../../utils/errors';

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || 'Validation failed';
      res.status(400).json(
        createErrorResponse(ErrorMessages.VALIDATION_FAILED, errorMessage, result.error.issues)
      );
      return;
    }
    req.body = result.data; // Use validated data
    next();
  };
}

