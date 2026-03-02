import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { UserRole, AuthMethod, ActivityModule } from '@/generated/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * POST /api/auth/invite
 * Invite a new team member.
 * Body: { email, name, role }
 * - Create user with role, authMethod=PASSWORD, random temporary password
 * - In a real system, you'd email them a password-set link. For V1,
 *   just return the temporary password in the response (to be shown once).
 * - Log activity (module: SYSTEM, action: 'user_invited')
 * Protected: ADMIN only
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const session = await req.json();
      const { email, name, role } = session;

      // Validate required fields
      if (!email || !name || !role) {
        return NextResponse.json(
          { error: 'Missing required fields: email, name, role' },
          { status: 400 }
        );
      }

      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be ADMIN, TEAM, or CLIENT' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      // Generate random temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Get current user for activity log
      const { auth } = await import('@/lib/auth');
      const currentSession = await auth();

      // Create the new user
      const newUser = await db.user.create({
        data: {
          email,
          name,
          role: role as UserRole,
          authMethod: AuthMethod.PASSWORD,
          passwordHash,
        },
      });

      // Log activity
      if (currentSession?.user?.id) {
        await db.activityLog.create({
          data: {
            actorId: currentSession.user.id,
            module: ActivityModule.SYSTEM,
            action: 'user_invited',
            entityType: 'User',
            entityId: newUser.id,
            metadata: {
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
            },
          },
        });
      }

      // Return user info with temporary password
      return NextResponse.json(
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            createdAt: newUser.createdAt,
          },
          tempPassword,
          message:
            'User invited successfully. Share this temporary password securely (shown only once).',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error inviting user:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
