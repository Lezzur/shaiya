import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { auth } from '@/lib/auth';
import { registerConnection, unregisterConnection } from '@/lib/sse';
import { GenerationJobStatus, UserRole } from '@/generated/prisma';

/**
 * SSE endpoint for real-time queue updates
 *
 * Streams job status changes to connected clients.
 * Auth required - ADMIN or TEAM roles only.
 */

async function handler(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate unique connection ID
  const connectionId = `${session.user.id}-${Date.now()}`;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Register this connection
        registerConnection(connectionId, controller);

        // Send initial connection success message
        const welcomeMessage = `data: ${JSON.stringify({ type: 'connected', connectionId })}\n\n`;
        controller.enqueue(encoder.encode(welcomeMessage));

        // Send current queue state (all non-terminal jobs)
        const activeJobs = await db.generationJob.findMany({
          where: {
            status: {
              notIn: [GenerationJobStatus.COMPLETED, GenerationJobStatus.FAILED, GenerationJobStatus.CANCELLED],
            },
          },
          include: {
            client: { select: { id: true, name: true } },
            pipeline: { select: { id: true, name: true } },
            brandProfile: { select: { id: true } },
            contentAssets: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Send current queue state
        const queueStateMessage = `data: ${JSON.stringify({ type: 'queue_state', jobs: activeJobs })}\n\n`;
        controller.enqueue(encoder.encode(queueStateMessage));

        // Set up heartbeat to prevent proxy timeouts
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            // Stream closed, stop heartbeat
            clearInterval(heartbeatInterval);
          }
        }, 30000); // 30 seconds

        // Set up abort signal listener for cleanup
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          unregisterConnection(connectionId, controller);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      } catch (error) {
        console.error('SSE stream error:', error);
        try {
          controller.error(error);
        } catch {
          // Stream already closed
        }
      }
    },

    cancel() {
      // Clean up when client disconnects
      unregisterConnection(connectionId, null as any);
    },
  });

  // Return response with SSE headers
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Wrap with auth - require ADMIN or TEAM roles
export const GET = withAuth(handler, { roles: [UserRole.ADMIN, UserRole.TEAM] });
