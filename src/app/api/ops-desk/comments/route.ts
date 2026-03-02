import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession, handleAuthError, AuthError } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { ActivityModule, CommentEntityType } from '@/generated/prisma';

// Validation schema for creating a comment
const createCommentSchema = z.object({
  entityType: z.nativeEnum(CommentEntityType),
  entityId: z.string().uuid(),
  body: z.string().min(1, 'Comment body is required'),
  parentId: z.string().uuid().optional(),
});

/**
 * GET /api/ops-desk/comments
 * List comments by entityType and entityId
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as CommentEntityType | null;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId query parameters are required' },
        { status: 400 }
      );
    }

    // Validate entityType
    if (!Object.values(CommentEntityType).includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType' },
        { status: 400 }
      );
    }

    const comments = await db.comment.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/ops-desk/comments
 * Create a new comment
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const session = await getRequiredSession();
    const body = await req.json();

    // Validate request body
    const validationResult = createCommentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify parent comment exists if provided
    if (data.parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: data.parentId },
        select: { id: true, entityType: true, entityId: true },
      });
      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
      // Ensure parent comment belongs to the same entity
      if (
        parentComment.entityType !== data.entityType ||
        parentComment.entityId !== data.entityId
      ) {
        return NextResponse.json(
          { error: 'Parent comment does not belong to the same entity' },
          { status: 400 }
        );
      }
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        authorId: session.user.id,
        body: data.body,
        parentId: data.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Determine the module based on entity type
    const moduleMap: Record<CommentEntityType, ActivityModule> = {
      [CommentEntityType.PROJECT]: ActivityModule.OPS_DESK,
      [CommentEntityType.CONTENT_ASSET]: ActivityModule.CONTENT_ENGINE,
      [CommentEntityType.PROPOSAL]: ActivityModule.PROPOSALS,
      [CommentEntityType.BRAND_PROFILE]: ActivityModule.CLIENT_PORTAL,
      [CommentEntityType.CLIENT_MESSAGE]: ActivityModule.CLIENT_PORTAL,
    };

    // Log activity
    await logActivity({
      actorId: session.user.id,
      module: moduleMap[data.entityType] || ActivityModule.OPS_DESK,
      action: 'commented',
      entityType: data.entityType.toLowerCase(),
      entityId: data.entityId,
      metadata: {
        commentId: comment.id,
        isReply: !!data.parentId,
        bodyPreview: data.body.substring(0, 100),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
});
