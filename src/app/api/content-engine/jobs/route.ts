import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { paginationSchema } from '@/lib/validations';
import { UserRole, GenerationJobStatus, Prisma } from '@/generated/prisma';

/**
 * GET /api/content-engine/jobs
 * List generation jobs with filters and pagination
 * Protected: ADMIN, TEAM roles
 *
 * Query params:
 * - clientId: filter by client UUID
 * - pipelineId: filter by pipeline UUID
 * - status: filter by GenerationJobStatus
 * - from: filter by createdAt >= ISO date
 * - to: filter by createdAt <= ISO date
 * - page: pagination page (default 1)
 * - limit: items per page (default 20)
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

      // Parse filters
      const clientId = searchParams.get('clientId') || undefined;
      const pipelineId = searchParams.get('pipelineId') || undefined;
      const status = searchParams.get('status') as GenerationJobStatus | undefined;
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      // Build where clause
      const where: Prisma.GenerationJobWhereInput = {};

      if (clientId) {
        where.clientId = clientId;
      }

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      if (status && Object.values(GenerationJobStatus).includes(status)) {
        where.status = status;
      }

      // Parse date filters with validation
      if (from || to) {
        where.createdAt = {};

        if (from) {
          const fromDate = new Date(from);
          if (isNaN(fromDate.getTime())) {
            return NextResponse.json(
              { error: 'ValidationError', message: 'Invalid from date. Must be a valid ISO date string.' },
              { status: 400 }
            );
          }
          where.createdAt.gte = fromDate;
        }

        if (to) {
          const toDate = new Date(to);
          if (isNaN(toDate.getTime())) {
            return NextResponse.json(
              { error: 'ValidationError', message: 'Invalid to date. Must be a valid ISO date string.' },
              { status: 400 }
            );
          }
          where.createdAt.lte = toDate;
        }
      }

      // Execute query with counts
      const [jobs, total] = await Promise.all([
        db.generationJob.findMany({
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
            pipeline: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        }),
        db.generationJob.count({ where }),
      ]);

      return NextResponse.json({
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching generation jobs:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch generation jobs' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
