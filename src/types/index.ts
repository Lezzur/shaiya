// Shared types across all modules

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team" | "client";
};

export type Module =
  | "war-room"
  | "ops-desk"
  | "lead-engine"
  | "content-factory"
  | "analytics-hub"
  | "client-portal";
