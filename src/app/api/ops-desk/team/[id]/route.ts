import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { UserRole } from '@/generated/prisma';

/**
 * GET /api/ops-desk/team/[id]
 * User detail with assigned projects list, capacity.
 * Protected: ADMIN, TEAM
 */
export const GET = withAuth(
  async (
    _req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => {
    try {
      const id = context?.params?.id;

      if (!id) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const user = await db.user.findUnique({
        where: { id },
        include: {
          assignedProjects: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
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

      // Only return ADMIN or TEAM members
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEAM) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
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
          timeTrackedMinutes: project.timeTrackedMinutes,
          createdAt: project.createdAt,
        })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
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

/**
 * PATCH /api/ops-desk/team/[id]
 * Update capacity, skills, role.
 * Protected: ADMIN only
 */
export const PATCH = withAuth(
  async (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => {
    try {
      const id = context?.params?.id;

      if (!id) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const { capacity, skills, role } = body;

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Only allow updating ADMIN or TEAM members
      if (
        existingUser.role !== UserRole.ADMIN &&
        existingUser.role !== UserRole.TEAM
      ) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Build update data object
      const updateData: {
        capacity?: number;
        skills?: string[];
        role?: UserRole;
      } = {};

      if (capacity !== undefined) {
        if (typeof capacity !== 'number' || capacity < 0) {
          return NextResponse.json(
            { error: 'Capacity must be a non-negative number' },
            { status: 400 }
          );
        }
        updateData.capacity = capacity;
      }

      if (skills !== undefined) {
        if (!Array.isArray(skills)) {
          return NextResponse.json(
            { error: 'Skills must be an array of strings' },
            { status: 400 }
          );
        }
        updateData.skills = skills;
      }

      if (role !== undefined) {
        if (!Object.values(UserRole).includes(role as UserRole)) {
          return NextResponse.json(
            { error: 'Invalid role. Must be ADMIN, TEAM, or CLIENT' },
            { status: 400 }
          );
        }
        updateData.role = role as UserRole;
      }

      // Update the user
      const updatedUser = await db.user.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        capacity: updatedUser.capacity,
        skills: updatedUser.skills,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
