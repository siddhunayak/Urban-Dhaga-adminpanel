export type Role = "OWNER" | "SALES" | "PRODUCTION" | "ACCOUNTS" | "STAFF";

export type Permission =
  | "dashboard:read"
  | "audit:read"
  | "users:read"
  | "users:write"
  | "leads:read"
  | "leads:write"
  | "customers:read"
  | "customers:write"
  | "products:read"
  | "products:write"
  | "inventory:read"
  | "inventory:write"
  | "quotations:read"
  | "quotations:write"
  | "orders:read"
  | "orders:write"
  | "orders:delete"
  | "mockups:write"
  | "qc:write"
  | "shipment:write"
  | "payments:read"
  | "payments:write"
  | "invoices:read"
  | "vendors:read"
  | "vendors:write";

const ALL_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "audit:read",
  "users:read",
  "users:write",
  "leads:read",
  "leads:write",
  "customers:read",
  "customers:write",
  "products:read",
  "products:write",
  "inventory:read",
  "inventory:write",
  "quotations:read",
  "quotations:write",
  "orders:read",
  "orders:write",
  "orders:delete",
  "mockups:write",
  "qc:write",
  "shipment:write",
  "payments:read",
  "payments:write",
  "invoices:read",
  "vendors:read",
  "vendors:write",
];

const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  OWNER: new Set(ALL_PERMISSIONS),
  SALES: new Set<Permission>([
    "dashboard:read",
    "leads:read",
    "leads:write",
    "customers:read",
    "customers:write",
    "products:read",
    "inventory:read",
    "quotations:read",
    "quotations:write",
    "orders:read",
    "orders:write",
    "mockups:write",
    "payments:read",
    "invoices:read",
    "vendors:read",
  ]),
  PRODUCTION: new Set<Permission>([
    "dashboard:read",
    "customers:read",
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:write",
    "quotations:read",
    "orders:read",
    "orders:write",
    "mockups:write",
    "qc:write",
    "shipment:write",
    "vendors:read",
    "vendors:write",
  ]),
  ACCOUNTS: new Set<Permission>([
    "dashboard:read",
    "audit:read",
    "customers:read",
    "customers:write",
    "quotations:read",
    "orders:read",
    "orders:write",
    "payments:read",
    "payments:write",
    "invoices:read",
    "vendors:read",
  ]),
  STAFF: new Set<Permission>([
    "dashboard:read",
    "leads:read",
    "customers:read",
    "products:read",
    "inventory:read",
    "quotations:read",
    "orders:read",
    "payments:read",
    "invoices:read",
    "vendors:read",
  ]),
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  return perms ? perms.has(permission) : false;
}
