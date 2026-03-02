import { auth } from './auth';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma';

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

interface WithAuthOptions {
  roles?: UserRole[];
}

/**
 * Wraps an API route handler with authentication and optional role checks.
 * Returns 401 if not authenticated, 403 if role not permitted.
 */
export function withAuth(
  handler: RouteHandler,
  options?: WithAuthOptions
): RouteHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (options?.roles && options.roles.length > 0) {
      if (!options.roles.includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    return handler(req, context);
  };
}

/**
 * Gets the current session or throws a 401 error.
 * Use in API routes where authentication is required.
 */
export async function getRequiredSession() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthError('Unauthorized', 401);
  }

  return session;
}

/**
 * Gets the current session and extracts clientId for CLIENT role users.
 * Throws 401 if not authenticated, 403 if not a CLIENT role.
 * Use in portal API routes where client data isolation is required.
 */
export async function getClientSession() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthError('Unauthorized', 401);
  }

  if (session.user.role !== UserRole.CLIENT) {
    throw new AuthError('Forbidden: Client access only', 403);
  }

  if (!session.user.clientId) {
    throw new AuthError('Forbidden: No client associated', 403);
  }

  return {
    session,
    clientId: session.user.clientId,
  };
}

/**
 * Custom error class for auth-related errors with HTTP status codes.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Helper to convert AuthError to NextResponse in API routes.
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
