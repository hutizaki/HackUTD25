import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface EnvConfig {
  // MongoDB (support both MONGO_URL and template format)
  MONGO_URL?: string;
  MONGODB_URI_LOCAL?: string;
  MONGODB_URI_PROD?: string;

  // Auth
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  COOKIE_NAME: string;
  COOKIE_DOMAIN: string;
  CSRF_SECRET: string; // CSRF secret (can use JWT_SECRET or separate)
  CSRF_COOKIE_NAME: string; // Name for CSRF secret cookie

  // Server
  NODE_ENV: string;
  PORT: string;
  CORS_ORIGIN: string;
  MAX_JSON_SIZE?: string; // Maximum JSON body size (e.g., "10mb")
  MAX_URLENCODED_SIZE?: string; // Maximum URL-encoded body size (e.g., "1mb")

  // Cursor AI - Role-specific API keys
  PM_CLOUD_AGENT_API_KEY?: string; // Product Manager agent API key
  DEV_CLOUD_AGENT_API_KEY?: string; // Developer agent API key
  QA_CLOUD_AGENT_API_KEY?: string; // QA agent API key
}

/**
 * Validates and returns environment variables
 * @throws Error if required environment variables are missing
 */
export function getEnvConfig(): EnvConfig {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'COOKIE_NAME',
    'COOKIE_DOMAIN',
    'NODE_ENV',
    'PORT',
    'CORS_ORIGIN',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // At least one MongoDB URI must be provided (support MONGO_URL or template format)
  if (!process.env.MONGO_URL && !process.env.MONGODB_URI_LOCAL && !process.env.MONGODB_URI_PROD) {
    throw new Error(
      'Either MONGO_URL, MONGODB_URI_LOCAL, or MONGODB_URI_PROD must be provided'
    );
  }

  // CSRF secret defaults to JWT_SECRET if not provided
  const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET!;
  const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'csrf_secret';

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. Use a strong random string.'
    );
  }
  if (jwtSecret.length > 512) {
    throw new Error('JWT_SECRET must be less than 512 characters long');
  }
  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', 'jwt_secret', 'change_me', 'your_secret'];
  if (weakSecrets.some((weak) => jwtSecret.toLowerCase().includes(weak))) {
    throw new Error(
      'JWT_SECRET appears to be weak. Use a strong random string (e.g., generated with: openssl rand -base64 32)'
    );
  }

  // Request size limits (defaults: 10MB for JSON, 1MB for URL-encoded)
  const maxJsonSize = process.env.MAX_JSON_SIZE || '10mb';
  const maxUrlencodedSize = process.env.MAX_URLENCODED_SIZE || '1mb';

  // Cursor API keys (role-specific, optional)
  const pmCloudAgentApiKey = process.env.PM_CLOUD_AGENT_API_KEY;
  const devCloudAgentApiKey = process.env.DEV_CLOUD_AGENT_API_KEY;
  const qaCloudAgentApiKey = process.env.QA_CLOUD_AGENT_API_KEY;

  return {
    MONGO_URL: process.env.MONGO_URL,
    MONGODB_URI_LOCAL: process.env.MONGODB_URI_LOCAL,
    MONGODB_URI_PROD: process.env.MONGODB_URI_PROD,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
    COOKIE_NAME: process.env.COOKIE_NAME!,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN!,
    CSRF_SECRET: csrfSecret,
    CSRF_COOKIE_NAME: csrfCookieName,
    NODE_ENV: process.env.NODE_ENV!,
    PORT: process.env.PORT!,
    CORS_ORIGIN: process.env.CORS_ORIGIN!,
    MAX_JSON_SIZE: maxJsonSize,
    MAX_URLENCODED_SIZE: maxUrlencodedSize,
    PM_CLOUD_AGENT_API_KEY: pmCloudAgentApiKey,
    DEV_CLOUD_AGENT_API_KEY: devCloudAgentApiKey,
    QA_CLOUD_AGENT_API_KEY: qaCloudAgentApiKey,
  };
}

/**
 * Gets the MongoDB URI to use (MONGO_URL takes precedence, then local takes precedence in development)
 */
export function getMongoUri(): string {
  const config = getEnvConfig();
  const isDevelopment = config.NODE_ENV === 'development';

  // MONGO_URL takes precedence (our project format)
  if (config.MONGO_URL) {
    return config.MONGO_URL;
  }

  // Template format: local takes precedence in development
  if (isDevelopment && config.MONGODB_URI_LOCAL) {
    return config.MONGODB_URI_LOCAL;
  }

  if (config.MONGODB_URI_PROD) {
    return config.MONGODB_URI_PROD;
  }

  if (config.MONGODB_URI_LOCAL) {
    return config.MONGODB_URI_LOCAL;
  }

  throw new Error('No MongoDB URI available');
}

// Export individual config values for convenience
export const env = getEnvConfig();

/**
 * Get Cursor API key for a specific agent type
 * @param agentType Agent type (spec-writer, developer-implementer, qa-tester, etc.)
 * @returns API key for the agent type, or undefined if not configured
 */
export function getCursorApiKeyForAgent(agentType: string): string | undefined {
  const config = getEnvConfig();
  
  // Map agent types to their corresponding API keys
  const pmAgentTypes = ['spec-writer', 'roadmap-decomposer', 'acceptance-criteria-author', 'issue-planner', 'release-manager'];
  const devAgentTypes = ['developer-implementer', 'refactorer', 'test-author', 'code-reviewer', 'infra-deploy-engineer'];
  const qaAgentTypes = ['qa-tester', 'security-auditor'];
  
  if (pmAgentTypes.includes(agentType)) {
    return config.PM_CLOUD_AGENT_API_KEY;
  } else if (devAgentTypes.includes(agentType)) {
    return config.DEV_CLOUD_AGENT_API_KEY;
  } else if (qaAgentTypes.includes(agentType)) {
    return config.QA_CLOUD_AGENT_API_KEY;
  }
  
  return undefined;
}

/**
 * Check if any Cursor API keys are configured
 * @returns true if at least one API key is configured
 */
export function hasAnyCursorApiKey(): boolean {
  const config = getEnvConfig();
  return !!(config.PM_CLOUD_AGENT_API_KEY || config.DEV_CLOUD_AGENT_API_KEY || config.QA_CLOUD_AGENT_API_KEY);
}

