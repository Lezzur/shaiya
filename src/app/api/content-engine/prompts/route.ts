import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { createPromptSchema } from '@/lib/validations';
import { UserRole, ActivityModule, Prisma } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/content-engine/prompts
 * List prompt templates with filters
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);

      // Parse filters
      const pipelineId = searchParams.get('pipelineId') || undefined;
      const category = searchParams.get('category') || undefined;
      const isActiveParam = searchParams.get('isActive');
      const search = searchParams.get('search') || undefined;

      // Build where clause
      const where: Prisma.PromptTemplateWhereInput = {};

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      if (category) {
        where.category = category;
      }

      if (isActiveParam !== null && isActiveParam !== undefined) {
        // Parse boolean from string
        where.isActive = isActiveParam === 'true';
      }

      if (search) {
        where.OR = [
          { contentType: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Execute query
      const prompts = await db.promptTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

      // Transform response to include pipeline name
      const data = prompts.map((prompt) => ({
        ...prompt,
        pipelineName: prompt.pipeline?.name || null,
      }));

      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch prompt templates' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/content-engine/prompts
 * Create a new prompt template
 * Protected: ADMIN, TEAM roles
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = createPromptSchema.safeParse(body);
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

      // If pipelineId is provided, verify it exists
      if (data.pipelineId) {
        const pipelineExists = await db.pipeline.findUnique({
          where: { id: data.pipelineId },
        });

        if (!pipelineExists) {
          return NextResponse.json(
            { error: 'ValidationError', message: 'Pipeline not found' },
            { status: 400 }
          );
        }
      }

      // Create the prompt template
      const prompt = await db.promptTemplate.create({
        data: {
          pipelineId: data.pipelineId,
          contentType: data.contentType,
          body: data.body,
          category: data.category,
          performanceNotes: data.performanceNotes,
          abNotes: data.abNotes,
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
          action: 'created',
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

      return NextResponse.json({ data: responseData }, { status: 201 });
    } catch (error) {
      console.error('Error creating prompt template:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to create prompt template' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);
