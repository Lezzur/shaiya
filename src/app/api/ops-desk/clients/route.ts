import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createClientSchema, paginationSchema, sortSchema } from '@/lib/validations';
import { UserRole, ActivityModule, HealthStatus, Prisma } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/ops-desk/clients
 * List clients with search, filter, pagination, and sorting
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);

      // Parse pagination
      const paginationResult = paginationSchema.safeParse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
      });
      const { page, limit } = paginationResult.success
        ? paginationResult.data
        : { page: 1, limit: 20 };

      // Parse sorting
      const sortResult = sortSchema.safeParse({
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
      });
      const { sortBy, sortOrder } = sortResult.success
        ? sortResult.data
        : { sortBy: 'name', sortOrder: 'asc' as const };

      // Parse filters
      const search = searchParams.get('search') || undefined;
      const healthStatus = searchParams.get('healthStatus') as HealthStatus | undefined;

      // Build where clause
      const where: Prisma.ClientWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (healthStatus && Object.values(HealthStatus).includes(healthStatus)) {
        where.healthStatus = healthStatus;
      }

      // Build orderBy clause
      const orderBy: Prisma.ClientOrderByWithRelationInput = {};
      if (sortBy === 'monthlyValue') {
        orderBy.monthlyValue = sortOrder;
      } else {
        orderBy.name = sortOrder;
      }

      // Execute query with counts
      const [clients, total] = await Promise.all([
        db.client.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: {
              select: {
                projects: true,
                invoices: true,
              },
            },
          },
        }),
        db.client.count({ where }),
      ]);

      return NextResponse.json({
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch clients' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/ops-desk/clients
 * Create a new client
 * Protected: ADMIN role only
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createClientSchema.safeParse(body);
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

      // Create the client
      const client = await db.client.create({
        data: {
          name: data.name,
          logo: data.logo,
          industry: data.industry,
          packageTier: data.packageTier,
          monthlyValue: data.monthlyValue,
          lifetimeValue: data.lifetimeValue,
          primaryContactId: data.primaryContactId,
          healthStatus: data.healthStatus,
          renewalDate: data.renewalDate,
          r2BucketPath: data.r2BucketPath,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.OPS_DESK,
          action: 'created',
          entityType: 'client',
          entityId: client.id,
          metadata: { clientName: client.name },
        });
      }

      return NextResponse.json({ data: client }, { status: 201 });
    } catch (error) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create client' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
