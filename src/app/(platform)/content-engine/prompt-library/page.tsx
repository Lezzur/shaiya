"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Search, Loader2 } from "lucide-react";
import { PromptEditorModal } from "@/components/content-engine/prompt-editor-modal";
import { NewPromptModal } from "@/components/content-engine/new-prompt-modal";

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

export default function PromptLibraryPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Modals
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(
    null
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNewPromptOpen, setIsNewPromptOpen] = useState(false);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/content-engine/prompts");
      if (!response.ok) {
        throw new Error("Failed to fetch prompts");
      }
      const result = await response.json();
      setPrompts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const response = await fetch("/api/content-engine/pipelines");
      if (response.ok) {
        const result = await response.json();
        setPipelines(result.data || []);
      }
    } catch {
      // Silently fail - pipelines dropdown will be empty
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchPipelines();
  }, []);

  // Get unique categories from prompts
  const categories = useMemo(() => {
    const cats = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [prompts]);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesContentType = prompt.contentType
          .toLowerCase()
          .includes(query);
        const matchesCategory = prompt.category
          ?.toLowerCase()
          .includes(query);
        const matchesBody = prompt.body.toLowerCase().includes(query);
        if (!matchesContentType && !matchesCategory && !matchesBody) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && prompt.category !== categoryFilter) {
        return false;
      }

      // Pipeline filter
      if (pipelineFilter !== "all" && prompt.pipelineId !== pipelineFilter) {
        return false;
      }

      // Active filter
      if (activeFilter !== "all") {
        const isActive = activeFilter === "active";
        if (prompt.isActive !== isActive) {
          return false;
        }
      }

      return true;
    });
  }, [prompts, searchQuery, categoryFilter, pipelineFilter, activeFilter]);

  const handleRowClick = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedPrompt(null);
  };

  const handleEditorSave = () => {
    fetchPrompts();
  };

  const handleNewPromptClose = () => {
    setIsNewPromptOpen(false);
  };

  const handleNewPromptSave = () => {
    setIsNewPromptOpen(false);
    fetchPrompts();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchPrompts}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Prompt Library</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage prompt templates for content generation
          </p>
        </div>
        <Button onClick={() => setIsNewPromptOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pipelines</SelectItem>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-zinc-50">
          <div className="text-center">
            <p className="text-zinc-500 mb-2">No prompts found</p>
            <Button variant="outline" onClick={() => setIsNewPromptOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create your first prompt
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.map((prompt) => (
                <TableRow
                  key={prompt.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(prompt)}
                >
                  <TableCell className="font-medium">
                    {prompt.contentType}
                  </TableCell>
                  <TableCell>{prompt.category || "-"}</TableCell>
                  <TableCell>v{prompt.version}</TableCell>
                  <TableCell>{prompt.pipelineName || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={prompt.isActive ? "default" : "secondary"}
                    >
                      {prompt.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editor Modal */}
      {selectedPrompt && (
        <PromptEditorModal
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          prompt={selectedPrompt}
          pipelines={pipelines}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}

      {/* New Prompt Modal */}
      <NewPromptModal
        open={isNewPromptOpen}
        onOpenChange={setIsNewPromptOpen}
        pipelines={pipelines}
        onClose={handleNewPromptClose}
        onSave={handleNewPromptSave}
      />
    </div>
  );
}
