import mongoose from 'mongoose';
import { Response } from 'express';
import { createErrorResponse } from './errors';

export function validateObjectId(id: string, res: Response, entityName = 'ID'): boolean {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json(
      createErrorResponse(`Invalid ${entityName}`, `${entityName} must be a valid MongoDB ObjectId`)
    );
    return false;
  }
  return true;
}

export function validateObjectIds(ids: string[], res: Response, entityName = 'IDs'): string[] | null {
  const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    res.status(400).json(
      createErrorResponse(`Invalid ${entityName}`, `Invalid ObjectIds: ${invalidIds.join(', ')}`)
    );
    return null;
  }
  return ids;
}

