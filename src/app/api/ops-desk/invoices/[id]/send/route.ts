import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession } from '@/lib/auth-guard';
import { createPaymentLink } from '@/lib/paymongo';
import { logActivity } from '@/lib/activity';
import { UserRole, InvoiceStatus, ActivityModule, Prisma } from '@/generated/prisma';

interface RouteContext {
  params?: Promise<Record<string, string>>;
}

/**
 * POST /api/ops-desk/invoices/[id]/send
 * Generate PayMongo payment link and mark invoice as sent
 * Only ADMIN can send invoices
 */
export const POST = withAuth(
  async (_req: NextRequest, context?: RouteContext) => {
    try {
      const session = await getRequiredSession();
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return NextResponse.json(
          { error: 'Invoice ID is required' },
          { status: 400 }
        );
      }

      // Get invoice with client info
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Only allow sending DRAFT invoices
      if (invoice.status !== InvoiceStatus.DRAFT_I) {
        return NextResponse.json(
          { error: 'Only draft invoices can be sent' },
          { status: 400 }
        );
      }

      // Convert amount to centavos (PHP * 100)
      const amountInCentavos = Math.round(
        (invoice.amount instanceof Prisma.Decimal
          ? invoice.amount.toNumber()
          : Number(invoice.amount)) * 100
      );

      // Build description for payment link
      const description = invoice.project
        ? `Invoice for ${invoice.client.name} - ${invoice.project.title}`
        : `Invoice for ${invoice.client.name}`;

      // Create PayMongo payment link
      const paymentLink = await createPaymentLink({
        amount: amountInCentavos,
        description,
        remarks: `Invoice ID: ${invoice.id}`,
      });

      // Update invoice with payment link and mark as sent
      const updatedInvoice = await db.invoice.update({
        where: { id },
        data: {
          paymongoPaymentLinkId: paymentLink.id,
          paymongoPaymentLinkUrl: paymentLink.checkout_url,
          status: InvoiceStatus.SENT_I,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Log activity
      await logActivity({
        actorId: session.user.id,
        module: ActivityModule.OPS_DESK,
        action: 'sent',
        entityType: 'invoice',
        entityId: invoice.id,
        metadata: {
          clientName: invoice.client.name,
          amount: invoice.amount,
          paymentLinkId: paymentLink.id,
        },
      });

      return NextResponse.json({
        data: updatedInvoice,
        paymentLink: {
          id: paymentLink.id,
          checkoutUrl: paymentLink.checkout_url,
        },
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
      return NextResponse.json(
        {
          error: 'Failed to send invoice',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
