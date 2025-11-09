import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { RoleGroup } from '../models/RoleGroup';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { csrfProtection } from '../middleware/csrf';
import { logSecurityEvent, SecurityEventType } from '../config/logger';
import { validatePasswordStrength, getPasswordPolicyDescription } from '../utils/passwordValidation';
import { sanitizeEmail, sanitizeName } from '../utils/sanitize';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { logActivity } from '../utils/activityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';

const router = Router();

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Zod validation schemas
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine(
      (password) => {
        const validation = validatePasswordStrength(password);
        return validation.isValid;
      },
      {
        message: getPasswordPolicyDescription(),
      }
    ),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Helper function to set JWT cookie and create session
 */
async function setJwtCookieAndCreateSession(
  req: Request,
  res: Response,
  userId: string
): Promise<string> {
  const payload = { userId };
  const secret = env.JWT_SECRET;
  // Type assertion needed because JWT_EXPIRES_IN is a string but SignOptions expects StringValue
  const options = {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions;
  const token = jwt.sign(payload, secret, options);

  const isProduction = env.NODE_ENV === 'production';

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: isProduction, // Allow JavaScript access in development for debugging
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  // Calculate expiration date from JWT expiresIn
  const expiresInMs = parseJwtExpiresIn(env.JWT_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInMs);

  // Create session record
  const session = new Session({
    userId,
    token,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    expiresAt,
    lastActivity: new Date(),
    revoked: false,
  });

  await session.save();

  return token;
}

/**
 * Parse JWT expiresIn string to milliseconds
 * Supports formats: "7d", "24h", "3600s", "3600000ms", or number in seconds
 */
function parseJwtExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms]|ms)?$/);
  if (!match) {
    // Default to 7 days if format is invalid
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    case 'ms':
      return value;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      // Check if password validation failed and provide detailed errors
      const passwordIssue = validationResult.error.issues.find(
        (issue) => issue.path[0] === 'password'
      );
      
      if (passwordIssue && req.body.password) {
        // Run password validation to get detailed errors
        const passwordValidation = validatePasswordStrength(req.body.password);
        if (!passwordValidation.isValid) {
          res.status(400).json(
            createErrorResponse(
              ErrorMessages.PASSWORD_VALIDATION_FAILED,
              undefined,
              passwordValidation.errors.map((error) => ({
                path: ['password'],
                message: error,
              }))
            )
          );
          return;
        }
      }

      res.status(400).json(
        createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
      );
      return;
    }

    const { email, password, name } = validationResult.data;

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedName = sanitizeName(name);

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser) {
      res.status(409).json(createErrorResponse(ErrorMessages.USER_EXISTS));
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email: sanitizedEmail,
      name: sanitizedName,
      passwordHash,
    });

    await user.save();

    // Assign default roles from all role groups that require one
    const roleGroupsWithDefaults = await RoleGroup.find({
      requiresOne: true,
      defaultRoleId: { $exists: true, $ne: null },
    }).populate('defaultRoleId');

    const defaultRoleIds: mongoose.Types.ObjectId[] = [];
    for (const group of roleGroupsWithDefaults) {
      if (group.defaultRoleId) {
        const defaultRoleId = (group.defaultRoleId as any)._id
          ? (group.defaultRoleId as any)._id
          : group.defaultRoleId;
        if (defaultRoleId) {
          defaultRoleIds.push(
            defaultRoleId instanceof mongoose.Types.ObjectId
              ? defaultRoleId
              : new mongoose.Types.ObjectId(defaultRoleId)
          );
        }
      }
    }

    // Assign default roles to user
    if (defaultRoleIds.length > 0) {
      user.roles = defaultRoleIds;
      await user.save();
    }

    // Generate JWT, set cookie, and create session
    const userId = (user._id as { toString: () => string }).toString();
    await setJwtCookieAndCreateSession(req, res, userId);

    // Log registration
    await logActivity(req, 'register', { success: true });

    // Return user (passwordHash excluded by toJSON transform)
    res.status(201).json({
      data: {
        id: userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * POST /auth/login
 * Login an existing user
 */
router.post(
  '/login',
  authLimiter,
  csrfProtection,
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body; // Already validated by middleware

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email
    const user = await User.findOne({ email: sanitizedEmail });

    // Timing attack mitigation: Always perform password comparison
    // Use dummy hash if user doesn't exist to maintain constant-time response
    const dummyHash = '$2b$10$dummyhashfordummycomparison1234567890123456789012';
    const dummyPassword = 'dummy_password_for_timing_protection_12345';

    let isPasswordValid = false;
    if (user) {
      // User exists: perform real password comparison
      isPasswordValid = await user.comparePassword(password);
    } else {
      // User doesn't exist: perform dummy comparison to maintain constant time
      await bcrypt.compare(dummyPassword, dummyHash);
      isPasswordValid = false;
    }

    // Log security event and return error if authentication failed
    if (!user || !isPasswordValid) {
      logSecurityEvent({
        type: SecurityEventType.AUTH_FAILED,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        email: sanitizedEmail,
        userId: user ? (user._id as { toString: () => string }).toString() : undefined,
        requestId: req.requestId,
        details: {
          reason: user ? 'Invalid password' : 'User not found',
          // Don't reveal which reason in the response - same error message for both
        },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.INVALID_CREDENTIALS));
      return;
    }

    // Generate JWT, set cookie, and create session
    const userId = (user._id as { toString: () => string }).toString();
    await setJwtCookieAndCreateSession(req, res, userId);

    // Log successful login
    await logActivity(req, 'login', { success: true });

    // Return user (passwordHash excluded by toJSON transform)
    res.json({
      data: {
        id: userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * POST /auth/logout
 * Logout user (clear cookie and revoke session)
 */
router.post(
  '/logout',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies[env.COOKIE_NAME];

    // Revoke session if token exists
    if (token) {
      await Session.updateOne(
        { token, revoked: false },
        { $set: { revoked: true } }
      );
    }

    // Log logout (if user was authenticated)
    if (req.userId) {
      await logActivity(req, 'logout', { success: true });
    }

    const isProduction = env.NODE_ENV === 'production';
    
    res.clearCookie(env.COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
      httpOnly: isProduction,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });

    res.json({ message: ErrorMessages.LOGOUT_SUCCESS });
  })
);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
    return;
  }

  // Transform _id to id to match frontend User type
  res.json({
    data: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      createdAt: req.user.createdAt,
    },
  });
});

export default router;

