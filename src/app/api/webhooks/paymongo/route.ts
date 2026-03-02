import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/paymongo';
import { logActivity } from '@/lib/activity';
import { InvoiceStatus, ActivityModule } from '@/generated/prisma';

/**
 * POST /api/webhooks/paymongo
 * Handle PayMongo webhook events
 * PUBLIC route - no auth required (PayMongo calls this)
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('PAYMONGO_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('paymongo-signature');

    if (!signature) {
      console.error('Missing paymongo-signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type;

    console.log('PayMongo webhook received:', eventType);

    // Handle link.payment.paid event
    if (eventType === 'link.payment.paid') {
      const linkData = event?.data?.attributes?.data;
      const linkId = linkData?.attributes?.link_id;

      if (!linkId) {
        console.error('Missing link_id in webhook payload');
        return NextResponse.json({ received: true });
      }

      // Find invoice by PayMongo link ID
      const invoice = await db.invoice.findFirst({
        where: { paymongoPaymentLinkId: linkId },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!invoice) {
        console.warn(`No invoice found for PayMongo link ID: ${linkId}`);
        return NextResponse.json({ received: true });
      }

      // Skip if already paid
      if (invoice.status === InvoiceStatus.PAID) {
        console.log(`Invoice ${invoice.id} already marked as paid`);
        return NextResponse.json({ received: true });
      }

      // Extract payment ID if available
      const paymentId = linkData?.id || null;

      // Update invoice to PAID
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymongoPaymentId: paymentId,
        },
      });

      // Log activity using a system actor
      // Use the first admin user as actor, or create a system log entry
      const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (adminUser) {
        await logActivity({
          actorId: adminUser.id,
          module: ActivityModule.OPS_DESK,
          action: 'paid',
          entityType: 'invoice',
          entityId: invoice.id,
          metadata: {
            clientName: invoice.client.name,
            amount: invoice.amount,
            paymongoPaymentId: paymentId,
            paymongoLinkId: linkId,
          },
        });
      }

      console.log(`Invoice ${invoice.id} marked as paid`);
    }

    // Return 200 for all events (don't fail on unhandled events)
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayMongo webhook:', error);
    // Still return 200 to avoid PayMongo retrying failed webhooks
    return NextResponse.json({ received: true });
  }
}
