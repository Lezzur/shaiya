import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getRequiredSession } from '@/lib/auth-guard';
import { createInvoiceSchema, paginationSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import { UserRole, InvoiceStatus, ActivityModule } from '@/generated/prisma';
import { z } from 'zod';

const invoiceFilterSchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  sortBy: z.enum(['dueDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/ops-desk/invoices
 * List invoices with filtering and pagination
 * ADMIN and TEAM can access
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);

      // Parse pagination
      const pagination = paginationSchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
      });

      // Parse filters
      const filters = invoiceFilterSchema.parse({
        clientId: searchParams.get('clientId') || undefined,
        status: searchParams.get('status') || undefined,
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc',
      });

      const where: Record<string, unknown> = {};
      if (filters.clientId) {
        where.clientId = filters.clientId;
      }
      if (filters.status) {
        where.status = filters.status;
      }

      const [invoices, total] = await Promise.all([
        db.invoice.findMany({
          where,
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
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        db.invoice.count({ where }),
      ]);

      return NextResponse.json({
        data: invoices,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Error listing invoices:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN, UserRole.TEAM] }
);

/**
 * POST /api/ops-desk/invoices
 * Create a new invoice
 * Only ADMIN can create
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const session = await getRequiredSession();
      const body = await req.json();

      // Parse and validate
      const data = createInvoiceSchema.parse(body);

      // Auto-calculate amount from line items if not provided or is 0
      let calculatedAmount = data.amount;
      if ((!calculatedAmount || calculatedAmount === 0) && data.lineItems?.length > 0) {
        calculatedAmount = data.lineItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
      }

      // Verify client exists
      const client = await db.client.findUnique({
        where: { id: data.clientId },
      });
      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }

      // Verify project exists if provided
      if (data.projectId) {
        const project = await db.project.findUnique({
          where: { id: data.projectId },
        });
        if (!project) {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          );
        }
      }

      const invoice = await db.invoice.create({
        data: {
          clientId: data.clientId,
          projectId: data.projectId || null,
          amount: calculatedAmount,
          status: data.status,
          dueDate: data.dueDate,
          lineItems: data.lineItems,
          notes: data.notes || null,
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
        action: 'created',
        entityType: 'invoice',
        entityId: invoice.id,
        metadata: {
          clientName: client.name,
          amount: calculatedAmount,
        },
      });

      return NextResponse.json({ data: invoice }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Error creating invoice:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.ADMIN] }
);
