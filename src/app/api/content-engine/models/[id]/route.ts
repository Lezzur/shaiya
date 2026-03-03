import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updateModelSchema } from '@/lib/validations';
import { UserRole, ActivityModule } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/models/[id]
 * Get single model with usage stats
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Model ID is required' },
          { status: 400 }
        );
      }

      // Fetch model with usage stats
      const model = await db.modelRegistry.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              apiUsageLogs: true,
            },
          },
        },
      });

      if (!model) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Model not found' },
          { status: 404 }
        );
      }

      // Transform response to include totalJobs count
      const responseData = {
        ...model,
        totalJobs: model._count.apiUsageLogs,
      };

      return NextResponse.json({ data: responseData });
    } catch (error) {
      console.error('Error fetching model:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch model' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/models/[id]
 * Update any model field
 * Protected: ADMIN role only
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Model ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updateModelSchema.safeParse(body);
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

      // Check if model exists
      const existing = await db.modelRegistry.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Model not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: {
        name?: string;
        provider?: string;
        endpoint?: string | null;
        costPerUnit?: number;
        unitType?: string;
        qualityBenchmark?: number | null;
        isActive?: boolean;
      } = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.provider !== undefined) updateData.provider = data.provider;
      if (data.endpoint !== undefined) updateData.endpoint = data.endpoint;
      if (data.costPerUnit !== undefined) updateData.costPerUnit = data.costPerUnit;
      if (data.unitType !== undefined) updateData.unitType = data.unitType;
      if (data.qualityBenchmark !== undefined) updateData.qualityBenchmark = data.qualityBenchmark;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Update model
      const model = await db.modelRegistry.update({
        where: { id },
        data: updateData,
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'updated',
          entityType: 'model_registry',
          entityId: model.id,
          metadata: { name: model.name, provider: model.provider },
        });
      }

      return NextResponse.json({ data: model });
    } catch (error) {
      console.error('Error updating model:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update model' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);

/**
 * DELETE /api/content-engine/models/[id]
 * Soft delete (set isActive to false) if ApiUsageLogs reference it.
 * Hard delete only if no ApiUsageLogs reference it.
 * Protected: ADMIN role only
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Model ID is required' },
          { status: 400 }
        );
      }

      // Check if model exists
      const existing = await db.modelRegistry.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              apiUsageLogs: true,
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Model not found' },
          { status: 404 }
        );
      }

      // Check if there are any ApiUsageLog references
      const hasUsageLogs = existing._count.apiUsageLogs > 0;

      let model;
      let deleteType: 'soft' | 'hard';

      if (hasUsageLogs) {
        // Soft delete by setting isActive to false
        model = await db.modelRegistry.update({
          where: { id },
          data: {
            isActive: false,
          },
        });
        deleteType = 'soft';
      } else {
        // Hard delete
        model = await db.modelRegistry.delete({
          where: { id },
        });
        deleteType = 'hard';
      }

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: deleteType === 'soft' ? 'archived' : 'deleted',
          entityType: 'model_registry',
          entityId: model.id,
          metadata: {
            name: model.name,
            provider: model.provider,
            deleteType,
            hadUsageLogs: hasUsageLogs,
          },
        });
      }

      return NextResponse.json({
        data: model,
        message: deleteType === 'soft'
          ? 'Model archived (has usage logs)'
          : 'Model deleted permanently',
      });
    } catch (error) {
      console.error('Error deleting model:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to delete model' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
