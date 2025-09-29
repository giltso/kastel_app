import { Clock, Users, MapPin, Calendar, Edit, UserPlus, CheckCircle, XCircle, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface ShiftDetailsModalProps {
  shiftId: Id<"shifts"> | null;
  selectedDate: string;
  isOpen: boolean;
  onClose: () => void;
  onEditShift?: (shiftId: Id<"shifts">) => void;
  onAssignWorker?: (shiftId: Id<"shifts">, date: string) => void;
  onRequestJoin?: (shiftId: Id<"shifts">, date: string) => void;
  onEditAssignment?: (assignmentId: Id<"shift_assignments">) => void;
  onApproveAssignment?: (assignmentId: Id<"shift_assignments">) => void;
  onReviewRequests?: (shiftId: Id<"shifts">) => void;
}

export function ShiftDetailsModal({
  shiftId,
  selectedDate,
  isOpen,
  onClose,
  onEditShift,
  onAssignWorker,
  onRequestJoin,
  onEditAssignment,
  onApproveAssignment,
  onReviewRequests,
}: ShiftDetailsModalProps) {
  const { user, hasWorkerTag, hasManagerTag } = usePermissionsV2();

  // Fetch shift details
  const shift = useQuery(
    api.shifts.getShiftTemplate,
    shiftId ? { shiftId } : "skip"
  );

  // Fetch assignments for this shift on the selected date
  const assignmentsForDate = useQuery(
    api.shift_assignments.getAssignmentsForDate,
    { date: selectedDate }
  ) || [];

  // Filter assignments for this specific shift
  const shiftAssignments = assignmentsForDate.filter(
    assignment => assignment.shiftTemplateId === shiftId
  );

  // Find current user's assignment for this shift
  const myAssignment = shiftAssignments.find(
    assignment => assignment.workerId === user?._id
  );

  // Calculate staffing status
  const getStaffingStatus = () => {
    if (!shift) return null;

    const confirmedWorkers = shiftAssignments.filter(a => a.status === 'confirmed').length;
    const minWorkers = Math.max(...shift.hourlyRequirements.map(req => req.minWorkers));
    const optimalWorkers = Math.max(...shift.hourlyRequirements.map(req => req.optimalWorkers));

    if (confirmedWorkers < minWorkers) {
      return { status: 'understaffed', color: 'error', confirmedWorkers, minWorkers, optimalWorkers };
    } else if (confirmedWorkers === minWorkers) {
      return { status: 'minimum', color: 'warning', confirmedWorkers, minWorkers, optimalWorkers };
    } else if (confirmedWorkers <= optimalWorkers) {
      return { status: 'good', color: 'success', confirmedWorkers, minWorkers, optimalWorkers };
    } else {
      return { status: 'overstaffed', color: 'info', confirmedWorkers, minWorkers, optimalWorkers };
    }
  };

  const staffingStatus = getStaffingStatus();

  // Get pending assignments that need worker approval
  const pendingWorkerApprovals = shiftAssignments.filter(
    assignment => assignment.status === 'pending_worker_approval' && assignment.workerId === user?._id
  );

  // Get pending manager approvals for this shift
  const pendingManagerApprovals = shiftAssignments.filter(
    assignment => assignment.status === 'pending_manager_approval'
  );

  if (!isOpen || !shift) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-2xl">{shift.name}</h3>
            <p className="text-base-content/70 mt-1">{shift.description}</p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Shift Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Basic Information */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Hours:</span>
                <span className="font-medium">{shift.storeHours.openTime} - {shift.storeHours.closeTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium capitalize">{shift.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Recurring:</span>
                <span className="font-medium">{shift.recurringDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Staffing Status */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staffing Status
            </h4>
            {staffingStatus && (
              <div className="space-y-2">
                <div className={`badge badge-${staffingStatus.color} badge-lg`}>
                  {staffingStatus.status === 'understaffed' && 'Understaffed'}
                  {staffingStatus.status === 'minimum' && 'Minimum Staffed'}
                  {staffingStatus.status === 'good' && 'Well Staffed'}
                  {staffingStatus.status === 'overstaffed' && 'Overstaffed'}
                </div>
                <div className="text-sm">
                  <div>Current: <span className="font-medium">{staffingStatus.confirmedWorkers}</span></div>
                  <div>Minimum: <span className="font-medium">{staffingStatus.minWorkers}</span></div>
                  <div>Optimal: <span className="font-medium">{staffingStatus.optimalWorkers}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Requirements */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Hourly Requirements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {shift.hourlyRequirements.map((req, index) => (
              <div key={index} className="bg-base-100 border border-base-300 rounded p-3">
                <div className="font-medium">{req.hour}</div>
                <div className="text-sm text-base-content/70">
                  Min: {req.minWorkers} | Optimal: {req.optimalWorkers}
                </div>
                {req.notes && (
                  <div className="text-xs text-base-content/60 mt-1">{req.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Assignments - Role-adaptive content */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Current Assignments</h4>
          {shiftAssignments.length === 0 ? (
            <div className="text-base-content/60 text-center py-4">
              No assignments for this date
            </div>
          ) : (
            <div className="space-y-2">
              {shiftAssignments.map((assignment) => (
                <div key={assignment._id} className="bg-base-100 border border-base-300 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{assignment.worker?.name}</div>
                      <div className="text-sm text-base-content/70">
                        Status: <span className={`font-medium ${
                          assignment.status === 'confirmed' ? 'text-success' :
                          assignment.status === 'pending_worker_approval' ? 'text-warning' :
                          assignment.status === 'pending_manager_approval' ? 'text-info' :
                          'text-error'
                        }`}>
                          {assignment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>

                      {/* Manager-only: Show detailed assignment information */}
                      {hasManagerTag && (
                        <div className="text-sm mt-2">
                          {assignment.assignedHours && assignment.assignedHours.length > 0 && (
                            <div>
                              Hours: {assignment.assignedHours.map(h => `${h.startTime}-${h.endTime}`).join(', ')}
                            </div>
                          )}
                          {assignment.assignmentNotes && (
                            <div className="text-base-content/60">Notes: {assignment.assignmentNotes}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Role-based action buttons */}
                    <div className="flex gap-2">
                      {/* Worker-only: Approve pending assignments assigned to them */}
                      {hasWorkerTag && assignment.workerId === user?._id &&
                       assignment.status === 'pending_worker_approval' && (
                        <button
                          className="btn btn-xs btn-success"
                          onClick={() => onApproveAssignment?.(assignment._id)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Actions for Current User */}
        {pendingWorkerApprovals.length > 0 && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <h4 className="font-semibold text-warning mb-2">Action Required</h4>
            <p className="text-sm mb-3">You have {pendingWorkerApprovals.length} pending assignment(s) that need your approval.</p>
            {pendingWorkerApprovals.map((assignment) => (
              <div key={assignment._id} className="flex justify-between items-center">
                <span className="text-sm">Assignment by {assignment.assignedBy?.name}</span>
                <button
                  className="btn btn-xs btn-success"
                  onClick={() => onApproveAssignment?.(assignment._id)}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons - Role-adaptive */}
        <div className="flex flex-wrap gap-3">
          {/* Base Worker Actions */}
          {hasWorkerTag && (
            <>
              {!myAssignment ? (
                /* Request to Join - if not already assigned */
                onRequestJoin && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onRequestJoin(shift._id, selectedDate)}
                  >
                    <Plus className="w-4 h-4" />
                    Request to Join
                  </button>
                )
              ) : (
                /* Edit Assignment - if user is assigned */
                <div className="flex items-center gap-2">
                  <div className={`badge ${
                    myAssignment.status === 'confirmed' ? 'badge-success' :
                    myAssignment.status === 'pending_worker_approval' ? 'badge-warning' :
                    myAssignment.status === 'pending_manager_approval' ? 'badge-info' :
                    'badge-error'
                  }`}>
                    Your Status: {myAssignment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  {onEditAssignment && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => onEditAssignment(myAssignment._id)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit Assignment
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Manager-only Actions (Additive) */}
          {hasManagerTag && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => onEditShift?.(shift._id)}
              >
                <Edit className="w-4 h-4" />
                Edit Shift
              </button>

              <button
                className="btn btn-accent"
                onClick={() => onAssignWorker?.(shift._id, selectedDate)}
              >
                <UserPlus className="w-4 h-4" />
                Assign Worker
              </button>

              {pendingManagerApprovals.length > 0 && (
                <button
                  className="btn btn-warning"
                  onClick={() => onReviewRequests?.(shift._id)}
                >
                  <CheckCircle className="w-4 h-4" />
                  Review Requests ({pendingManagerApprovals.length})
                </button>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}