"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { INVOICE_STATUSES } from "@/lib/constants";
import { InvoiceStatus } from "@/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";

interface Invoice {
  id: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidDate?: string | null;
  client: {
    id: string;
    name: string;
  };
}

interface InvoiceSummary {
  totalOutstanding: number;
  totalPaidThisMonth: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalOutstanding: 0,
    totalPaidThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [statusFilter, clientFilter]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (clientFilter !== "all") {
        params.append("clientId", clientFilter);
      }

      const response = await fetch(`/api/ops-desk/invoices?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");

      const data = await response.json();
      setInvoices(data.data || []);

      calculateSummary(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/ops-desk/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const calculateSummary = (invoiceList: Invoice[]) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalOutstanding = 0;
    let totalPaidThisMonth = 0;

    invoiceList.forEach((invoice) => {
      // Calculate outstanding (SENT_I and OVERDUE)
      if (invoice.status === InvoiceStatus.SENT_I || invoice.status === InvoiceStatus.OVERDUE) {
        totalOutstanding += invoice.amount;
      }

      // Calculate paid this month
      if (invoice.status === InvoiceStatus.PAID && invoice.paidDate) {
        const paidDate = new Date(invoice.paidDate);
        if (paidDate >= firstDayOfMonth) {
          totalPaidThisMonth += invoice.amount;
        }
      }
    });

    setSummary({ totalOutstanding, totalPaidThisMonth });
  };


  const getStatusLabel = (status: InvoiceStatus): string => {
    const statusConfig = INVOICE_STATUSES.find((s) => s.value === status);
    return statusConfig?.label || status;
  };

  const isOverdue = (invoice: Invoice): boolean => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) => (
        <Link
          href={`/ops-desk/clients/${row.original.client.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {row.original.client.name}
        </Link>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={getStatusLabel(row.original.status)}
          variant="invoice"
        />
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const isLate = isOverdue(row.original);
        return (
          <span className={isLate ? "text-red-600 font-semibold" : ""}>
            {formatDate(row.original.dueDate)}
          </span>
        );
      },
    },
    {
      accessorKey: "paidDate",
      header: "Paid Date",
      cell: ({ row }) => (
        <span>
          {row.original.paidDate ? formatDate(row.original.paidDate) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link href={`/ops-desk/invoices/${row.original.id}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      ),
    },
  ];

  if (isLoading && invoices.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Unable to load invoices</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Something went wrong while fetching your invoices. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setError(null); fetchInvoices(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {INVOICE_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Client:</span>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={invoices} />

      {/* Summary Row */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-orange-900 mb-2">
              Total Outstanding
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {formatCurrency(summary.totalOutstanding)}
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Invoices sent but not yet paid
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              Total Paid This Month
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.totalPaidThisMonth)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Revenue received in {new Date().toLocaleString("default", { month: "long" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
