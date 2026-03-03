import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createBrandProfileSchema } from '@/lib/validations';
import { UserRole, ActivityModule, Prisma } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/brand-profiles
 * List all brand profiles with client name
 * Supports ?clientId= filter
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId') || undefined;

      // Build where clause
      const where: Prisma.BrandProfileWhereInput = {};

      if (clientId) {
        where.clientId = clientId;
      }

      // Fetch brand profiles with client info
      const brandProfiles = await db.brandProfile.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ data: brandProfiles });
    } catch (error) {
      console.error('Error fetching brand profiles:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch brand profiles' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/content-engine/brand-profiles
 * Create a new brand profile
 * Protected: ADMIN role only
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createBrandProfileSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      const data = validationResult.data;

      // Verify client exists
      const client = await db.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, name: true },
      });

      if (!client) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Client not found' },
          { status: 404 }
        );
      }

      // Check if brand profile already exists for this client
      const existingProfile = await db.brandProfile.findUnique({
        where: { clientId: data.clientId },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Conflict', message: 'A brand profile already exists for this client' },
          { status: 409 }
        );
      }

      // Create brand profile
      const brandProfile = await db.brandProfile.create({
        data: {
          clientId: data.clientId,
          colors: data.colors as Prisma.InputJsonValue,
          typography: data.typography as Prisma.InputJsonValue,
          toneOfVoice: data.toneOfVoice,
          targetAudience: data.targetAudience,
          exampleUrls: data.exampleUrls || [],
          styleRefUrls: data.styleRefUrls || [],
          characterSheets: data.characterSheets as Prisma.InputJsonValue,
        },
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
          action: 'created',
          entityType: 'brand_profile',
          entityId: brandProfile.id,
          metadata: { clientName: client.name },
        });
      }

      return NextResponse.json({ data: brandProfile }, { status: 201 });
    } catch (error) {
      console.error('Error creating brand profile:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create brand profile' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
