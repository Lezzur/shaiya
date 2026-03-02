"use client";

import { useState, useCallback } from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onUpload: (files: File[]) => void | Promise<void>;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  progress?: number;
}

export function FileUploader({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  className,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const newFiles = Array.from(fileList)
        .filter((file) => {
          if (maxSize && file.size > maxSize) {
            alert(`File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
            return false;
          }
          return true;
        })
        .map((file) => {
          const fileWithPreview: FileWithPreview = { file };

          // Generate preview for images
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.file === file ? { ...f, preview: reader.result as string } : f,
                ),
              );
            };
            reader.readAsDataURL(file);
          }

          return fileWithPreview;
        });

      setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
    },
    [maxSize, multiple],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(files.map((f) => f.file));
      setFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = accept || "";
          input.multiple = multiple;
          input.onchange = (e) =>
            handleFiles((e.target as HTMLInputElement).files);
          input.click();
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accept ? `Accepted: ${accept}` : "All file types accepted"}
            {maxSize && ` • Max size: ${maxSize / 1024 / 1024}MB`}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-2">
            {files.map((fileWithPreview, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {fileWithPreview.preview ? (
                  <img
                    src={fileWithPreview.preview}
                    alt={fileWithPreview.file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {fileWithPreview.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(fileWithPreview.file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
