"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";

interface ModelActiveToggleProps {
  modelId: string;
  isActive: boolean;
}

export function ModelActiveToggle({ modelId, isActive }: ModelActiveToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIsActive, setCurrentIsActive] = useState(isActive);

  const handleToggle = async () => {
    const newValue = !currentIsActive;
    setCurrentIsActive(newValue);

    try {
      const response = await fetch(`/api/content-engine/models/${modelId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: newValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update model status");
      }

      toast.success(newValue ? "Model activated" : "Model deactivated");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setCurrentIsActive(!newValue); // Revert on error
      console.error("Error updating model status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update model status"
      );
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      {currentIsActive ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Active
        </Badge>
      ) : (
        <Badge variant="secondary" className="hover:bg-zinc-200">
          Inactive
        </Badge>
      )}
    </button>
  );
}
