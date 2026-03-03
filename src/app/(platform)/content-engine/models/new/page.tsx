"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/lib/toast";

const formSchema = z.object({
  name: z.string().min(1, "Model name is required").max(200, "Model name must be 200 characters or less"),
  provider: z.string().min(1, "Provider is required"),
  endpoint: z.string().url("Endpoint must be a valid URL").optional().or(z.literal("")),
  costPerUnit: z.number().min(0, "Cost must be non-negative"),
  unitType: z.string().min(1, "Unit type is required"),
  qualityBenchmark: z.number().min(0, "Quality must be at least 0").max(1, "Quality must be at most 1").optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

const UNIT_TYPES = [
  { value: "1k_tokens", label: "Per 1K Tokens" },
  { value: "1m_tokens", label: "Per 1M Tokens" },
  { value: "image", label: "Per Image" },
  { value: "minute", label: "Per Minute" },
  { value: "request", label: "Per Request" },
];

export default function NewModelPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      provider: "",
      endpoint: "",
      costPerUnit: 0,
      unitType: "",
      qualityBenchmark: undefined,
      isActive: true,
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const submitData = {
        ...data,
        endpoint: data.endpoint || undefined,
        qualityBenchmark: data.qualityBenchmark ?? undefined,
      };

      const response = await fetch("/api/content-engine/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create model");
      }

      toast.success("Model created successfully");
      router.push("/content-engine/models");
    } catch (error) {
      console.error("Error creating model:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create model"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Add Model</h1>
        </div>
        <p className="ml-12 text-muted-foreground">
          Register a new AI model to the platform
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GPT-4o, Claude 3.5 Sonnet" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name to identify this model
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., OpenAI, Anthropic, Google" {...field} />
                  </FormControl>
                  <FormDescription>
                    The company or organization providing this model
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://api.example.com/v1/chat"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional API endpoint URL for this model
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Unit (PHP) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Cost in PHP for one unit of usage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How usage is measured for billing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="qualityBenchmark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality Benchmark (0-1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.85"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional quality score between 0 and 1 (displayed as 0-100%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Model"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
