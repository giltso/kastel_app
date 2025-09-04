import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useIsDev, usePermissions, type UserRole } from "@/hooks/usePermissions";
import { Filter, UserIcon, Tag } from "lucide-react";

export function RoleSwitcher() {
  const isDev = useIsDev();
  const { user, effectiveRole } = usePermissions();
  const switchRole = useMutation(api.users.switchEmulatingRole);
  const toggleProTag = useMutation(api.users.toggleProTag);

  if (!isDev || !user) return null;

  const roles: Array<{ value: UserRole; label: string; description: string }> = [
    { value: "guest", label: "Guest", description: "Default new user role" },
    { value: "customer", label: "Customer", description: "External customer" },  
    { value: "worker", label: "Worker", description: "Operational staff" },
    { value: "manager", label: "Manager", description: "Worker + Manager permissions" },
  ];

  const handleRoleSwitch = (role: UserRole | null) => {
    // Only allow non-dev roles for emulation
    const emulatingRole = role && role !== 'dev' ? role as "guest" | "customer" | "worker" | "manager" : undefined;
    void switchRole({ emulatingRole });
  };

  const handleProToggle = async () => {
    try {
      // Fix: Check current pro status properly from the user object
      const currentlyHasPro = user.hasProAccess || user.proTag || (user.effectiveTags && user.effectiveTags.includes('pro'));
      await toggleProTag({ proTag: !currentlyHasPro });
    } catch (error) {
      console.error("Failed to toggle pro tag:", error);
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <Filter className="h-4 w-4" />
        <span className="text-xs">
          {effectiveRole === user.role ? `${effectiveRole}` : `${effectiveRole} (emulated)`}
        </span>
      </div>
      <div 
        tabIndex={0} 
        className="dropdown-content z-10 card card-border bg-base-100 text-base-content w-64 shadow-lg"
      >
        <div className="card-body">
          <h3 className="card-title text-sm">
            <UserIcon className="h-4 w-4" />
            Role Emulation
          </h3>
          <p className="text-xs opacity-70 mb-3">
            Switch between roles to test different permissions
          </p>
          
          <div className="space-y-2">
            <button
              className={`btn btn-sm w-full justify-start gap-2 ${
                effectiveRole === user.role ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => handleRoleSwitch(null)}
            >
              <span className="text-xs">🧪</span>
              <div className="text-left">
                <div className="text-xs font-medium">Stop Emulation</div>
                <div className="text-xs opacity-70">Return to dev role</div>
              </div>
            </button>

            {roles.map((role) => (
              <button
                key={role.value}
                className={`btn btn-sm w-full justify-start gap-2 ${
                  effectiveRole === role.value && effectiveRole !== user.role
                    ? "btn-primary" 
                    : "btn-ghost"
                }`}
                onClick={() => handleRoleSwitch(role.value)}
              >
                <span className="text-xs">
                  {role.value === "guest" ? "👤" : 
                   role.value === "customer" ? "🏪" :
                   role.value === "worker" ? "🔧" : "👔"}
                </span>
                <div className="text-left">
                  <div className="text-xs font-medium">{role.label}</div>
                  <div className="text-xs opacity-70">{role.description}</div>
                </div>
              </button>
            ))}

            {/* Pro Tag Toggle */}
            <div className="divider divider-horizontal text-xs opacity-50">Tags</div>
            <button
              className={`btn btn-sm w-full justify-start gap-2 ${
                user.hasProAccess || user.proTag || (user.effectiveTags && user.effectiveTags.includes('pro')) ? "btn-secondary" : "btn-outline"
              }`}
              onClick={handleProToggle}
            >
              <Tag className="w-4 h-4" />
              <span className="text-xs">
                {user.hasProAccess || user.proTag || (user.effectiveTags && user.effectiveTags.includes('pro')) ? "Remove Pro Tag" : "Add Pro Tag"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}