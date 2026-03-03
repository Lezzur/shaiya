"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";

export default function NewPipelinePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    webhookUrl: "",
    config: "{}",
    status: "INACTIVE",
  });
  const [configError, setConfigError] = useState<string | null>(null);

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "config") {
      setConfigError(null);
    }
  };

  const validateConfig = (value: string) => {
    if (!value.trim()) {
      setConfigError("Config cannot be empty");
      return false;
    }
    try {
      JSON.parse(value);
      setConfigError(null);
      return true;
    } catch (e) {
      setConfigError("Invalid JSON format");
      return false;
    }
  };

  const handleConfigBlur = () => {
    if (formData.config.trim()) {
      validateConfig(formData.config);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!formData.name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }

    if (!formData.type.trim()) {
      toast.error("Pipeline type is required");
      return;
    }

    if (!formData.webhookUrl.trim()) {
      toast.error("Webhook URL is required");
      return;
    }

    if (!validateConfig(formData.config)) {
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        name: formData.name,
        type: formData.type,
        webhookUrl: formData.webhookUrl,
        config: JSON.parse(formData.config),
        status: formData.status,
      };

      const response = await fetch("/api/content-engine/pipelines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create pipeline");
      }

      const result = await response.json();
      const newPipeline = result.data;

      toast.success("Pipeline created successfully");
      router.push(`/content-engine/pipelines/${newPipeline.id}`);
    } catch (error) {
      console.error("Error creating pipeline:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create pipeline"
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
          <h1 className="text-3xl font-bold">New Pipeline</h1>
        </div>
        <p className="text-muted-foreground ml-12">
          Create a new content generation pipeline
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Pipeline Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Social Media Content Generator"
              disabled={isLoading}
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Pipeline Type <span className="text-red-500">*</span>
            </Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
              placeholder="e.g., text-to-image, blog-post, social-caption"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-zinc-500">
              Enter the type of content this pipeline generates
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">
              Webhook URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="webhookUrl"
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => handleChange("webhookUrl", e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              disabled={isLoading}
              required
            />
            <p className="text-xs text-zinc-500">
              The n8n webhook endpoint that will process generation jobs
            </p>
          </div>

          {/* Config */}
          <div className="space-y-2">
            <Label htmlFor="config">
              Configuration (JSON) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="config"
              value={formData.config}
              onChange={(e) => handleChange("config", e.target.value)}
              onBlur={handleConfigBlur}
              placeholder='{"model": "gpt-4", "temperature": 0.7}'
              className="font-mono text-sm min-h-[120px]"
              disabled={isLoading}
              required
            />
            {configError && (
              <p className="text-xs text-red-600">{configError}</p>
            )}
            <p className="text-xs text-zinc-500">
              Default configuration parameters for this pipeline
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Pipelines must be active to accept generation jobs
            </p>
          </div>

          {/* Actions */}
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
              {isLoading ? "Creating..." : "Create Pipeline"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
