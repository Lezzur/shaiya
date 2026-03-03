"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Zap, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActivityFeed, Activity } from "@/components/shared/activity-feed";
import { toast } from "@/lib/toast";
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

type BrandProfile = {
  id: string;
  clientId: string;
  colors: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
  toneOfVoice: string | null;
  targetAudience: string | null;
  exampleUrls: string[];
  styleRefUrls: string[];
  characterSheets: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    logo: string | null;
    industry: string | null;
  };
};

type Pipeline = {
  id: string;
  name: string;
  type: string;
};

export default function BrandProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [colors, setColors] = useState("{}");
  const [typography, setTypography] = useState("{}");
  const [characterSheets, setCharacterSheets] = useState("{}");

  // Trigger generation modal
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [generationParams, setGenerationParams] = useState("{}");
  const [triggering, setTriggering] = useState(false);

  // Activity feed
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchBrandProfile();
    fetchActivities();
  }, [id]);

  const fetchBrandProfile = async () => {
    try {
      const response = await fetch(`/api/content-engine/brand-profiles/${id}`);
      if (!response.ok) throw new Error("Failed to fetch brand profile");
      const result = await response.json();
      const profile = result.data;

      setBrandProfile(profile);
      setToneOfVoice(profile.toneOfVoice || "");
      setTargetAudience(profile.targetAudience || "");
      setColors(profile.colors ? JSON.stringify(profile.colors, null, 2) : "{}");
      setTypography(profile.typography ? JSON.stringify(profile.typography, null, 2) : "{}");
      setCharacterSheets(profile.characterSheets ? JSON.stringify(profile.characterSheets, null, 2) : "{}");
    } catch (error) {
      console.error("Error fetching brand profile:", error);
      toast.error("Failed to load brand profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/activity-logs?entityType=brand_profile&entityId=${id}`);
      if (response.ok) {
        const result = await response.json();
        setActivities(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchPipelines = async () => {
    try {
      const response = await fetch("/api/content-engine/pipelines?status=ACTIVE");
      if (response.ok) {
        const result = await response.json();
        setPipelines(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    if (!brandProfile) return;
    setEditMode(false);
    setToneOfVoice(brandProfile.toneOfVoice || "");
    setTargetAudience(brandProfile.targetAudience || "");
    setColors(brandProfile.colors ? JSON.stringify(brandProfile.colors, null, 2) : "{}");
    setTypography(brandProfile.typography ? JSON.stringify(brandProfile.typography, null, 2) : "{}");
    setCharacterSheets(brandProfile.characterSheets ? JSON.stringify(brandProfile.characterSheets, null, 2) : "{}");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let parsedColors, parsedTypography, parsedCharacterSheets;

      // Validate JSON
      try {
        parsedColors = colors.trim() && colors.trim() !== "{}" ? JSON.parse(colors) : null;
        parsedTypography = typography.trim() && typography.trim() !== "{}" ? JSON.parse(typography) : null;
        parsedCharacterSheets = characterSheets.trim() && characterSheets.trim() !== "{}" ? JSON.parse(characterSheets) : null;
      } catch {
        toast.error("Invalid JSON format in one or more fields");
        return;
      }

      const updateData = {
        toneOfVoice: toneOfVoice || undefined,
        targetAudience: targetAudience || undefined,
        colors: parsedColors,
        typography: parsedTypography,
        characterSheets: parsedCharacterSheets,
      };

      const response = await fetch(`/api/content-engine/brand-profiles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update brand profile");
      }

      toast.success("Brand profile updated successfully");
      setEditMode(false);
      fetchBrandProfile();
      fetchActivities();
    } catch (error) {
      console.error("Error updating brand profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update brand profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerGeneration = async () => {
    if (!selectedPipeline) {
      toast.error("Please select a pipeline");
      return;
    }

    setTriggering(true);
    try {
      let parsedParams;
      try {
        parsedParams = JSON.parse(generationParams);
      } catch {
        toast.error("Invalid JSON format in generation parameters");
        return;
      }

      const response = await fetch(`/api/content-engine/pipelines/${selectedPipeline}/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: brandProfile?.clientId,
          brandProfileId: id,
          params: parsedParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to trigger generation");
      }

      toast.success("Generation job triggered successfully");
      setShowTriggerModal(false);
      setSelectedPipeline("");
      setGenerationParams("{}");
    } catch (error) {
      console.error("Error triggering generation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to trigger generation"
      );
    } finally {
      setTriggering(false);
    }
  };

  const openTriggerModal = () => {
    fetchPipelines();
    setShowTriggerModal(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!brandProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Brand profile not found</p>
      </div>
    );
  }

  // Extract color swatches from colors JSON
  const colorSwatches = brandProfile.colors && typeof brandProfile.colors === "object"
    ? Object.entries(brandProfile.colors).filter(([, value]) =>
        typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
      )
    : [];

  return (
    <div className="container mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{brandProfile.client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {brandProfile.client.industry || "Brand Profile"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode ? (
              <>
                <Button onClick={openTriggerModal}>
                  <Zap className="mr-2 h-4 w-4" />
                  Trigger Generation
                </Button>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="character-sheets">Character Sheets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tone of Voice */}
          <Card>
            <CardHeader>
              <CardTitle>Tone of Voice</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="Describe the brand's tone and communication style..."
                  rows={3}
                  disabled={saving}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {brandProfile.toneOfVoice || "Not specified"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle>Target Audience</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Describe the target audience demographics and characteristics..."
                  rows={3}
                  disabled={saving}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {brandProfile.targetAudience || "Not specified"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder='{"primary": "#000000", "secondary": "#ffffff"}'
                  rows={4}
                  disabled={saving}
                  className="font-mono text-xs"
                />
              ) : (
                <div className="space-y-3">
                  {colorSwatches.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {colorSwatches.map(([name, hex]) => (
                        <div key={name} className="flex items-center gap-2">
                          <div
                            className="h-10 w-10 rounded border"
                            style={{ backgroundColor: hex as string }}
                          />
                          <div>
                            <p className="text-sm font-medium capitalize">{name}</p>
                            <p className="text-xs text-muted-foreground">{hex as string}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No color palette defined</p>
                  )}
                  {brandProfile.colors && (
                    <pre className="mt-3 rounded bg-muted p-3 text-xs">
                      {JSON.stringify(brandProfile.colors, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={typography}
                  onChange={(e) => setTypography(e.target.value)}
                  placeholder='{"heading": "Inter", "body": "Open Sans"}'
                  rows={4}
                  disabled={saving}
                  className="font-mono text-xs"
                />
              ) : (
                <div>
                  {brandProfile.typography ? (
                    <pre className="rounded bg-muted p-3 text-xs">
                      {JSON.stringify(brandProfile.typography, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Example URLs */}
          {brandProfile.exampleUrls && brandProfile.exampleUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Example URLs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {brandProfile.exampleUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Style References */}
          {brandProfile.styleRefUrls && brandProfile.styleRefUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Style References</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {brandProfile.styleRefUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <img
                        src={url}
                        alt={`Style reference ${index + 1}`}
                        className="h-32 w-full rounded object-cover transition-opacity group-hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Character Sheets Tab */}
        <TabsContent value="character-sheets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Character Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={characterSheets}
                  onChange={(e) => setCharacterSheets(e.target.value)}
                  placeholder='{"hero": {"name": "...", "personality": "..."}}'
                  rows={12}
                  disabled={saving}
                  className="font-mono text-xs"
                />
              ) : (
                <div>
                  {brandProfile.characterSheets ? (
                    <pre className="rounded bg-muted p-4 text-xs">
                      {JSON.stringify(brandProfile.characterSheets, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">No character sheets defined</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <ActivityFeed activities={activities} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No activity recorded
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trigger Generation Modal */}
      <Dialog open={showTriggerModal} onOpenChange={setShowTriggerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger Content Generation</DialogTitle>
            <DialogDescription>
              Select a pipeline and configure parameters to generate content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline">Pipeline</Label>
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger id="pipeline">
                  <SelectValue placeholder="Select a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name} ({pipeline.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="params">Parameters (JSON)</Label>
              <Textarea
                id="params"
                value={generationParams}
                onChange={(e) => setGenerationParams(e.target.value)}
                placeholder='{"prompt": "...", "count": 1}'
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriggerModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTriggerGeneration} disabled={triggering}>
              {triggering ? "Triggering..." : "Trigger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
