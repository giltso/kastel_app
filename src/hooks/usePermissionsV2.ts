import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// V2 Tag-based permission system with Guest role
export type V2Permission =
  | "view_home_page"           // Everyone including guests
  | "view_service_preview"     // Everyone including guests
  | "sign_up"                  // Guests only (unauthenticated)
  | "view_public_services"     // Authenticated users only
  | "browse_tools"             // Authenticated users only
  | "browse_courses"           // Authenticated users only
  | "access_staff_features"    // isStaff = true
  | "request_shifts"           // isStaff + workerTag
  | "approve_shifts"           // isStaff + workerTag + managerTag
  | "manage_courses"           // isStaff + instructorTag
  | "request_tool_rentals"     // !isStaff + rentalApprovedTag
  | "access_worker_portal"     // isStaff + workerTag (for compatibility)
  | "access_manager_portal"    // isStaff + workerTag + managerTag (for compatibility)
  | "emulate_roles";           // role === "dev"

export function useCurrentUserV2() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users_v2.getCurrentUserV2);

  return {
    user,
    isLoading: isAuthenticated === undefined || (isAuthenticated && user === undefined),
    isAuthenticated,
  };
}

export function usePermissionsV2() {
  const { user, isLoading, isAuthenticated } = useCurrentUserV2();

  const checkPermission = (permission: V2Permission): boolean => {
    // Guest permissions (unauthenticated users OR Guest emulation)
    const isGuestMode = !isAuthenticated || (user?.effectiveRole && !user.effectiveRole.isStaff && !user.effectiveRole.rentalApprovedTag);

    if (isGuestMode) {
      switch (permission) {
        case "view_home_page":
        case "view_service_preview":
        case "sign_up":
          return true; // Guests can access these
        default:
          return false; // Guests cannot access anything else
      }
    }

    // Authenticated user permissions (non-Guest)
    if (!user || !user.effectiveRole) return false;
    const effective = user.effectiveRole;

    switch (permission) {
      // Everyone including guests (handled above)
      case "view_home_page":
      case "view_service_preview":
        return true;

      // Guests only (unauthenticated)
      case "sign_up":
        return false; // Already authenticated, can't sign up again

      // Authenticated users only
      case "view_public_services":
      case "browse_tools":
      case "browse_courses":
        return true; // All authenticated users

      case "access_staff_features":
        return effective.isStaff;

      case "request_shifts":
        return effective.isStaff && effective.workerTag;

      case "approve_shifts":
        return effective.isStaff && effective.workerTag && effective.managerTag;

      case "manage_courses":
        return effective.isStaff && effective.instructorTag;

      case "request_tool_rentals":
        return !effective.isStaff && effective.rentalApprovedTag;

      // Legacy compatibility permissions
      case "access_worker_portal":
        return effective.isStaff && effective.workerTag;

      case "access_manager_portal":
        return effective.isStaff && effective.workerTag && effective.managerTag;

      case "emulate_roles":
        return user.role === "dev";

      default:
        return false;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    checkPermission,
    hasPermission: checkPermission,
    // V2 role helpers
    isGuest: !isAuthenticated,
    isStaff: user?.effectiveRole?.isStaff ?? false,
    isCustomer: isAuthenticated && !(user?.effectiveRole?.isStaff ?? false),
    hasWorkerTag: user?.effectiveRole?.workerTag ?? false,
    hasInstructorTag: user?.effectiveRole?.instructorTag ?? false,
    hasManagerTag: user?.effectiveRole?.managerTag ?? false,
    hasRentalApprovedTag: user?.effectiveRole?.rentalApprovedTag ?? false,
    canEmulateRoles: user?.role === "dev",
    // Legacy compatibility
    role: user?.role,
    effectiveRole: getV2CompatibleRole(user?.effectiveRole, isAuthenticated),
  };
}

// Convert V2 tag system to legacy role for compatibility
function getV2CompatibleRole(effectiveRole: any, isAuthenticated: boolean): string {
  // Unauthenticated users are always guests
  if (!isAuthenticated) return "guest";

  // Authenticated users without effectiveRole data
  if (!effectiveRole) return "guest";

  if (effectiveRole.isStaff) {
    if (effectiveRole.workerTag && effectiveRole.managerTag) {
      return "manager";
    } else if (effectiveRole.workerTag) {
      return "worker";
    } else {
      return "worker"; // Staff without tags defaults to worker
    }
  } else {
    if (effectiveRole.rentalApprovedTag) {
      return "customer";
    } else {
      return "guest";
    }
  }
}

// Shortcut hooks for V2 system
export function useIsStaffV2() {
  const { isStaff } = usePermissionsV2();
  return isStaff;
}

export function useHasWorkerTagV2() {
  const { hasWorkerTag } = usePermissionsV2();
  return hasWorkerTag;
}

export function useHasManagerTagV2() {
  const { hasManagerTag } = usePermissionsV2();
  return hasManagerTag;
}

export function useHasInstructorTagV2() {
  const { hasInstructorTag } = usePermissionsV2();
  return hasInstructorTag;
}

export function useIsDevV2() {
  const { role } = usePermissionsV2();
  return role === "dev";
}