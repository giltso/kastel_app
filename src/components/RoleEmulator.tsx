import { useMutation } from "convex/react";
import { useState, useRef, useEffect } from "react";
import { Settings, User, Building2, GraduationCap, Crown, ShoppingBag } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

export function RoleEmulator() {
  const { user, canEmulateRoles } = usePermissionsV2();
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

  if (!canEmulateRoles || !user?.effectiveRole) return null;

  const effective = user.effectiveRole;

  const handleToggle = async (field: string, value: boolean) => {
    const updates: Record<string, boolean> = { [field]: value };

    // Enforce business rule: Manager tag requires Worker tag
    if (field === 'managerTag' && value && !effective.workerTag) {
      updates.workerTag = true;
    }

    // If removing worker tag, also remove manager tag
    if (field === 'workerTag' && !value && effective.managerTag) {
      updates.managerTag = false;
    }

    try {
      await switchRole(updates);
    } catch (error) {
      console.error("Failed to toggle role:", error);
    }
  };

  const getRoleDisplayText = () => {
    if (!effective.isStaff) {
      return effective.rentalApprovedTag ? "Customer+" : "Guest";
    }

    const tags = [];
    if (effective.workerTag) tags.push("W");
    if (effective.instructorTag) tags.push("I");
    if (effective.managerTag) tags.push("M");

    return `Staff${tags.length > 0 ? `+${tags.join("")}` : ""}`;
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

            {/* Base Role Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-base-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Staff Access</div>
                    <div className="text-xs opacity-70">Base staff permissions</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={effective.isStaff}
                  onChange={(e) => handleToggle('isStaff', e.target.checked)}
                />
              </div>

              {/* Staff-only tags */}
              {effective.isStaff && (
                <div className="ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
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

              {/* Customer-only tags */}
              {!effective.isStaff && (
                <div className="flex items-center justify-between p-2 rounded bg-base-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-accent" />
                    <div>
                      <div className="text-sm">Rental Approved</div>
                      <div className="text-xs opacity-70">Can request tool rentals</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent toggle-sm"
                    checked={effective.rentalApprovedTag}
                    onChange={(e) => handleToggle('rentalApprovedTag', e.target.checked)}
                  />
                </div>
              )}

              {/* Quick Reset */}
              <div className="pt-2 border-t border-base-300">
                <button
                  className="btn btn-ghost btn-sm w-full text-xs"
                  onClick={() => handleToggle('isStaff', false)}
                >
                  Reset to Guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}