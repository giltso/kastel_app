import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useIsTester, usePermissions, type UserRole } from "@/hooks/usePermissions";
import { Filter, UserIcon } from "lucide-react";

export function RoleSwitcher() {
  const isTester = useIsTester();
  const { user, effectiveRole } = usePermissions();
  const switchRole = useMutation(api.users.switchEmulatingRole);

  if (!isTester || !user) return null;

  const roles: Array<{ value: UserRole; label: string; description: string }> = [
    { value: "guest", label: "Guest", description: "Default new user role" },
    { value: "customer", label: "Customer", description: "External customer" },
    { value: "worker", label: "Worker", description: "Operational staff" },
    { value: "manager", label: "Manager", description: "Full permissions" },
  ];

  const handleRoleSwitch = (role: UserRole | null) => {
    void switchRole({ emulatingRole: role || undefined });
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
                <div className="text-xs font-medium">Tester (Real Role)</div>
                <div className="text-xs opacity-70">All permissions</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}