import { Users } from "lucide-react";

/**
 * LUZ Overview Component
 *
 * ARCHITECTURE:
 * - Summary dashboard showing key metrics and pending actions
 * - Manager-only pending approvals section with action buttons
 * - Assignment filtering ensures data consistency with timeline views
 * - Quick stats showing confirmed vs pending assignments
 *
 * DATA FILTERING:
 * - visibleAssignments: filters by shiftsForDate to match timeline data
 * - pendingAssignments: manager-only workflow for approvals
 * - Role-based UI: approval buttons only for managers
 *
 * CONSISTENCY CRITICAL:
 * - Must use same assignment filtering logic as timeline components
 * - Line 62-64: Assignment filtering by shiftsForDate prevents data conflicts
 *
 * SEARCH KEYWORDS: overview, dashboard, pending approvals, assignment filtering,
 * manager permissions, quick stats, data consistency, visible assignments
 */

interface LUZOverviewProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  pendingAssignments: any[];
  filters: {
    shifts: boolean;
    courses: boolean;
    rentals: boolean;
  };
  hasManagerTag: boolean;
}

export function LUZOverview({
  assignmentsForDate,
  shiftsForDate,
  pendingAssignments,
  filters,
  hasManagerTag
}: LUZOverviewProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Overview
      </h2>

      {/* Pending Actions */}
      {hasManagerTag && pendingAssignments && pendingAssignments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3 text-warning">Pending Approvals ({pendingAssignments.length})</h3>
          <div className="space-y-2">
            {pendingAssignments.slice(0, 3).map((assignment) => (
              <div key={assignment._id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{assignment.worker?.name}</div>
                    <div className="text-sm text-base-content/70">{assignment.shift?.name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-xs btn-success">Approve</button>
                    <button className="btn btn-xs btn-error">Reject</button>
                  </div>
                </div>
              </div>
            ))}
            {pendingAssignments.length > 3 && (
              <div className="text-center">
                <button className="btn btn-sm btn-outline">View All ({pendingAssignments.length})</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Assignments Summary - Filtered by active shifts only */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Today's Schedule</h3>
        {(() => {
          // Filter assignments to only show those for shifts that are displayed
          const visibleAssignments = assignmentsForDate?.filter(assignment =>
            shiftsForDate?.some(shift => shift._id === assignment.shiftTemplateId)
          ) || [];

          return visibleAssignments.length > 0 ? (
            <div className="space-y-2">
              {visibleAssignments.slice(0, 3).map((assignment) => (
                <div key={assignment._id} className="p-3 bg-base-200 rounded-lg">
                  <div className="font-medium">{assignment.worker?.name}</div>
                  <div className="text-sm text-base-content/70">
                    {assignment.shift?.name} • {assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}
                  </div>
                  <div className={`badge badge-sm ${
                    assignment.status === 'confirmed' ? 'badge-success' :
                    assignment.status.includes('pending') ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {assignment.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">No assignments for selected date</p>
          );
        })()}
      </div>

      {/* Available Shifts */}
      {filters.shifts && shiftsForDate && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Available Shifts</h3>
          {shiftsForDate.length > 0 ? (
            <div className="space-y-2">
              {shiftsForDate.map((shift) => (
                <div key={shift._id} className="p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="font-medium">{shift.name}</div>
                  <div className="text-sm text-base-content/70 mb-2">
                    {shift.storeHours.openTime} - {shift.storeHours.closeTime}
                  </div>
                  <button className="btn btn-xs btn-primary">
                    Request to Join
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">No shifts available for this day</p>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 bg-success/10 border border-success/20 rounded">
          <div className="text-lg font-bold">{assignmentsForDate?.filter(a => a.status === 'confirmed').length || 0}</div>
          <div className="text-xs">Confirmed</div>
        </div>
        <div className="p-2 bg-warning/10 border border-warning/20 rounded">
          <div className="text-lg font-bold">{pendingAssignments?.length || 0}</div>
          <div className="text-xs">Pending</div>
        </div>
      </div>
    </div>
  );
}