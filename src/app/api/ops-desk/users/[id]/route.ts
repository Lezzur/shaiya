import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { UserRole } from '@/generated/prisma';

/**
 * GET /api/ops-desk/users/:id
 * Get a single user by ID with their assigned projects.
 * Protected: ADMIN, TEAM
 */
export const GET = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const userId = (await context?.params)?.id;

      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          assignedProjects: {
            where: {
              status: {
                not: 'DELIVERED',
              },
            },
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              deadline: 'asc',
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const response = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        capacity: user.capacity,
        skills: user.skills,
        assignedProjects: user.assignedProjects.map((project) => ({
          id: project.id,
          title: project.title,
          status: project.status,
          deadline: project.deadline,
          client: project.client,
        })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
