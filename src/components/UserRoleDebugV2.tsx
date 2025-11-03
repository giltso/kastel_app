import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

export function UserRoleDebugV2() {
  const { user, isLoading } = usePermissionsV2();

  if (isLoading || !user) return null;

  return (
    <div className="text-xs opacity-60 font-mono">
      <div>V2 Debug:</div>
      <div>Staff: {user.isStaff ? "✓" : "✗"}</div>
      <div>Worker: {user.workerTag ? "✓" : "✗"}</div>
      <div>Instructor: {user.instructorTag ? "✓" : "✗"}</div>
      <div>Manager: {user.managerTag ? "✓" : "✗"}</div>
      <div>Rental: {user.rentalApprovedTag ? "✓" : "✗"}</div>
      <div>Dev: {user.isDev ? "✓" : "✗"}</div>
    </div>
  );
}