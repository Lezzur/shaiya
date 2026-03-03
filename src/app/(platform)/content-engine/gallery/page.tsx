"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { AssetDetailModal } from "@/components/content-engine/asset-detail-modal";
import {
  CONTENT_ASSET_TYPES,
  INTERNAL_STATUSES,
  getInternalStatus,
  getContentAssetType,
} from "@/lib/constants";
import { ContentAssetType, InternalStatus } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  MessageSquare,
  Images,
  Smartphone,
  Film,
  File,
  ImageOff,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  logo?: string | null;
}

interface ContentAsset {
  id: string;
  type: ContentAssetType;
  fileUrl: string;
  thumbnailUrl?: string | null;
  internalStatus: InternalStatus;
  clientStatus: string;
  createdAt: string;
  version: number;
  client: Client;
  project?: {
    id: string;
    title: string;
  } | null;
  generationJob?: {
    id: string;
    status: string;
  } | null;
  metadata?: Record<string, unknown>;
}

interface PaginatedResponse {
  data: ContentAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const TYPE_ICONS: Record<ContentAssetType, React.ElementType> = {
  [ContentAssetType.SOCIAL_POST]: MessageSquare,
  [ContentAssetType.BLOG]: FileText,
  [ContentAssetType.VIDEO]: VideoIcon,
  [ContentAssetType.ILLUSTRATION]: ImageIcon,
  [ContentAssetType.CAROUSEL]: Images,
  [ContentAssetType.STORY]: Smartphone,
  [ContentAssetType.REEL]: Film,
  [ContentAssetType.OTHER]: File,
};

const INTERNAL_STATUS_COLORS: Record<InternalStatus, string> = {
  [InternalStatus.DRAFT]: "bg-gray-100 text-gray-800 border-gray-200",
  [InternalStatus.QA_PASSED]: "bg-blue-100 text-blue-800 border-blue-200",
  [InternalStatus.SENT_TO_CLIENT]: "bg-green-100 text-green-800 border-green-200",
};

export default function GalleryPage() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<ContentAssetType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<InternalStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch assets when filters or page changes
  useEffect(() => {
    fetchAssets();
  }, [selectedClientId, selectedTypes, selectedStatus, debouncedSearch, page]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/ops-desk/clients?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const fetchAssets = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "24");

      if (selectedClientId) {
        params.append("clientId", selectedClientId);
      }

      if (selectedTypes.length > 0) {
        // API only supports single type filter currently
        params.append("type", selectedTypes[0]);
      }

      if (selectedStatus) {
        params.append("internalStatus", selectedStatus);
      }

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const response = await fetch(
        `/api/content-engine/assets?${params.toString()}`
      );

      if (response.ok) {
        const data: PaginatedResponse = await response.json();

        if (isLoadMore) {
          setAssets((prev) => [...prev, ...data.data]);
        } else {
          setAssets(data.data);
        }

        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleResetFilters = () => {
    setSelectedClientId("");
    setSelectedTypes([]);
    setSelectedStatus("");
    setSearchQuery("");
    setPage(1);
  };

  const toggleType = (type: ContentAssetType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const handleAssetUpdate = (updatedAsset: ContentAsset) => {
    setAssets((prev) =>
      prev.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset))
    );
    setSelectedAsset(updatedAsset);
  };

  const hasActiveFilters =
    selectedClientId || selectedTypes.length > 0 || selectedStatus || searchQuery;

  const emptyStateMessage = hasActiveFilters
    ? "No assets match your filters"
    : "No assets yet";

  return (
    <div className="flex h-full flex-col">
      {/* Filter Bar - Sticky */}
      <div className="sticky top-0 z-10 border-b bg-white p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Client Filter */}
            <Select value={selectedClientId} onValueChange={(value) => {
              setSelectedClientId(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value as InternalStatus | "");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {INTERNAL_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="Search captions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-[250px]"
            />

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            )}
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2">
            {CONTENT_ASSET_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type.value);
              return (
                <Badge
                  key={type.value}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleType(type.value)}
                >
                  {type.label}
                </Badge>
              );
            })}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${total} asset${total !== 1 ? "s" : ""} found`}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading && assets.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title={emptyStateMessage}
            description={
              hasActiveFilters
                ? "Try adjusting your filters"
                : "Upload some assets to get started"
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => setSelectedAsset(asset)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {page < totalPages && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          open={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onUpdate={handleAssetUpdate}
        />
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: ContentAsset;
  onClick: () => void;
}

function AssetCard({ asset, onClick }: AssetCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const assetType = getContentAssetType(asset.type);
  const Icon = TYPE_ICONS[asset.type] || File;

  const isVideo =
    asset.type === ContentAssetType.VIDEO ||
    asset.type === ContentAssetType.REEL;

  const statusConfig = getInternalStatus(asset.internalStatus);

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {!imageError && asset.thumbnailUrl && !isVideo ? (
          <img
            src={asset.thumbnailUrl}
            alt={assetType?.label || "Asset"}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : isVideo && asset.thumbnailUrl && !imageError ? (
          <img
            src={asset.thumbnailUrl}
            alt={assetType?.label || "Video"}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        {/* Type Badge - Top Left */}
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="text-xs">
            {assetType?.label || asset.type}
          </Badge>
        </div>

        {/* Status Badge - Top Right */}
        <div className="absolute right-2 top-2">
          <Badge
            variant="outline"
            className={INTERNAL_STATUS_COLORS[asset.internalStatus]}
          >
            {statusConfig?.label || asset.internalStatus}
          </Badge>
        </div>

        {/* Hover Overlay with Actions */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
            <Button size="sm" variant="secondary">
              View Details
            </Button>
          </div>
        )}
      </div>

      {/* Client Name */}
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {asset.client.logo && (
            <img
              src={asset.client.logo}
              alt={asset.client.name}
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <p className="truncate text-sm font-medium">{asset.client.name}</p>
        </div>
      </CardContent>
    </Card>
  );
}
