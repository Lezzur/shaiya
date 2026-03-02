import { z } from 'zod';

/**
 * Environment variable validation
 * Validates all required environment variables at startup
 * Throws clear errors if required variables are missing
 */

const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Database
  DIRECT_DATABASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),

  // Cloudflare R2 (optional - only needed when using file storage)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // NextAuth / Authentication (add when implementing auth)
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // Email (add when implementing email)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // PayMongo (payment processing)
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_PUBLIC_KEY: z.string().optional(),
  PAYMONGO_WEBHOOK_SECRET: z.string().optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),

  // Feature flags
  ENABLE_ANALYTICS: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  ENABLE_EMAIL_NOTIFICATIONS: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
});

/**
 * Parsed and validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Get validated environment variables
 * Lazy loads and caches the result
 *
 * @throws {Error} If required environment variables are missing or invalid
 */
export function getEnv(): Env {
  if (_env) {
    return _env;
  }

  try {
    _env = envSchema.parse(process.env);
    return _env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

/**
 * Validate environment at startup
 * Call this in your application entry point to fail fast if config is invalid
 *
 * @example
 * // In app/layout.tsx or pages/_app.tsx
 * import { validateEnv } from '@/lib/env';
 * validateEnv();
 */
export function validateEnv(): void {
  getEnv();
  console.log('✓ Environment variables validated');
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof Pick<Env, 'ENABLE_ANALYTICS' | 'ENABLE_EMAIL_NOTIFICATIONS'>): boolean {
  const env = getEnv();
  return env[feature] as boolean;
}

/**
 * Get database URL (prefers DIRECT_DATABASE_URL for better performance)
 */
export function getDatabaseUrl(): string {
  const env = getEnv();
  return (
    env.DIRECT_DATABASE_URL ||
    env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable'
  );
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  const env = getEnv();
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME
  );
}

/**
 * Check if PayMongo is configured
 */
export function isPayMongoConfigured(): boolean {
  const env = getEnv();
  return !!(env.PAYMONGO_SECRET_KEY && env.PAYMONGO_PUBLIC_KEY);
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  const env = getEnv();
  return !!(
    env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASSWORD &&
    env.SMTP_FROM
  );
}

/**
 * Get application URL
 */
export function getAppUrl(): string {
  const env = getEnv();
  return env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'test';
}
