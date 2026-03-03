"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2, AlertCircle } from "lucide-react";

// Dynamically import Monaco Editor with SSR disabled
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-900 rounded-md">
      <div className="text-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p>Loading editor...</p>
      </div>
    </div>
  ),
});

interface Pipeline {
  id: string;
  name: string;
  type: string;
}

interface NewPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: Pipeline[];
  onClose: () => void;
  onSave: () => void;
}

export function NewPromptModal({
  open,
  onOpenChange,
  pipelines,
  onClose,
  onSave,
}: NewPromptModalProps) {
  // Form state
  const [contentType, setContentType] = useState("");
  const [category, setCategory] = useState("");
  const [pipelineId, setPipelineId] = useState("none");
  const [body, setBody] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monacoError, setMonacoError] = useState(false);

  const resetForm = () => {
    setContentType("");
    setCategory("");
    setPipelineId("none");
    setBody("");
    setError(null);
  };

  const handleBodyChange = useCallback((value: string | undefined) => {
    setBody(value || "");
  }, []);

  const handleSubmit = async () => {
    if (!contentType.trim()) {
      setError("Content type is required");
      return;
    }

    if (!body.trim()) {
      setError("Prompt body is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, unknown> = {
        contentType: contentType.trim(),
        body: body,
      };

      if (category.trim()) {
        payload.category = category.trim();
      }

      if (pipelineId !== "none") {
        payload.pipelineId = pipelineId;
      }

      const response = await fetch("/api/content-engine/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to create prompt");
      }

      resetForm();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Create New Prompt Template</DialogTitle>
          <DialogDescription>
            Add a new prompt template to the library
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 shrink-0">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-contentType">
                Content Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                placeholder="e.g., blog_post, social_media"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-category">Category</Label>
              <Input
                id="new-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., marketing, technical"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pipeline">Pipeline</Label>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger id="new-pipeline">
                  <SelectValue placeholder="Select a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Pipeline</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 min-h-[300px]">
            <Label className="mb-2 block">
              Prompt Body <span className="text-red-500">*</span>
            </Label>
            <div className="h-[300px] border rounded-md overflow-hidden">
              {monacoError ? (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="h-full w-full resize-none font-mono text-sm bg-zinc-900 text-zinc-100 border-0 rounded-md"
                  placeholder="Enter your prompt template here..."
                />
              ) : (
                <MonacoEditor
                  height="100%"
                  language="handlebars"
                  theme="vs-dark"
                  value={body}
                  onChange={handleBodyChange}
                  onMount={() => setMonacoError(false)}
                  options={{
                    wordWrap: "on",
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
