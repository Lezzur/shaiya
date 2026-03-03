"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/shared/file-uploader";
import { toast } from "@/lib/toast";

type Client = {
  id: string;
  name: string;
};

export default function NewBrandProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [clientId, setClientId] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [exampleUrls, setExampleUrls] = useState<string[]>([""]);
  const [colors, setColors] = useState("{}");
  const [typography, setTypography] = useState("{}");
  const [characterSheets, setCharacterSheets] = useState("{}");
  const [styleRefUrls, setStyleRefUrls] = useState<string[]>([]);

  const [colorsError, setColorsError] = useState("");
  const [typographyError, setTypographyError] = useState("");
  const [characterSheetsError, setCharacterSheetsError] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/ops-desk/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      const result = await response.json();
      setClients(result.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoadingClients(false);
    }
  };

  const validateJSON = (value: string, field: string) => {
    if (!value.trim() || value.trim() === "{}") return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleJSONBlur = (value: string, field: "colors" | "typography" | "characterSheets") => {
    const isValid = validateJSON(value, field);
    const errorSetter = {
      colors: setColorsError,
      typography: setTypographyError,
      characterSheets: setCharacterSheetsError,
    }[field];

    errorSetter(isValid ? "" : "Invalid JSON format");
  };

  const addExampleUrl = () => {
    setExampleUrls([...exampleUrls, ""]);
  };

  const removeExampleUrl = (index: number) => {
    setExampleUrls(exampleUrls.filter((_, i) => i !== index));
  };

  const updateExampleUrl = (index: number, value: string) => {
    const updated = [...exampleUrls];
    updated[index] = value;
    setExampleUrls(updated);
  };

  const handleFileUpload = (urls: string[]) => {
    setStyleRefUrls([...styleRefUrls, ...urls]);
  };

  const removeStyleRef = (index: number) => {
    setStyleRefUrls(styleRefUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    if (colorsError || typographyError || characterSheetsError) {
      toast.error("Please fix JSON errors before submitting");
      return;
    }

    setIsLoading(true);
    try {
      // Parse JSON fields
      const parsedColors = colors.trim() && colors.trim() !== "{}" ? JSON.parse(colors) : undefined;
      const parsedTypography = typography.trim() && typography.trim() !== "{}" ? JSON.parse(typography) : undefined;
      const parsedCharacterSheets = characterSheets.trim() && characterSheets.trim() !== "{}" ? JSON.parse(characterSheets) : undefined;

      // Filter out empty example URLs
      const filteredExampleUrls = exampleUrls.filter((url) => url.trim() !== "");

      const submitData = {
        clientId,
        toneOfVoice: toneOfVoice || undefined,
        targetAudience: targetAudience || undefined,
        exampleUrls: filteredExampleUrls.length > 0 ? filteredExampleUrls : undefined,
        colors: parsedColors,
        typography: parsedTypography,
        characterSheets: parsedCharacterSheets,
        styleRefUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
      };

      const response = await fetch("/api/content-engine/brand-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create brand profile");
      }

      const result = await response.json();
      const newBrandProfile = result.data;

      toast.success("Brand profile created successfully");
      router.push(`/content-engine/brand-profiles/${newBrandProfile.id}`);
    } catch (error) {
      console.error("Error creating brand profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create brand profile"
      );
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold">New Brand Profile</h1>
        </div>
        <p className="ml-12 text-muted-foreground">
          Configure brand guidelines and content generation parameters
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client <span className="text-red-500">*</span>
            </Label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={loadingClients || isLoading}
            >
              <SelectTrigger id="clientId">
                <SelectValue placeholder="Select a client" />
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

          {/* Tone of Voice */}
          <div className="space-y-2">
            <Label htmlFor="toneOfVoice">Tone of Voice</Label>
            <Textarea
              id="toneOfVoice"
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              placeholder="Describe the brand's tone and communication style..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Describe the target audience demographics and characteristics..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Example URLs */}
          <div className="space-y-2">
            <Label>Example URLs</Label>
            <div className="space-y-2">
              {exampleUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => updateExampleUrl(index, e.target.value)}
                    placeholder="https://example.com"
                    disabled={isLoading}
                  />
                  {exampleUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExampleUrl(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExampleUrl}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add URL
              </Button>
            </div>
          </div>

          {/* Colors (JSON) */}
          <div className="space-y-2">
            <Label htmlFor="colors">Colors (JSON)</Label>
            <Textarea
              id="colors"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              onBlur={(e) => handleJSONBlur(e.target.value, "colors")}
              placeholder='{"primary": "#000000", "secondary": "#ffffff"}'
              rows={3}
              disabled={isLoading}
              className={colorsError ? "border-red-500" : ""}
            />
            {colorsError && (
              <p className="text-sm text-red-500">{colorsError}</p>
            )}
          </div>

          {/* Typography (JSON) */}
          <div className="space-y-2">
            <Label htmlFor="typography">Typography (JSON)</Label>
            <Textarea
              id="typography"
              value={typography}
              onChange={(e) => setTypography(e.target.value)}
              onBlur={(e) => handleJSONBlur(e.target.value, "typography")}
              placeholder='{"heading": "Inter", "body": "Open Sans"}'
              rows={3}
              disabled={isLoading}
              className={typographyError ? "border-red-500" : ""}
            />
            {typographyError && (
              <p className="text-sm text-red-500">{typographyError}</p>
            )}
          </div>

          {/* Character Sheets (JSON) */}
          <div className="space-y-2">
            <Label htmlFor="characterSheets">Character Sheets (JSON)</Label>
            <Textarea
              id="characterSheets"
              value={characterSheets}
              onChange={(e) => setCharacterSheets(e.target.value)}
              onBlur={(e) => handleJSONBlur(e.target.value, "characterSheets")}
              placeholder='{"hero": {"name": "...", "personality": "..."}}'
              rows={4}
              disabled={isLoading}
              className={characterSheetsError ? "border-red-500" : ""}
            />
            {characterSheetsError && (
              <p className="text-sm text-red-500">{characterSheetsError}</p>
            )}
          </div>

          {/* Style Reference Images */}
          <div className="space-y-2">
            <Label>Style Reference Images</Label>
            {styleRefUrls.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {styleRefUrls.map((url, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={url}
                      alt={`Style reference ${index + 1}`}
                      className="h-24 w-full rounded object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeStyleRef(index)}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FileUploader
              clientId={clientId}
              onUploadComplete={handleFileUpload}
              maxFiles={10}
              disabled={!clientId || isLoading}
            />
            {!clientId && (
              <p className="text-sm text-muted-foreground">
                Select a client first to upload images
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading || !clientId}
            >
              {isLoading ? "Creating..." : "Create Brand Profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
