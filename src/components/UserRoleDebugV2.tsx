import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

export function UserRoleDebugV2() {
  const { user, isLoading } = usePermissionsV2();

  if (isLoading || !user) return null;

  const effective = user.effectiveRole;

  return (
    <div className="text-xs opacity-60 font-mono">
      <div>V2 Debug:</div>
      <div>Staff: {effective?.isStaff ? "✓" : "✗"}</div>
      <div>Worker: {effective?.workerTag ? "✓" : "✗"}</div>
      <div>Instructor: {effective?.instructorTag ? "✓" : "✗"}</div>
      <div>Manager: {effective?.managerTag ? "✓" : "✗"}</div>
      <div>Rental: {effective?.rentalApprovedTag ? "✓" : "✗"}</div>
    </div>
  );
}