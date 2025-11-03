import { useMutation } from "convex/react";
import { useState, useRef, useEffect } from "react";
import { Settings, User, Building2, GraduationCap, Crown, ShoppingBag } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

export function RoleEmulator() {
  const { user, canEmulateRoles, isAuthenticated } = usePermissionsV2();
  const switchRole = useMutation(api.users_v2.switchV2Role);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!canEmulateRoles || !user) return null;

  // Construct effective permissions from user's direct fields
  const effective = {
    isStaff: user.isStaff ?? false,
    workerTag: user.workerTag ?? false,
    instructorTag: user.instructorTag ?? false,
    toolHandlerTag: user.toolHandlerTag ?? false,
    managerTag: user.managerTag ?? false,
    rentalApprovedTag: user.rentalApprovedTag ?? false,
  };

  const handleToggle = async (field: string, value: boolean) => {
    // Start with current state to preserve other fields
    const currentState = {
      isStaff: effective.isStaff,
      workerTag: effective.workerTag,
      instructorTag: effective.instructorTag,
      toolHandlerTag: effective.toolHandlerTag,
      managerTag: effective.managerTag,
      rentalApprovedTag: effective.rentalApprovedTag,
    };

    // Apply the specific change
    const updates = { ...currentState, [field]: value };

    // Enforce business rule: Manager tag requires Worker tag
    if (field === 'managerTag' && value && !updates.workerTag) {
      updates.workerTag = true;
    }

    // If removing worker tag, also remove manager tag
    if (field === 'workerTag' && !value && updates.managerTag) {
      updates.managerTag = false;
    }

    // Special handling for Staff toggle - reset tags when becoming non-staff
    if (field === 'isStaff' && !value) {
      updates.workerTag = false;
      updates.instructorTag = false;
      updates.toolHandlerTag = false;
      updates.managerTag = false;
      // When switching from Staff to Customer, preserve authentication
      // Customer state will be handled by the UI logic
    }

    // When switching to staff, reset customer tags
    if (field === 'isStaff' && value) {
      updates.rentalApprovedTag = false; // Staff can't have rental approval
    }


    try {
      await switchRole(updates);
    } catch (error) {
      console.error("Failed to toggle role:", error);
    }
  };

  const getRoleDisplayText = () => {
    // Not authenticated (shouldn't happen in V2 dev system, but handle gracefully)
    if (!isAuthenticated) {
      return "Guest";
    }

    // Staff base role
    if (effective.isStaff) {
      const staffTags = [];
      if (effective.workerTag) staffTags.push("W");
      if (effective.instructorTag) staffTags.push("I");
      if (effective.toolHandlerTag) staffTags.push("T");
      if (effective.managerTag) staffTags.push("M");

      return `Staff${staffTags.length > 0 ? `+${staffTags.join("")}` : ""}`;
    }

    // Customer base role (authenticated, not staff)
    if (isAuthenticated && !effective.isStaff) {
      const customerTags = [];
      if (effective.rentalApprovedTag) customerTags.push("R"); // Tool Renter
      // TODO: Add student tag when implemented

      return `Customer${customerTags.length > 0 ? `+${customerTags.join("")}` : ""}`;
    }

    // Guest (authenticated but no permissions)
    return "Guest";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-ghost btn-sm gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="h-3 w-3" />
        <span className="text-xs">{getRoleDisplayText()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[100] card card-border bg-base-100 w-72 shadow-xl border"
        >
          <div className="card-body p-4">
            <h3 className="card-title text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Role Emulation
            </h3>
            <p className="text-xs opacity-70 mb-4">
              Toggle individual role attributes to test permissions
            </p>

            {/* Base Role Selection */}
            <div className="space-y-3">
              {/* Customer/Staff Toggle */}
              <div className="p-2 rounded bg-base-200">
                <div className="text-sm font-medium mb-2">Base Role</div>
                <div className="join w-full">
                  <input
                    className="join-item btn btn-sm flex-1"
                    type="radio"
                    name="baseRole"
                    aria-label="Customer"
                    checked={isAuthenticated && !effective.isStaff}
                    onChange={async () => {
                      // Customer = authenticated, not staff, with rental approval
                      await switchRole({
                        isStaff: false,
                        workerTag: false,
                        instructorTag: false,
                        toolHandlerTag: false,
                        managerTag: false,
                        rentalApprovedTag: true, // Customer needs rental approval
                      });
                    }}
                  />
                  <input
                    className="join-item btn btn-sm flex-1"
                    type="radio"
                    name="baseRole"
                    aria-label="Staff"
                    checked={effective.isStaff}
                    onChange={() => handleToggle('isStaff', true)}
                  />
                </div>
              </div>

              {/* Staff Sub-tags */}
              {effective.isStaff && (
                <div className="ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
                  <div className="text-xs font-medium opacity-70 mb-2">Staff Tags:</div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-info" />
                      <div>
                        <div className="text-sm">Worker Tag</div>
                        <div className="text-xs opacity-70">Operational capabilities</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-info toggle-sm"
                      checked={effective.workerTag}
                      onChange={(e) => handleToggle('workerTag', e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3 text-secondary" />
                      <div>
                        <div className="text-sm">Instructor Tag</div>
                        <div className="text-xs opacity-70">Course management</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary toggle-sm"
                      checked={effective.instructorTag}
                      onChange={(e) => handleToggle('instructorTag', e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-3 w-3 text-accent" />
                      <div>
                        <div className="text-sm">Tool Handler Tag</div>
                        <div className="text-xs opacity-70">Tool rental management</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-accent toggle-sm"
                      checked={effective.toolHandlerTag}
                      onChange={(e) => handleToggle('toolHandlerTag', e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3 text-warning" />
                      <div>
                        <div className="text-sm">Manager Tag</div>
                        <div className="text-xs opacity-70">Approval permissions</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-warning toggle-sm"
                      checked={effective.managerTag}
                      disabled={!effective.workerTag}
                      onChange={(e) => handleToggle('managerTag', e.target.checked)}
                    />
                  </div>
                </div>
              )}

              {/* Customer Sub-tags */}
              {isAuthenticated && !effective.isStaff && (
                <div className="ml-4 space-y-2 border-l-2 border-accent/20 pl-3">
                  <div className="text-xs font-medium opacity-70 mb-2">Customer Tags:</div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-3 w-3 text-accent" />
                      <div>
                        <div className="text-sm">Tool Renter</div>
                        <div className="text-xs opacity-70">Approved for tool rentals</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-accent toggle-sm"
                      checked={effective.rentalApprovedTag}
                      onChange={(e) => handleToggle('rentalApprovedTag', e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3 text-info" />
                      <div>
                        <div className="text-sm">Student</div>
                        <div className="text-xs opacity-70">Access to enrolled course details</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-info toggle-sm"
                      checked={false} // TODO: Add student tag to schema
                      disabled={true} // Disabled until student tag is implemented
                      onChange={(e) => {}} // TODO: Implement student tag handling
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}