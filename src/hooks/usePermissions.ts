import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type UserRole = "dev" | "guest" | "customer" | "worker" | "manager";

export type Permission = 
  | "view_public_services"
  | "create_guest_request" 
  | "create_customer_request"
  | "track_own_requests"
  | "access_customer_portal"
  | "handle_requests"
  | "approve_requests"
  | "assign_workers"
  | "create_event_draft"
  | "approve_events"
  | "manage_events"
  | "create_ticket"
  | "comment_on_tickets"
  | "close_tickets"
  | "manage_user_roles"
  | "access_worker_portal"
  | "access_manager_portal"
  | "emulate_roles";

export function useCurrentUser() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser);

  return {
    user,
    isLoading: isAuthenticated === undefined || (isAuthenticated && user === undefined),
    isAuthenticated,
  };
}

export function usePermissions() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  const checkPermission = (permission: Permission): boolean => {
    if (!isAuthenticated || !user) return false;

    // Define permissions by role (same as backend)
    const permissions: Record<UserRole, Permission[]> = {
      guest: [
        "view_public_services",
        "create_guest_request", 
        "track_own_requests"
      ],
      customer: [
        "view_public_services",
        "create_guest_request",
        "create_customer_request",
        "track_own_requests", 
        "access_customer_portal"
      ],
      worker: [
        "view_public_services",
        "create_guest_request",
        "handle_requests",
        "create_event_draft",
        "create_ticket",
        "comment_on_tickets",
        "access_worker_portal"
      ],
      manager: [
        "view_public_services", 
        "create_guest_request",
        "handle_requests",
        "approve_requests",
        "assign_workers",
        "create_event_draft",
        "approve_events", 
        "manage_events",
        "create_ticket",
        "comment_on_tickets",
        "close_tickets",
        "manage_user_roles",
        "access_worker_portal",
        "access_manager_portal"
      ],
      dev: [
        // Dev has all permissions for development and testing
        "view_public_services",
        "create_guest_request",
        "create_customer_request", 
        "track_own_requests",
        "access_customer_portal",
        "handle_requests",
        "create_event_draft",
        "create_ticket",
        "comment_on_tickets",
        "access_worker_portal",
        "approve_requests",
        "assign_workers", 
        "approve_events",
        "manage_events",
        "close_tickets",
        "manage_user_roles", 
        "access_manager_portal",
        "emulate_roles"
      ]
    };

    const effectiveRole = user.effectiveRole || user.role;
    return permissions[effectiveRole as UserRole]?.includes(permission) || false;
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    checkPermission,
    hasPermission: checkPermission,
    role: user?.role as UserRole | undefined,
    effectiveRole: user?.effectiveRole as UserRole | undefined,
    canEmulateRoles: user?.role === "dev",
  };
}

// Shortcut hooks for common permissions
export function useCanCreateEvents() {
  const { hasPermission } = usePermissions();
  return hasPermission("create_event_draft");
}

export function useCanApproveEvents() {
  const { hasPermission } = usePermissions();
  return hasPermission("approve_events");
}

export function useCanManageUsers() {
  const { hasPermission } = usePermissions();
  return hasPermission("manage_user_roles");
}

export function useIsManager() {
  const { effectiveRole } = usePermissions();
  return effectiveRole === "manager";
}

export function useIsWorker() {
  const { effectiveRole } = usePermissions();
  return effectiveRole === "worker" || effectiveRole === "manager";
}

export function useIsDev() {
  const { role } = usePermissions();
  return role === "dev";
}