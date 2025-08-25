import { useCurrentUser } from "@/hooks/usePermissions";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function UserRoleDebug() {
  const { user, isLoading } = useCurrentUser();
  const createTestUser = useMutation(api.debug.createTestUser);

  const handleCreateUser = async () => {
    try {
      const result = await createTestUser();
      console.log("User creation result:", result);
      // Refresh the page to update the role
      window.location.reload();
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-info/20 text-info-content px-3 py-1 rounded-md text-sm">
        Loading user...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-error/20 text-error-content px-3 py-1 rounded-md text-sm">
          No user in database
        </div>
        <button 
          onClick={handleCreateUser}
          className="btn btn-sm btn-primary"
        >
          Create User
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary/20 text-primary-content px-3 py-1 rounded-md text-sm">
        Role: {user.effectiveRole || user.role || "undefined"}
        {user.role === "tester" && user.emulatingRole && (
          <span className="ml-2 opacity-70">(emulating {user.emulatingRole})</span>
        )}
      </div>
      <button 
        onClick={handleCreateUser}
        className="btn btn-xs btn-secondary"
        title="Refresh/Create User"
      >
        🔄
      </button>
    </div>
  );
}