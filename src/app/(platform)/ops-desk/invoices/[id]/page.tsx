"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Send, Check, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/format";
import { getInvoiceStatus } from "@/lib/constants";
import { InvoiceStatus } from "@/generated/prisma";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  paymongoPaymentLinkId?: string | null;
  paymongoPaymentLinkUrl?: string | null;
  paymongoPaymentId?: string | null;
  lineItems: LineItem[];
  notes?: string | null;
  client: {
    id: string;
    name: string;
    logo?: string | null;
    industry?: string | null;
  };
  project?: {
    id: string;
    title: string;
    status: string;
  } | null;
  createdAt: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ops-desk/invoices/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      const data = await response.json();
      setInvoice(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/ops-desk/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send invoice");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    setIsMarkingPaid(true);
    try {
      const response = await fetch(`/api/ops-desk/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: InvoiceStatus.PAID }),
      });
      if (!response.ok) throw new Error("Failed to mark invoice as paid");
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark invoice as paid");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ops-desk/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete invoice");
      }
      router.push("/ops-desk/invoices");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete invoice");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCopyLink = () => {
    if (invoice?.paymongoPaymentLinkUrl) {
      navigator.clipboard.writeText(invoice.paymongoPaymentLinkUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const getShortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  const calculateSubtotal = () => {
    return invoice?.lineItems.reduce((sum, item) => sum + item.amount, 0) || 0;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">
          {error || "Invoice not found"}
        </div>
      </div>
    );
  }

  const statusConfig = getInvoiceStatus(invoice.status);
  const subtotal = calculateSubtotal();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/ops-desk/invoices")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Invoice #{getShortId(invoice.id)}</h1>
          </div>
          <div className="flex items-center gap-3 ml-12">
            <StatusBadge
              status={statusConfig?.label || invoice.status}
              variant="invoice"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === InvoiceStatus.DRAFT_I && (
            <>
              <Button
                variant="default"
                onClick={handleSendInvoice}
                disabled={isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send Invoice"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/ops-desk/invoices/${invoiceId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          {(invoice.status === InvoiceStatus.SENT_I ||
            invoice.status === InvoiceStatus.OVERDUE) && (
            <>
              <Button
                variant="default"
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid}
              >
                <Check className="h-4 w-4 mr-2" />
                {isMarkingPaid ? "Marking..." : "Mark as Paid"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendInvoice}>
                <Send className="h-4 w-4 mr-2" />
                Resend
              </Button>
            </>
          )}
          {invoice.status === InvoiceStatus.PAID && invoice.paymongoPaymentId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`#`}>
                <FileText className="h-4 w-4 mr-2" />
                View Receipt
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Client Info */}
      <Card className="p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Client Information</h3>
          <div className="flex items-center gap-3">
            {invoice.client.logo && (
              <img
                src={invoice.client.logo}
                alt={invoice.client.name}
                className="h-10 w-10 rounded"
              />
            )}
            <div>
              <Link
                href={`/ops-desk/clients/${invoice.client.id}`}
                className="font-medium text-lg hover:underline"
              >
                {invoice.client.name}
              </Link>
              {invoice.client.industry && (
                <p className="text-sm text-muted-foreground">
                  {invoice.client.industry}
                </p>
              )}
            </div>
          </div>
          {invoice.project && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Project</p>
              <Link
                href={`/ops-desk/projects/${invoice.project.id}`}
                className="font-medium hover:underline"
              >
                {invoice.project.title}
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Line Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}

      {/* Status Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
          {invoice.paidAt && (
            <div>
              <p className="text-sm text-muted-foreground">Paid At</p>
              <p className="font-medium">{formatDate(invoice.paidAt)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(invoice.createdAt)}</p>
          </div>
          {invoice.paymongoPaymentId && (
            <div>
              <p className="text-sm text-muted-foreground">Payment ID</p>
              <p className="font-medium font-mono text-xs">
                {invoice.paymongoPaymentId}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* PayMongo Payment Link */}
      {invoice.paymongoPaymentLinkUrl && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono overflow-x-auto">
              {invoice.paymongoPaymentLinkUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-2" />
              {linkCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be
              undone. Only draft invoices can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
