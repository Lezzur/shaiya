import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createModelSchema } from '@/lib/validations';
import { UserRole, ActivityModule, Prisma } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/models
 * List all models with optional isActive filter
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);

      // Parse filters
      const isActiveParam = searchParams.get('isActive');

      // Build where clause
      const where: Prisma.ModelRegistryWhereInput = {};

      if (isActiveParam !== null && isActiveParam !== undefined) {
        // Parse boolean from string
        where.isActive = isActiveParam === 'true';
      }

      // Execute query
      const models = await db.modelRegistry.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ data: models });
    } catch (error) {
      console.error('Error fetching models:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch models' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/content-engine/models
 * Create a new model registry entry
 * Protected: ADMIN role only
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createModelSchema.safeParse(body);
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

      // Create the model registry entry
      const model = await db.modelRegistry.create({
        data: {
          name: data.name,
          provider: data.provider,
          endpoint: data.endpoint,
          costPerUnit: data.costPerUnit,
          unitType: data.unitType,
          qualityBenchmark: data.qualityBenchmark,
          isActive: data.isActive ?? true,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'created',
          entityType: 'model_registry',
          entityId: model.id,
          metadata: { name: model.name, provider: model.provider },
        });
      }

      return NextResponse.json({ data: model }, { status: 201 });
    } catch (error) {
      console.error('Error creating model:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create model' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
