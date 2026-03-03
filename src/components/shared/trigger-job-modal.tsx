"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface Client {
  id: string;
  name: string;
}

interface BrandProfile {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
  };
}

interface TriggerJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  pipelineConfig: Record<string, unknown>;
  onSuccess: (jobId: string) => void;
}

export function TriggerJobModal({
  open,
  onOpenChange,
  pipelineId,
  pipelineConfig,
  onSuccess,
}: TriggerJobModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState<string>("");
  const [params, setParams] = useState<string>(JSON.stringify(pipelineConfig, null, 2));
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingBrandProfiles, setLoadingBrandProfiles] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  // Fetch brand profiles when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchBrandProfiles(selectedClientId);
    } else {
      setBrandProfiles([]);
      setSelectedBrandProfileId("");
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetch("/api/ops-desk/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const json = await res.json();
      setClients(json.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchBrandProfiles = async (clientId: string) => {
    try {
      setLoadingBrandProfiles(true);
      setSelectedBrandProfileId(""); // Reset selection
      const res = await fetch(`/api/content-engine/brand-profiles?clientId=${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch brand profiles");
      const json = await res.json();
      setBrandProfiles(json.data);
    } catch (error) {
      console.error("Error fetching brand profiles:", error);
      toast.error("Failed to load brand profiles");
    } finally {
      setLoadingBrandProfiles(false);
    }
  };

  const validateParams = (value: string) => {
    if (!value.trim()) {
      setParamsError("Parameters cannot be empty");
      return false;
    }
    try {
      JSON.parse(value);
      setParamsError(null);
      return true;
    } catch (e) {
      setParamsError("Invalid JSON format");
      return false;
    }
  };

  const handleParamsBlur = () => {
    if (params.trim()) {
      validateParams(params);
    }
  };

  const handleSubmit = async () => {
    // Validate selections
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    if (!selectedBrandProfileId) {
      toast.error("Please select a brand profile");
      return;
    }

    // Validate params
    if (!validateParams(params)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-engine/pipelines/${pipelineId}/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          brandProfileId: selectedBrandProfileId,
          params: JSON.parse(params),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to trigger job");
      }

      const result = await response.json();
      toast.success(`Job ${result.data.jobId} queued successfully`);
      onSuccess(result.data.jobId);
      onOpenChange(false);

      // Reset form
      setSelectedClientId("");
      setSelectedBrandProfileId("");
      setParams(JSON.stringify(pipelineConfig, null, 2));
      setParamsError(null);
    } catch (error) {
      console.error("Error triggering job:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to trigger job"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = !selectedClientId || !selectedBrandProfileId || isLoading || !!paramsError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trigger Generation Job</DialogTitle>
          <DialogDescription>
            Select a client and brand profile to trigger a new generation job on this pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">
              Client <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={loadingClients || isLoading}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Profile Selection */}
          <div className="space-y-2">
            <Label htmlFor="brandProfile">
              Brand Profile <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedBrandProfileId}
              onValueChange={setSelectedBrandProfileId}
              disabled={!selectedClientId || loadingBrandProfiles || isLoading}
            >
              <SelectTrigger id="brandProfile">
                <SelectValue
                  placeholder={
                    !selectedClientId
                      ? "Select a client first"
                      : loadingBrandProfiles
                      ? "Loading brand profiles..."
                      : brandProfiles.length === 0
                      ? "No brand profile for this client"
                      : "Select a brand profile"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {brandProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    Brand Profile - {profile.client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && brandProfiles.length === 0 && !loadingBrandProfiles && (
              <p className="text-xs text-orange-600">
                No brand profile found for this client. Please create one first.
              </p>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <Label htmlFor="params">
              Parameters (JSON) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="params"
              value={params}
              onChange={(e) => {
                setParams(e.target.value);
                setParamsError(null);
              }}
              onBlur={handleParamsBlur}
              placeholder='{"key": "value"}'
              className="font-mono text-sm min-h-[150px]"
              disabled={isLoading}
            />
            {paramsError && (
              <p className="text-xs text-red-600">{paramsError}</p>
            )}
            <p className="text-xs text-zinc-500">
              Job parameters (pre-filled with pipeline config as template)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isLoading ? "Triggering..." : "Trigger Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
