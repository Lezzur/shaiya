import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  actor: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date | string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No activity yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-medium uppercase">
              {activity.actor.substring(0, 2)}
            </span>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{activity.actor}</span>{" "}
              <span className="text-muted-foreground">{activity.action}</span>{" "}
              <span className="font-medium">{activity.entityType}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.timestamp), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
