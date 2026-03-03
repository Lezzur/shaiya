import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-guard';
import { logActivity } from '@/lib/activity';
import { updateClientSchema } from '@/lib/validations';
import { UserRole, ActivityModule, HealthStatus, InvoiceStatus } from '@/generated/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/ops-desk/clients/[id]
 * Get single client by ID with related data
 * Protected: ADMIN, TEAM roles
 */
export const GET = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Client ID is required' },
          { status: 400 }
        );
      }

      // Fetch client with related data
      const client = await db.client.findUnique({
        where: { id },
        include: {
          primaryContact: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
          projects: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              status: true,
              deadline: true,
              createdAt: true,
            },
          },
          invoices: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true,
            },
          },
        },
      });

      if (!client) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Client not found' },
          { status: 404 }
        );
      }

      // Calculate invoice summary
      const invoiceSummary = {
        totalAmount: client.invoices.reduce(
          (sum, inv) => sum + Number(inv.amount),
          0
        ),
        paidAmount: client.invoices
          .filter((inv) => inv.status === InvoiceStatus.PAID)
          .reduce((sum, inv) => sum + Number(inv.amount), 0),
        outstandingCount: client.invoices.filter(
          (inv) =>
            inv.status !== InvoiceStatus.PAID &&
            inv.status !== InvoiceStatus.CANCELLED
        ).length,
      };

      // Structure response (destructure invoices to exclude from response)
      const { invoices: _invoices, ...clientData } = client;
      const response = {
        ...clientData,
        invoiceSummary,
      };

      return NextResponse.json({ data: response });
    } catch (error) {
      console.error('Error fetching client:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to fetch client' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * PATCH /api/ops-desk/clients/[id]
 * Update client fields
 * Protected: ADMIN role only
 */
export const PATCH = withAuth(
  async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Client ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();

      // Validate request body
      const validationResult = updateClientSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: validationResult.error.issues[0].message,
          },
          { status: 400 }
        );
      }

      // Check if client exists
      const existing = await db.client.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Client not found' },
          { status: 404 }
        );
      }

      const data = validationResult.data;

      // Update client
      const client = await db.client.update({
        where: { id },
        data: {
          name: data.name,
          logo: data.logo,
          industry: data.industry,
          packageTier: data.packageTier,
          monthlyValue: data.monthlyValue,
          lifetimeValue: data.lifetimeValue,
          primaryContactId: data.primaryContactId,
          healthStatus: data.healthStatus,
          renewalDate: data.renewalDate,
          r2BucketPath: data.r2BucketPath,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.OPS_DESK,
          action: 'updated',
          entityType: 'client',
          entityId: client.id,
          metadata: { clientName: client.name },
        });
      }

      return NextResponse.json({ data: client });
    } catch (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to update client' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);

/**
 * DELETE /api/ops-desk/clients/[id]
 * Soft-delete by setting healthStatus to CHURNED
 * Protected: ADMIN role only
 */
export const DELETE = withAuth(
  async (_req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const id = (await context?.params)?.id;
      if (!id) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Client ID is required' },
          { status: 400 }
        );
      }

      // Check if client exists
      const existing = await db.client.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'NotFound', message: 'Client not found' },
          { status: 404 }
        );
      }

      // Soft delete by setting healthStatus to CHURNED
      const client = await db.client.update({
        where: { id },
        data: {
          healthStatus: HealthStatus.CHURNED,
        },
      });

      // Log activity
      const session = await auth();
      if (session?.user?.id) {
        await logActivity({
          actorId: session.user.id,
          module: ActivityModule.OPS_DESK,
          action: 'archived',
          entityType: 'client',
          entityId: client.id,
          metadata: { clientName: client.name },
        });
      }

      return NextResponse.json({ data: client });
    } catch (error) {
      console.error('Error archiving client:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Failed to archive client' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
