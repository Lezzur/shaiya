import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updateBrandProfileSchema } from '@/lib/validations';
import { UserRole, ActivityModule, Prisma } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/brand-profiles/[id]
 * Get single brand profile by ID with client info
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Brand profile ID is required' },
          { status: 400 }
        );
      }

      const brandProfile = await db.brandProfile.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
              industry: true,
            },
          },
        },
      });

      if (!brandProfile) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Brand profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: brandProfile });
    } catch (error) {
      console.error('Error fetching brand profile:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch brand profile' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/brand-profiles/[id]
 * Update brand profile fields (partial update)
 * Protected: ADMIN, TEAM roles
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Brand profile ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updateBrandProfileSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      // Check if brand profile exists
      const existing = await db.brandProfile.findUnique({
        where: { id },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Brand profile not found' },
          { status: 404 }
        );
      }

      const data = validationResult.data;

      // Build update data - only include provided fields
      const updateData: Prisma.BrandProfileUpdateInput = {};

      if (data.colors !== undefined) {
        updateData.colors = data.colors as Prisma.InputJsonValue;
      }
      if (data.typography !== undefined) {
        updateData.typography = data.typography as Prisma.InputJsonValue;
      }
      if (data.toneOfVoice !== undefined) {
        updateData.toneOfVoice = data.toneOfVoice;
      }
      if (data.targetAudience !== undefined) {
        updateData.targetAudience = data.targetAudience;
      }
      if (data.exampleUrls !== undefined) {
        updateData.exampleUrls = data.exampleUrls;
      }
      if (data.styleRefUrls !== undefined) {
        updateData.styleRefUrls = data.styleRefUrls;
      }
      if (data.characterSheets !== undefined) {
        updateData.characterSheets = data.characterSheets as Prisma.InputJsonValue;
      }

      // Update brand profile
      const brandProfile = await db.brandProfile.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'updated',
          entityType: 'brand_profile',
          entityId: brandProfile.id,
          metadata: { clientName: existing.client.name },
        });
      }

      return NextResponse.json({ data: brandProfile });
    } catch (error) {
      console.error('Error updating brand profile:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update brand profile' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * DELETE /api/content-engine/brand-profiles/[id]
 * Delete brand profile
 * Protected: ADMIN role only
 * Returns 409 if there are GenerationJobs referencing this profile
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Brand profile ID is required' },
          { status: 400 }
        );
      }

      // Check if brand profile exists
      const existing = await db.brandProfile.findUnique({
        where: { id },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Brand profile not found' },
          { status: 404 }
        );
      }

      // Check for referencing GenerationJobs
      const jobCount = await db.generationJob.count({
        where: { brandProfileId: id },
      });

      if (jobCount > 0) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: `Cannot delete brand profile: ${jobCount} generation job(s) reference this profile`,
          },
          { status: 409 }
        );
      }

      // Delete brand profile
      const brandProfile = await db.brandProfile.delete({
        where: { id },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'deleted',
          entityType: 'brand_profile',
          entityId: brandProfile.id,
          metadata: { clientName: existing.client.name },
        });
      }

      return NextResponse.json({ data: brandProfile });
    } catch (error) {
      console.error('Error deleting brand profile:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to delete brand profile' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
