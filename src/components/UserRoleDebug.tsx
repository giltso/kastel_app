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
    return null; // Don't show loading state on main page
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

  // For existing users, don't show any debug UI on main page
  return null;
}