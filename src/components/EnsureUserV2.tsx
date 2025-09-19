import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export function EnsureUserV2() {
  const { isLoaded, isSignedIn, user } = useUser();
  const ensureUser = useMutation(api.users_v2.createOrUpdateUserV2);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Create/update user with V2 schema
      void ensureUser({
        clerkId: user.id,
        name: user.fullName || user.primaryEmailAddress?.emailAddress || "Unknown",
        email: user.primaryEmailAddress?.emailAddress,
        // Default new users as dev for testing
        role: "dev",
        isStaff: true,
        workerTag: true,
        instructorTag: false,
        managerTag: false,
        rentalApprovedTag: false,
      });
    }
  }, [isLoaded, isSignedIn, user, ensureUser]);

  return null;
}