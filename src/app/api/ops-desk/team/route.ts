import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { UserRole } from '@/generated/prisma';

/**
 * GET /api/ops-desk/team
 * List all users with role ADMIN or TEAM.
 * Include count of assigned projects (where status not DELIVERED) and total capacity hours.
 * Sort by name.
 * Protected: ADMIN, TEAM
 */
export const GET = withAuth(
  async () => {
    try {
      const users = await db.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.TEAM],
          },
        },
        include: {
          assignedProjects: {
            where: {
              status: {
                not: 'DELIVERED',
              },
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      const teamMembers = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        capacity: user.capacity,
        skills: user.skills,
        assignedProjectsCount: user.assignedProjects.length,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return NextResponse.json(teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
