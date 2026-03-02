import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession } from '@/lib/auth-guard';
import { updateInvoiceSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import { UserRole, InvoiceStatus, ActivityModule } from '@/generated/prisma';
import { z } from 'zod';

interface RouteContext {
  params?: Promise<{ id: string }>;
}

/**
 * GET /api/ops-desk/invoices/[id]
 * Get a single invoice with client data
 * ADMIN and TEAM can access
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: RouteContext) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return NextResponse.json(
          { error: 'Invoice ID is required' },
          { status: 400 }
        );
      }

      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              logo: true,
              industry: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              status: true,
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

      return NextResponse.json({ data: invoice });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/ops-desk/invoices/[id]
 * Update an invoice (status, line items, notes)
 * Only ADMIN can update
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: RouteContext) => {
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

      const body = await req.json();
      const data = updateInvoiceSchema.parse(body);

      // Get existing invoice
      const existingInvoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!existingInvoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (data.status !== undefined) {
        updateData.status = data.status;
        // If status is PAID, set paidAt
        if (data.status === InvoiceStatus.PAID && !existingInvoice.paidAt) {
          updateData.paidAt = new Date();
        }
      }

      if (data.lineItems !== undefined) {
        updateData.lineItems = data.lineItems;
        // Recalculate amount
        updateData.amount = data.lineItems.reduce(
          (sum: number, item: { quantity: number; unitPrice: number }) =>
            sum + item.quantity * item.unitPrice,
          0
        );
      }

      if (data.amount !== undefined && data.lineItems === undefined) {
        updateData.amount = data.amount;
      }

      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate;
      }

      if (data.projectId !== undefined) {
        updateData.projectId = data.projectId;
      }

      const invoice = await db.invoice.update({
        where: { id },
        data: updateData,
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

      // Log activity with status transition if applicable
      const metadata: Record<string, unknown> = {
        clientName: existingInvoice.client.name,
      };

      if (data.status !== undefined && data.status !== existingInvoice.status) {
        metadata.statusTransition = {
          from: existingInvoice.status,
          to: data.status,
        };
      }

      await logActivity({
        actorId: session.user.id,
        module: ActivityModule.OPS_DESK,
        action: 'updated',
        entityType: 'invoice',
        entityId: invoice.id,
        metadata,
      });

      return NextResponse.json({ data: invoice });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error updating invoice:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);

/**
 * DELETE /api/ops-desk/invoices/[id]
 * Delete an invoice (only DRAFT invoices can be deleted)
 * Only ADMIN can delete
 */
export const DELETE = withAuth(
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

      const existingInvoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: { name: true },
          },
        },
      });

      if (!existingInvoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Only allow deleting DRAFT invoices
      if (existingInvoice.status !== InvoiceStatus.DRAFT_I) {
        return NextResponse.json(
          { error: 'Only draft invoices can be deleted' },
          { status: 400 }
        );
      }

      await db.invoice.delete({
        where: { id },
      });

      // Log activity
      await logActivity({
        actorId: session.user.id,
        module: ActivityModule.OPS_DESK,
        action: 'deleted',
        entityType: 'invoice',
        entityId: id,
        metadata: {
          clientName: existingInvoice.client.name,
          amount: existingInvoice.amount,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
