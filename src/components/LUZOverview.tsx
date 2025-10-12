import { Users, ChevronDown } from "lucide-react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";

/**
 * LUZ Overview Component
 *
 * ARCHITECTURE:
 * - Summary dashboard showing key metrics and pending actions
 * - Manager-only pending approvals section with action buttons
 * - Assignment filtering ensures data consistency with timeline views
 * - Quick stats showing confirmed vs pending assignments
 * - Collapsible on mobile to prioritize calendar view
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
 * manager permissions, quick stats, data consistency, visible assignments, collapsible
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
  onReviewRequests?: () => void;
  onApproveAssignment?: (assignmentId: string) => void;
  onRejectAssignment?: (assignmentId: string) => void;
  onRequestJoin?: (shiftId: string, date: string) => void;
  onAssignWorker?: (shiftId: string, date: string) => void;
  onEditAssignment?: (assignmentId: string) => void;
}

export function LUZOverview({
  assignmentsForDate,
  shiftsForDate,
  pendingAssignments,
  filters,
  hasManagerTag,
  onReviewRequests,
  onApproveAssignment,
  onRejectAssignment,
  onRequestJoin,
  onAssignWorker,
  onEditAssignment
}: LUZOverviewProps) {
  const { t } = useLanguage();
  const { user } = usePermissionsV2();

  // Collapsible state - default to collapsed on mobile only
  const [isExpanded, setIsExpanded] = useState(false);

  // On mount, check screen size and set default state
  useEffect(() => {
    const updateExpandedState = () => {
      // Auto-expand on desktop (lg breakpoint = 1024px)
      setIsExpanded(window.innerWidth >= 1024);
    };

    updateExpandedState();
    window.addEventListener('resize', updateExpandedState);
    return () => window.removeEventListener('resize', updateExpandedState);
  }, []);

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
      {/* Header - Always visible, clickable on mobile */}
      <button
        className="w-full p-3 flex items-center justify-between lg:cursor-default lg:p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 mx-auto lg:mx-0 lg:text-xl">
          <Users className="w-5 h-5" />
          {t("shifts:luz.overview")}
        </h2>
        <ChevronDown
          className={`w-5 h-5 transition-transform lg:hidden absolute right-3 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content - Collapsible on mobile, always visible on desktop */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block px-4 pb-4`}>

      {/* Pending Actions */}
      {hasManagerTag && pendingAssignments && pendingAssignments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3 text-warning">{t("shifts:assignment.pending")} ({pendingAssignments.length})</h3>
          <div className="space-y-2">
            {pendingAssignments.slice(0, 3).map((assignment) => (
              <div key={assignment._id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{assignment.worker?.name}</div>
                    <div className="text-sm text-base-content/70">{assignment.shift?.name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-xs btn-success"
                      onClick={() => onApproveAssignment?.(assignment._id)}
                    >
                      {t("shifts:assignment.approved")}
                    </button>
                    <button
                      className="btn btn-xs btn-error"
                      onClick={() => onRejectAssignment?.(assignment._id)}
                    >
                      {t("shifts:assignment.rejected")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingAssignments.length > 3 && (
              <div className="text-center">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => onReviewRequests?.()}
                >
                  {t("common:actions.viewAll")} ({pendingAssignments.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Assignments Summary - Filtered by active shifts only */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">{t("shifts:luz.todaySchedule")}</h3>
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
                    {t(`shifts:assignment.${assignment.status}`)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">{t("shifts:luz.noAssignmentsForDate")}</p>
          );
        })()}
      </div>

      {/* Available Shifts */}
      {filters.shifts && shiftsForDate && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">{t("shifts:luz.availableShifts")}</h3>
          {shiftsForDate.length > 0 ? (
            <div className="space-y-2">
              {shiftsForDate.map((shift) => {
                // Check if current user has an assignment for this shift
                const userAssignment = assignmentsForDate.find(
                  assignment => assignment.shiftTemplateId === shift._id && assignment.workerId === user?._id
                );

                return (
                  <div key={shift._id} className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <div className="font-medium">{shift.name}</div>
                    <div className="text-sm text-base-content/70 mb-2">
                      {shift.storeHours.openTime} - {shift.storeHours.closeTime}
                    </div>
                    <div className="flex gap-1">
                      {userAssignment ? (
                        // Show Edit Assignment button if user has assignment for this shift
                        <button
                          className="btn btn-xs btn-warning"
                          onClick={() => onEditAssignment?.(userAssignment._id)}
                        >
                          {t("shifts:assignment.editAssignment")}
                        </button>
                      ) : (
                        // Show Request to Join button if user doesn't have assignment
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => onRequestJoin?.(shift._id, new Date().toISOString().split('T')[0])}
                        >
                          {t("shifts:assignment.requestJoin")}
                        </button>
                      )}
                      {hasManagerTag && (
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => onAssignWorker?.(shift._id, new Date().toISOString().split('T')[0])}
                        >
                          {t("shifts:assignment.assignWorker")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">{t("shifts:luz.noShiftsAvailable")}</p>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 bg-success/10 border border-success/20 rounded">
          <div className="text-lg font-bold">{assignmentsForDate?.filter(a => a.status === 'confirmed').length || 0}</div>
          <div className="text-xs">{t("shifts:luz.confirmedCount")}</div>
        </div>
        <div className="p-2 bg-warning/10 border border-warning/20 rounded">
          <div className="text-lg font-bold">{pendingAssignments?.length || 0}</div>
          <div className="text-xs">{t("shifts:luz.pendingCount")}</div>
        </div>
      </div>
      </div>
    </div>
  );
}