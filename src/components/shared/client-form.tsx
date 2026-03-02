"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientSchema } from "@/lib/validations";
import { HealthStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/shared/file-uploader";

const PACKAGE_TIERS = [
  { value: "Starter", label: "Starter" },
  { value: "Growth", label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Custom", label: "Custom" },
];

const HEALTH_STATUSES = [
  { value: HealthStatus.HEALTHY, label: "Healthy" },
  { value: HealthStatus.AT_RISK, label: "At Risk" },
  { value: HealthStatus.CHURNED, label: "Churned" },
];

// Form schema that matches the API validation
const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  logo: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  packageTier: z.string().optional(),
  monthlyValue: z.coerce.number().min(0).default(0),
  healthStatus: z.nativeEnum(HealthStatus).default(HealthStatus.HEALTHY),
  renewalDate: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSubmit: (data: ClientFormValues) => void | Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  onCancel,
}: ClientFormProps) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultValues?.logo || "");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      logo: defaultValues?.logo || "",
      industry: defaultValues?.industry || "",
      packageTier: defaultValues?.packageTier || "",
      monthlyValue: defaultValues?.monthlyValue || 0,
      healthStatus: defaultValues?.healthStatus || HealthStatus.HEALTHY,
      renewalDate: defaultValues?.renewalDate || "",
    },
  });

  const handleLogoUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploadingLogo(true);
    try {
      // TODO: Implement actual R2 upload
      // For now, create a temporary URL
      const tempUrl = URL.createObjectURL(files[0]);
      setLogoUrl(tempUrl);
      form.setValue("logo", tempUrl);
    } catch (error) {
      console.error("Failed to upload logo:", error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (data: ClientFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Client Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter client name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Logo Upload */}
        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {logoUrl && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="h-16 w-16 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLogoUrl("");
                          form.setValue("logo", "");
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  {!logoUrl && (
                    <FileUploader
                      onUpload={handleLogoUpload}
                      accept="image/*"
                      multiple={false}
                      maxSize={5 * 1024 * 1024}
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Industry Field */}
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Technology, Healthcare" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Package Tier Select */}
        <FormField
          control={form.control}
          name="packageTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package Tier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PACKAGE_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Monthly Value Field */}
        <FormField
          control={form.control}
          name="monthlyValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Value</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Health Status Select */}
        <FormField
          control={form.control}
          name="healthStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select health status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {HEALTH_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Renewal Date Field */}
        <FormField
          control={form.control}
          name="renewalDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Renewal Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading || isUploadingLogo}>
            {isLoading ? "Saving..." : "Save Client"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
