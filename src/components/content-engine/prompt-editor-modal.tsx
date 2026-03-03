"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Loader2, Save, Archive, AlertCircle } from "lucide-react";

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

interface PromptTemplate {
  id: string;
  pipelineId: string | null;
  contentType: string;
  body: string;
  version: number;
  category: string | null;
  performanceNotes: string | null;
  abNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pipeline: Pipeline | null;
  pipelineName: string | null;
}

interface PromptEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: PromptTemplate;
  pipelines: Pipeline[];
  onClose: () => void;
  onSave: () => void;
}

export function PromptEditorModal({
  open,
  onOpenChange,
  prompt,
  pipelines,
  onClose,
  onSave,
}: PromptEditorModalProps) {
  // Form state
  const [contentType, setContentType] = useState(prompt.contentType);
  const [category, setCategory] = useState(prompt.category || "");
  const [pipelineId, setPipelineId] = useState(prompt.pipelineId || "none");
  const [performanceNotes, setPerformanceNotes] = useState(
    prompt.performanceNotes || ""
  );
  const [abNotes, setAbNotes] = useState(prompt.abNotes || "");
  const [body, setBody] = useState(prompt.body);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monacoError, setMonacoError] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset form when prompt changes
  useEffect(() => {
    setContentType(prompt.contentType);
    setCategory(prompt.category || "");
    setPipelineId(prompt.pipelineId || "none");
    setPerformanceNotes(prompt.performanceNotes || "");
    setAbNotes(prompt.abNotes || "");
    setBody(prompt.body);
    setHasUnsavedChanges(false);
    setError(null);
  }, [prompt]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges =
      contentType !== prompt.contentType ||
      (category || "") !== (prompt.category || "") ||
      (pipelineId === "none" ? null : pipelineId) !== prompt.pipelineId ||
      (performanceNotes || "") !== (prompt.performanceNotes || "") ||
      (abNotes || "") !== (prompt.abNotes || "") ||
      body !== prompt.body;
    setHasUnsavedChanges(hasChanges);
  }, [
    contentType,
    category,
    pipelineId,
    performanceNotes,
    abNotes,
    body,
    prompt,
  ]);

  const handleBodyChange = useCallback((value: string | undefined) => {
    setBody(value || "");
  }, []);

  const handleSave = async () => {
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
      } else {
        payload.category = null;
      }

      if (pipelineId !== "none") {
        payload.pipelineId = pipelineId;
      } else {
        payload.pipelineId = null;
      }

      if (performanceNotes.trim()) {
        payload.performanceNotes = performanceNotes.trim();
      } else {
        payload.performanceNotes = null;
      }

      if (abNotes.trim()) {
        payload.abNotes = abNotes.trim();
      } else {
        payload.abNotes = null;
      }

      const response = await fetch(`/api/content-engine/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to save prompt");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    try {
      setArchiving(true);
      setError(null);

      const response = await fetch(`/api/content-engine/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to archive prompt");
      }

      setArchiveDialogOpen(false);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  Edit Prompt Template
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Version {prompt.version} &bull; {prompt.isActive ? "Active" : "Archived"}
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-amber-600 font-medium">
                      &bull; Unsaved changes
                    </span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {prompt.isActive && (
                  <Button
                    variant="outline"
                    onClick={() => setArchiveDialogOpen(true)}
                    disabled={saving || archiving}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 shrink-0">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left Panel - Metadata */}
            <div className="w-80 border-r p-6 overflow-y-auto shrink-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Input
                    id="contentType"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder="e.g., blog_post, social_media"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., marketing, technical"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pipeline">Pipeline</Label>
                  <Select value={pipelineId} onValueChange={setPipelineId}>
                    <SelectTrigger id="pipeline">
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

                <div className="space-y-2">
                  <Label htmlFor="performanceNotes">Performance Notes</Label>
                  <Textarea
                    id="performanceNotes"
                    value={performanceNotes}
                    onChange={(e) => setPerformanceNotes(e.target.value)}
                    placeholder="Notes about prompt performance..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abNotes">A/B Notes</Label>
                  <Textarea
                    id="abNotes"
                    value={abNotes}
                    onChange={(e) => setAbNotes(e.target.value)}
                    placeholder="A/B testing notes..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel - Monaco Editor */}
            <div className="flex-1 flex flex-col min-w-0 p-6">
              <Label className="mb-2">Prompt Body</Label>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
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
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Prompt Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this prompt template? This will
              set the prompt as inactive. You can restore it later by updating
              its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-red-600 hover:bg-red-700"
            >
              {archiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
