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
      <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Compact Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-xl">{shift.name}</h3>
            {shift.description && (
              <p className="text-sm text-base-content/70">{shift.description}</p>
            )}
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* LEFT COLUMN: Schedule Details & Staffing Status */}
          <div className="space-y-4">
            {/* Schedule Details */}
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                Schedule Details
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Date:</span>
                  <span className="font-medium">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Hours:</span>
                  <span className="font-medium">{shift.storeHours.openTime} - {shift.storeHours.closeTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Type:</span>
                  <span className="font-medium capitalize">{shift.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Days:</span>
                  <span className="font-medium text-xs">{shift.recurringDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Staffing Status */}
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Staffing Status
              </h4>
              {staffingStatus && (
                <div className="space-y-2">
                  <div className={`badge badge-${staffingStatus.color} badge-md`}>
                    {staffingStatus.status === 'understaffed' && 'Understaffed'}
                    {staffingStatus.status === 'minimum' && 'Minimum'}
                    {staffingStatus.status === 'good' && 'Well Staffed'}
                    {staffingStatus.status === 'overstaffed' && 'Overstaffed'}
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Current:</span>
                      <span className="font-medium">{staffingStatus.confirmedWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Minimum:</span>
                      <span className="font-medium">{staffingStatus.minWorkers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Optimal:</span>
                      <span className="font-medium">{staffingStatus.optimalWorkers}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Hourly Requirements Timeline */}
          <div>
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                Hourly Requirements Timeline
              </h4>

              {/* Timeline Container with Assignment Preview */}
              <div className="relative bg-base-100 rounded-lg border border-base-300 p-3" style={{ minHeight: '300px' }}>
                {/* Time axis */}
                <div className="absolute left-0 top-3 w-full">
                  {/* Hour labels */}
                  <div className="flex justify-between text-xs text-base-content/70 mb-2">
                    {shift.hourlyRequirements.map((req, index) => (
                      <div key={index} className="flex-1 text-center">
                        {req.hour}
                      </div>
                    ))}
                  </div>

                  {/* Timeline background */}
                  <div className="h-40 bg-base-200 rounded relative">
                    {/* Hour dividers */}
                    {shift.hourlyRequirements.map((_, index) => (
                      <div
                        key={index}
                        className="absolute top-0 bottom-0 w-px bg-base-300/50"
                        style={{
                          left: `${(index / (shift.hourlyRequirements.length - 1)) * 100}%`
                        }}
                      />
                    ))}

                    {/* Assignment blocks - similar to daily timeline */}
                    {shiftAssignments.filter(a => a.status === 'confirmed').map((assignment, workerIndex) => {
                      if (!assignment.assignedHours || assignment.assignedHours.length === 0) {
                        return null;
                      }

                      return assignment.assignedHours.map((timeSlot, slotIndex) => {
                        const startHour = parseInt(timeSlot.startTime.split(':')[0]);
                        const endHour = parseInt(timeSlot.endTime.split(':')[0]);
                        const shiftStartHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                        const shiftEndHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                        const shiftDuration = shiftEndHour - shiftStartHour;

                        // Calculate position as percentage of shift timeline
                        const startPercent = ((startHour - shiftStartHour) / shiftDuration) * 100;
                        const widthPercent = ((endHour - startHour) / shiftDuration) * 100;

                        return (
                          <div
                            key={`${assignment._id}-${slotIndex}`}
                            className="absolute bg-success/60 border border-success rounded text-white"
                            style={{
                              left: `${Math.max(0, startPercent)}%`,
                              width: `${Math.min(widthPercent, 100 - startPercent)}%`,
                              top: `${10 + (workerIndex * 25) + (slotIndex * 3)}px`,
                              height: '20px',
                            }}
                            title={`${assignment.worker?.name} (${timeSlot.startTime} - ${timeSlot.endTime})`}
                          >
                            <div className="px-2 py-0.5 text-xs font-medium truncate leading-tight">
                              {assignment.worker?.name}
                            </div>
                          </div>
                        );
                      });
                    }).flat()}
                  </div>

                  {/* Staffing requirements indicators */}
                  <div className="mt-3 space-y-1">
                    {shift.hourlyRequirements.map((req, index) => {
                      const hourInt = parseInt(req.hour.split(':')[0]);
                      const currentStaffing = shiftAssignments.filter(assignment =>
                        assignment.status === 'confirmed' && assignment.assignedHours?.some(timeSlot => {
                          const assignStart = parseInt(timeSlot.startTime.split(':')[0]);
                          const assignEnd = parseInt(timeSlot.endTime.split(':')[0]);
                          return hourInt >= assignStart && hourInt < assignEnd;
                        })
                      ).length;

                      const status = currentStaffing < req.minWorkers ? 'understaffed' :
                                    currentStaffing === req.minWorkers ? 'minimum' :
                                    currentStaffing <= req.optimalWorkers ? 'good' : 'overstaffed';

                      const statusColor = {
                        understaffed: 'text-error',
                        minimum: 'text-warning',
                        good: 'text-success',
                        overstaffed: 'text-info'
                      }[status];

                      return (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-base-content/70">{req.hour}</span>
                          <span className={`font-medium ${statusColor}`}>
                            {currentStaffing}/{req.minWorkers}
                            {req.optimalWorkers !== req.minWorkers && ` (${req.optimalWorkers})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Assignments - Compact version */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2 text-sm">Current Assignments</h4>
          {shiftAssignments.length === 0 ? (
            <div className="text-base-content/60 text-center py-2 text-sm">
              No assignments for this date
            </div>
          ) : (
            <div className="space-y-1">
              {shiftAssignments.map((assignment) => (
                <div key={assignment._id} className="bg-base-100 border border-base-300/50 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{assignment.worker?.name}</div>
                      <div className={`badge badge-xs ${
                        assignment.status === 'confirmed' ? 'badge-success' :
                        assignment.status === 'pending_worker_approval' ? 'badge-warning' :
                        assignment.status === 'pending_manager_approval' ? 'badge-info' :
                        'badge-error'
                      }`}>
                        {assignment.status === 'confirmed' ? 'Confirmed' :
                         assignment.status === 'pending_worker_approval' ? 'Pending Worker' :
                         assignment.status === 'pending_manager_approval' ? 'Pending Manager' :
                         'Rejected'}
                      </div>
                    </div>

                    {/* Compact action button */}
                    {hasWorkerTag && assignment.workerId === user?._id &&
                     assignment.status === 'pending_worker_approval' && (
                      <button
                        className="btn btn-xs btn-success"
                        onClick={() => onApproveAssignment?.(assignment._id)}
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Compact assignment details */}
                  {assignment.assignedHours && assignment.assignedHours.length > 0 && (
                    <div className="text-xs text-base-content/70 mt-1">
                      {assignment.assignedHours.map(h => `${h.startTime}-${h.endTime}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Actions for Current User - Compact */}
        {pendingWorkerApprovals.length > 0 && (
          <div className="mb-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <h4 className="font-semibold text-warning mb-2 text-sm">Action Required</h4>
            <p className="text-xs mb-2">You have {pendingWorkerApprovals.length} pending assignment(s).</p>
            {pendingWorkerApprovals.map((assignment) => (
              <div key={assignment._id} className="flex justify-between items-center">
                <span className="text-xs">Assignment by {assignment.assignedBy?.name}</span>
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

        {/* Compact Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {/* Base Worker Actions */}
            {hasWorkerTag && (
              <>
                {!myAssignment ? (
                  /* Request to Join - if not already assigned */
                  onRequestJoin && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onRequestJoin(shift._id, selectedDate)}
                    >
                      <Plus className="w-3 h-3" />
                      Request to Join
                    </button>
                  )
                ) : (
                  /* Edit Assignment - if user is assigned */
                  <div className="flex items-center gap-2">
                    <div className={`badge badge-xs ${
                      myAssignment.status === 'confirmed' ? 'badge-success' :
                      myAssignment.status === 'pending_worker_approval' ? 'badge-warning' :
                      myAssignment.status === 'pending_manager_approval' ? 'badge-info' :
                      'badge-error'
                    }`}>
                      {myAssignment.status === 'confirmed' ? 'Confirmed' :
                       myAssignment.status === 'pending_worker_approval' ? 'Pending Worker' :
                       myAssignment.status === 'pending_manager_approval' ? 'Pending Manager' :
                       'Rejected'}
                    </div>
                    {onEditAssignment && (
                      <button
                        className="btn btn-warning btn-xs"
                        onClick={() => onEditAssignment(myAssignment._id)}
                      >
                        <Edit className="w-3 h-3" />
                        Edit
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
                  className="btn btn-secondary btn-sm"
                  onClick={() => onEditShift?.(shift._id)}
                >
                  <Edit className="w-3 h-3" />
                  Edit Shift
                </button>

                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => onAssignWorker?.(shift._id, selectedDate)}
                >
                  <UserPlus className="w-3 h-3" />
                  Assign Worker
                </button>

                {pendingManagerApprovals.length > 0 && (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => onReviewRequests?.(shift._id)}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Review ({pendingManagerApprovals.length})
                  </button>
                )}
              </>
            )}
          </div>

          {/* Close button */}
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}