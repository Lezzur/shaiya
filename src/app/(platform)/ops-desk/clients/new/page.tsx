"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientForm } from "@/components/shared/client-form";
import { toast } from "@/lib/toast";

export default function NewClientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      // Prepare the data for API submission
      const submitData = {
        name: data.name,
        logo: data.logo || undefined,
        industry: data.industry || undefined,
        packageTier: data.packageTier || undefined,
        monthlyValue: data.monthlyValue || 0,
        lifetimeValue: 0,
        healthStatus: data.healthStatus,
        renewalDate: data.renewalDate ? new Date(data.renewalDate as string).toISOString() : undefined,
      };

      const response = await fetch("/api/ops-desk/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create client");
      }

      const result = await response.json();
      const newClient = result.data;

      // Show success toast
      toast.success("Client created successfully");

      // Redirect to the new client's detail page
      router.push(`/ops-desk/clients/${newClient.id}`);
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create client"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">New Client</h1>
        </div>
        <p className="text-muted-foreground ml-12">
          Add a new client to the platform
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <ClientForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </Card>
    </div>
  );
}
