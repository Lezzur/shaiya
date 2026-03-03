import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createManualContentAssetSchema, paginationSchema } from '@/lib/validations';
import {
  UserRole,
  ActivityModule,
  ContentAssetType,
  InternalStatus,
  ClientStatus,
  Prisma
} from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/assets
 * List content assets with filters and pagination
 * Protected: ADMIN, TEAM roles
 *
 * Query params:
 * - clientId: filter by client
 * - type: filter by ContentAssetType
 * - internalStatus: filter by InternalStatus
 * - clientStatus: filter by ClientStatus
 * - search: search metadata captions
 * - page: pagination page (default 1)
 * - limit: items per page (default 24 for gallery grid)
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);

      // Parse pagination with gallery-friendly defaults
      const paginationResult = paginationSchema.safeParse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit') || '24',
      });
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 24 };

      // Parse filters
      const clientId = searchParams.get('clientId') || undefined;
      const type = searchParams.get('type') as ContentAssetType | undefined;
      const internalStatus = searchParams.get('internalStatus') as InternalStatus | undefined;
      const clientStatus = searchParams.get('clientStatus') as ClientStatus | undefined;
      const search = searchParams.get('search') || undefined;

      // Build where clause
      const where: Prisma.ContentAssetWhereInput = {};

      if (clientId) {
        where.clientId = clientId;
      }

      if (type && Object.values(ContentAssetType).includes(type)) {
        where.type = type;
      }

      if (internalStatus && Object.values(InternalStatus).includes(internalStatus)) {
        where.internalStatus = internalStatus;
      }

      if (clientStatus && Object.values(ClientStatus).includes(clientStatus)) {
        where.clientStatus = clientStatus;
      }

      // Search in metadata (JSON search)
      if (search) {
        where.OR = [
          {
            metadata: {
              path: ['caption'],
              string_contains: search,
            },
          },
          {
            metadata: {
              path: ['description'],
              string_contains: search,
            },
          },
        ];
      }

      // Execute query with counts
      const [assets, total] = await Promise.all([
        db.contentAsset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            generationJob: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        }),
        db.contentAsset.count({ where }),
      ]);

      return NextResponse.json({
        data: assets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching content assets:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch content assets' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/content-engine/assets
 * Create content asset manually (not via generation job)
 * Protected: ADMIN, TEAM roles
 *
 * Body: { clientId, projectId?, type, fileUrl, thumbnailUrl?, metadata? }
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createManualContentAssetSchema.safeParse(body);
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
      });

      if (!client) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Client not found' },
          { status: 404 }
        );
      }

      // Verify project exists if provided
      if (data.projectId) {
        const project = await db.project.findUnique({
          where: { id: data.projectId },
        });

        if (!project) {
          return NextResponse.json(
            { error: 'NotFound', message: 'Project not found' },
            { status: 404 }
          );
        }

        // Verify project belongs to client
        if (project.clientId !== data.clientId) {
          return NextResponse.json(
            { error: 'BadRequest', message: 'Project does not belong to the specified client' },
            { status: 400 }
          );
        }
      }

      // Create the content asset
      const asset = await db.contentAsset.create({
        data: {
          clientId: data.clientId,
          projectId: data.projectId,
          type: data.type,
          fileUrl: data.fileUrl,
          thumbnailUrl: data.thumbnailUrl,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
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
          entityType: 'content_asset',
          entityId: asset.id,
          metadata: {
            clientName: client.name,
            assetType: asset.type,
          },
        });
      }

      return NextResponse.json({ data: asset }, { status: 201 });
    } catch (error) {
      console.error('Error creating content asset:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create content asset' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
