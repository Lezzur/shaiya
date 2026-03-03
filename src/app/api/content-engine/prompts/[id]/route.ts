import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updatePromptSchema } from '@/lib/validations';
import { UserRole, ActivityModule } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/prompts/[id]
 * Get single prompt template by ID
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Prompt template ID is required' },
          { status: 400 }
        );
      }

      // Fetch prompt template
      const prompt = await db.promptTemplate.findUnique({
        where: { id },
        include: {
          pipeline: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      if (!prompt) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Prompt template not found' },
          { status: 404 }
        );
      }

      // Transform response to include pipeline name
      const responseData = {
        ...prompt,
        pipelineName: prompt.pipeline?.name || null,
      };

      return NextResponse.json({ data: responseData });
    } catch (error) {
      console.error('Error fetching prompt template:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch prompt template' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/content-engine/prompts/[id]
 * Update prompt template with atomic version increment when body changes
 * Protected: ADMIN, TEAM roles
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Prompt template ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updatePromptSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      // If pipelineId is provided, verify it exists
      if (validationResult.data.pipelineId) {
        const pipelineExists = await db.pipeline.findUnique({
          where: { id: validationResult.data.pipelineId },
        });

        if (!pipelineExists) {
          return NextResponse.json(
            { error: 'ValidationError', message: 'Pipeline not found' },
            { status: 400 }
          );
        }
      }

      const data = validationResult.data;
      const bodyChanged = data.body !== undefined;

      // Use transaction to atomically read current version and increment if body changed
      const prompt = await db.$transaction(async (tx) => {
        // Check if prompt template exists
        const existing = await tx.promptTemplate.findUnique({ where: { id } });
        if (!existing) {
          throw new Error('NotFound');
        }

        // Prepare update data
        const updateData: {
          pipelineId?: string | null;
          contentType?: string;
          body?: string;
          category?: string | null;
          performanceNotes?: string | null;
          abNotes?: string | null;
          isActive?: boolean;
          version?: number;
        } = {};

        if (data.pipelineId !== undefined) updateData.pipelineId = data.pipelineId;
        if (data.contentType !== undefined) updateData.contentType = data.contentType;
        if (data.body !== undefined) updateData.body = data.body;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.performanceNotes !== undefined) updateData.performanceNotes = data.performanceNotes;
        if (data.abNotes !== undefined) updateData.abNotes = data.abNotes;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        // Increment version atomically if body changed
        if (bodyChanged) {
          updateData.version = existing.version + 1;
        }

        // Update prompt template
        return tx.promptTemplate.update({
          where: { id },
          data: updateData,
          include: {
            pipeline: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        });
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.CONTENT_ENGINE,
          action: 'updated',
          entityType: 'prompt_template',
          entityId: prompt.id,
          metadata: {
            contentType: prompt.contentType,
            versionIncremented: bodyChanged,
            newVersion: bodyChanged ? prompt.version : undefined,
          },
        });
      }

      // Transform response to include pipeline name
      const responseData = {
        ...prompt,
        pipelineName: prompt.pipeline?.name || null,
      };

      return NextResponse.json({ data: responseData });
    } catch (error) {
      if (error instanceof Error && error.message === 'NotFound') {
        return NextResponse.json(
          { error: 'NotFound', message: 'Prompt template not found' },
          { status: 404 }
        );
      }

      console.error('Error updating prompt template:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update prompt template' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * DELETE /api/content-engine/prompts/[id]
 * Soft-delete by setting isActive to false
 * Protected: ADMIN role only
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Prompt template ID is required' },
          { status: 400 }
        );
      }

      // Check if prompt template exists
      const existing = await db.promptTemplate.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Prompt template not found' },
          { status: 404 }
        );
      }

      // Soft delete by setting isActive to false
      const prompt = await db.promptTemplate.update({
        where: { id },
        data: {
          isActive: false,
        },
        include: {
          pipeline: {
            select: {
              id: true,
              name: true,
              type: true,
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
          action: 'archived',
          entityType: 'prompt_template',
          entityId: prompt.id,
          metadata: { contentType: prompt.contentType },
        });
      }

      // Transform response to include pipeline name
      const responseData = {
        ...prompt,
        pipelineName: prompt.pipeline?.name || null,
      };

      return NextResponse.json({ data: responseData });
    } catch (error) {
      console.error('Error archiving prompt template:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to archive prompt template' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
