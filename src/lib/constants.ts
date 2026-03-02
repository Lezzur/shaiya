// Status enums and color maps

export const STATUS_COLORS = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
  pending: "bg-yellow-500",
  completed: "bg-blue-500",
  failed: "bg-red-500",
} as const;

export const ROLES = {
  admin: "admin",
  team: "team",
  client: "client",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
