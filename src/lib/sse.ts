/**
 * SSE (Server-Sent Events) connection manager for real-time updates
 *
 * Used for broadcasting queue status updates to connected clients.
 * Each controller can push SSE-formatted messages to its connected client.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

/**
 * Global map of active SSE connections.
 * Key: connection identifier (e.g., userId or connectionId)
 * Value: Set of controllers for that connection
 */
const activeConnections = new Map<string, Set<SSEController>>();

/**
 * Register a new SSE connection
 *
 * @param connectionId - Unique identifier for this connection
 * @param controller - The stream controller to send events through
 */
export function registerConnection(
  connectionId: string,
  controller: SSEController
): void {
  const controllers = activeConnections.get(connectionId) || new Set();
  controllers.add(controller);
  activeConnections.set(connectionId, controllers);
}

/**
 * Unregister an SSE connection
 *
 * @param connectionId - Unique identifier for this connection
 * @param controller - The stream controller to remove
 */
export function unregisterConnection(
  connectionId: string,
  controller: SSEController
): void {
  const controllers = activeConnections.get(connectionId);
  if (controllers) {
    controllers.delete(controller);
    if (controllers.size === 0) {
      activeConnections.delete(connectionId);
    }
  }
}

/**
 * Broadcast a job update to all connected clients
 *
 * @param job - Job data to broadcast
 */
export function broadcastJobUpdate(job: unknown): void {
  const message = `data: ${JSON.stringify({ type: 'job_update', job })}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  // Broadcast to all connections
  for (const controllers of activeConnections.values()) {
    for (const controller of controllers) {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        // Broken connection - will be cleaned up on next abort signal
        console.error('Failed to enqueue SSE message:', error);
      }
    }
  }
}

/**
 * Get the number of active connections
 */
export function getActiveConnectionCount(): number {
  let count = 0;
  for (const controllers of activeConnections.values()) {
    count += controllers.size;
  }
  return count;
}

/**
 * Send a message to a specific connection
 *
 * @param connectionId - Target connection identifier
 * @param data - Data to send
 */
export function sendToConnection(connectionId: string, data: unknown): void {
  const controllers = activeConnections.get(connectionId);
  if (!controllers) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  for (const controller of controllers) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      console.error('Failed to send to connection:', error);
    }
  }
}
