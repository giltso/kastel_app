import { useState, useEffect } from "react";
import { Clock, Users, Calendar, Plus, AlertCircle, Edit } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface EditAssignmentModalProps {
  assignmentId: Id<"shift_assignments"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditAssignmentModal({
  assignmentId,
  isOpen,
  onClose,
  onSuccess,
}: EditAssignmentModalProps) {
  const { user, hasManagerTag } = usePermissionsV2();
  const [requestNotes, setRequestNotes] = useState("");
  const [selectedHours, setSelectedHours] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all assignments to find the specific assignment
  const allAssignments = useQuery(api.shift_assignments.getPendingAssignments) || [];
  const confirmedAssignments = useQuery(
    api.shift_assignments.getAssignmentsForDate,
    assignmentId ? { date: new Date().toISOString().split('T')[0] } : "skip"
  ) || [];

  // Find the assignment in either pending or confirmed assignments
  const assignment = [...allAssignments, ...confirmedAssignments].find(a => a._id === assignmentId);

  // Fetch shift details
  const shift = useQuery(
    api.shifts.getShiftTemplate,
    assignment?.shiftTemplateId ? { shiftId: assignment.shiftTemplateId } : "skip"
  );

  // Use the edit assignment mutation and delete mutation
  const editAssignment = useMutation(api.shift_assignments.editAssignment);
  const requestDeleteAssignment = useMutation(api.shift_assignments.requestDeleteAssignment);

  // Initialize form with existing assignment data when modal opens
  useEffect(() => {
    if (assignment && isOpen) {
      // Pre-populate with existing hours for editing
      setSelectedHours(assignment.assignedHours || []);
      setRequestNotes(assignment.assignmentNotes || "");
    }
  }, [assignment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Check if all time slots have been removed
      if (selectedHours.length === 0 && assignment.assignedHours?.length > 0) {
        // User intentionally removed all hours - request deletion (requires approval)
        await requestDeleteAssignment({
          assignmentId: assignmentId!,
          deleteNotes: requestNotes || "All time slots removed"
        });
      } else {
        // Default to existing hours if no changes made
        const hoursToRequest = selectedHours.length > 0 ? selectedHours : assignment.assignedHours;

        // Create a new assignment with edited details - approval workflow based on permissions
        await editAssignment({
          originalAssignmentId: assignmentId!,
          requestedHours: hoursToRequest.length > 0 ? hoursToRequest : undefined,
          requestNotes: requestNotes || undefined,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit edit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTimeSlot = () => {
    setSelectedHours([...selectedHours, { startTime: "09:00", endTime: "17:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setSelectedHours(selectedHours.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...selectedHours];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedHours(updated);
  };

  // Check for overlapping time slots
  const checkForOverlaps = (slots: { startTime: string; endTime: string }[]) => {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];

        // Check if slots overlap: (start1 < end2) && (start2 < end1)
        if (slot1.startTime < slot2.endTime && slot2.startTime < slot1.endTime) {
          return {
            hasOverlap: true,
            slot1Index: i,
            slot2Index: j,
            message: `Time slots ${i + 1} (${slot1.startTime}-${slot1.endTime}) and ${j + 1} (${slot2.startTime}-${slot2.endTime}) overlap`
          };
        }
      }
    }
    return { hasOverlap: false };
  };

  // Validate time slots before submission
  const overlapCheck = selectedHours.length > 0 ? checkForOverlaps(selectedHours) : { hasOverlap: false };

  if (!isOpen || !assignment || !shift) return null;

  // Check if user can edit this assignment
  const canEdit = user && (
    // Worker can edit their own assignment
    assignment.workerId === user._id ||
    // Manager can edit any assignment
    hasManagerTag
  );

  if (!canEdit) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Cannot Edit Assignment</h3>
          <div className="alert alert-info">
            <AlertCircle className="w-4 h-4" />
            <span>You can only edit your own assignments or you need manager permissions.</span>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-base-300 flex-shrink-0">
          <div>
            <h3 className="font-bold text-xl">Edit Assignment</h3>
            <p className="text-base-content/70 mt-1">{shift.name}</p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Assignment Details & Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Current Assignment Information with Integrated Requirements */}
            <div className="bg-base-100 rounded-lg border border-base-300 p-4 mb-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Current Assignment & Coverage
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Date:</span>
                  <span>{new Date(assignment.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Shift Hours:</span>
                  <span>{shift.storeHours.openTime} - {shift.storeHours.closeTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Status:</span>
                  <span className={`badge badge-sm ${
                    assignment.status === 'confirmed' ? 'badge-success' :
                    assignment.status.includes('pending') ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {assignment.status}
                  </span>
                </div>

                {/* Coverage Timeline with Requirements */}
                <div className="pt-2 border-t border-base-300">
                  <div className="font-medium text-base-content/90 mb-2">Time Coverage:</div>
                  <div className="space-y-1.5">
                    {(() => {
                      // Create a combined timeline showing assigned hours and gaps
                      const timeline: Array<{
                        startTime: string;
                        endTime: string;
                        isAssigned: boolean;
                        requirement?: any;
                      }> = [];

                      // Process each requirement range
                      shift.hourlyRequirements.forEach(req => {
                        const reqStart = req.startTime;
                        const reqEnd = req.endTime;

                        // Check if this requirement range is covered by assignment
                        const coveringAssignments = assignment.assignedHours?.filter(hour => {
                          // Check if assignment overlaps with requirement
                          return hour.startTime < reqEnd && hour.endTime > reqStart;
                        }) || [];

                        if (coveringAssignments.length > 0) {
                          // Show covered portions
                          coveringAssignments.forEach(hour => {
                            timeline.push({
                              startTime: hour.startTime,
                              endTime: hour.endTime,
                              isAssigned: true,
                              requirement: req
                            });
                          });
                        } else {
                          // Show gap
                          timeline.push({
                            startTime: reqStart,
                            endTime: reqEnd,
                            isAssigned: false,
                            requirement: req
                          });
                        }
                      });

                      // Sort by start time
                      timeline.sort((a, b) => a.startTime.localeCompare(b.startTime));

                      // Remove duplicates (when assignment covers multiple requirements)
                      const uniqueTimeline: typeof timeline = [];
                      const seen = new Set<string>();
                      timeline.forEach(item => {
                        const key = `${item.startTime}-${item.endTime}-${item.isAssigned}`;
                        if (!seen.has(key)) {
                          seen.add(key);
                          uniqueTimeline.push(item);
                        }
                      });

                      return uniqueTimeline.map((slot, index) => {
                        const req = slot.requirement;
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              slot.isAssigned
                                ? 'bg-success/10 border border-success/30'
                                : 'bg-warning/10 border border-warning/30'
                            }`}
                          >
                            <span className="text-lg">
                              {slot.isAssigned ? '✓' : '✗'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium">
                                {slot.startTime} - {slot.endTime}
                                {!slot.isAssigned && <span className="ml-1 text-warning">(Gap)</span>}
                              </div>
                              <div className="text-base-content/60">
                                {req.minWorkers}-{req.optimalWorkers} workers needed
                                {req.notes && ` · ${req.notes}`}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* New Time Preferences */}
              <div className="bg-base-100 rounded-lg border border-base-300 p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    New Hours
                  </h4>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={addTimeSlot}
                  >
                    <Plus className="w-3 h-3" />
                    Add Time Slot
                  </button>
                </div>

                {selectedHours.length === 0 ? (
                  <div className="text-sm text-base-content/60 p-3 bg-base-200 rounded border">
                    No changes to hours. Current assignment hours will be kept.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {selectedHours.map((slot, index) => {
                        const isInvolved = overlapCheck.hasOverlap &&
                          (overlapCheck.slot1Index === index || overlapCheck.slot2Index === index);

                        return (
                          <div key={index} className={`flex items-center gap-2 ${isInvolved ? 'p-2 bg-error/10 rounded border border-error/30' : ''}`}>
                            <span className="text-xs font-medium text-base-content/60 w-4">#{index + 1}</span>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                              className={`input input-bordered input-sm ${isInvolved ? 'input-error' : ''}`}
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                              className={`input input-bordered input-sm ${isInvolved ? 'input-error' : ''}`}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost btn-circle"
                              onClick={() => removeTimeSlot(index)}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Overlap Warning */}
                    {overlapCheck.hasOverlap && (
                      <div className="alert alert-error mt-3">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{overlapCheck.message}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Request Notes */}
              <div className="bg-base-100 rounded-lg border border-base-300 p-4 mb-6">
                <h4 className="font-semibold mb-3">Edit Notes (Optional)</h4>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Explain what changes you're requesting and why..."
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Warning when all time slots removed */}
              {selectedHours.length === 0 && assignment?.assignedHours && assignment.assignedHours.length > 0 && (
                <div className="alert alert-warning mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Deletion Request</div>
                    <div className="text-sm">
                      {hasManagerTag && assignment.workerId === user?._id
                        ? "Removing all time slots will delete this assignment immediately."
                        : hasManagerTag
                        ? "Removing all time slots will request deletion. Worker approval required."
                        : "Removing all time slots will request deletion. Manager approval required."}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Section */}
              <div className="bg-base-100 border border-base-300 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2">Edit Summary</h4>
                <ul className="text-sm text-base-content/70 space-y-1">
                  {hasManagerTag ? (
                    <>
                      <li>• As a manager, your edit will create a new confirmed assignment</li>
                      <li>• The original assignment will be replaced immediately</li>
                      <li>• Changes will be effective right away</li>
                    </>
                  ) : assignment.workerId === user?._id ? (
                    <>
                      <li>• Your edit request will need manager approval</li>
                      <li>• Original assignment stays active until approved</li>
                      <li>• You'll be notified once a decision is made</li>
                    </>
                  ) : (
                    <>
                      <li>• Edit request will be sent to the worker and managers</li>
                      <li>• Requires approval from both worker and management</li>
                      <li>• Original assignment remains until approved</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={isSubmitting || overlapCheck.hasOverlap}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {hasManagerTag ? 'Applying Changes...' : 'Submitting Edit...'}
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      {hasManagerTag ? 'Apply Changes' : 'Submit Edit Request'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Current Assignment Timeline */}
          <div className="w-80 bg-base-50 border-l border-base-300 p-6 overflow-y-auto">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Assignment Timeline
            </h4>

            {/* Vertical Timeline Container */}
            <div className="relative bg-base-100 rounded-lg border border-base-300 p-3">
              {(() => {
                const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                const shiftHours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

                return shiftHours.map((hour, index) => {
                  const hourTime = `${hour.toString().padStart(2, '0')}:00`;

                  // Check if this hour is covered by current assignment
                  const isAssigned = assignment.assignedHours?.some(slot => {
                    const slotStart = parseInt(slot.startTime.split(':')[0]);
                    const slotEnd = parseInt(slot.endTime.split(':')[0]);
                    return hour >= slotStart && hour < slotEnd;
                  });

                  // Check if this hour would be covered by new assignment
                  const wouldBeAssigned = selectedHours.length > 0 ? selectedHours.some(slot => {
                    const slotStart = parseInt(slot.startTime.split(':')[0]);
                    const slotEnd = parseInt(slot.endTime.split(':')[0]);
                    return hour >= slotStart && hour < slotEnd;
                  }) : isAssigned;

                  return (
                    <div key={hour} className="flex items-center gap-3 py-2">
                      {/* Time */}
                      <div className="w-12 text-xs font-mono text-base-content/60 text-right">
                        {hourTime}
                      </div>

                      {/* Current Assignment Block */}
                      <div className="flex-1 relative">
                        {isAssigned && (
                          <div className="bg-primary/20 border-l-2 border-primary rounded-r px-2 py-1">
                            <div className="text-xs font-medium text-primary">Current</div>
                          </div>
                        )}

                        {/* New Assignment Preview (if different) */}
                        {selectedHours.length > 0 && wouldBeAssigned && !isAssigned && (
                          <div className="bg-success/20 border-l-2 border-success rounded-r px-2 py-1">
                            <div className="text-xs font-medium text-success">New</div>
                          </div>
                        )}

                        {/* Removed Assignment (if current but not in new) */}
                        {selectedHours.length > 0 && isAssigned && !wouldBeAssigned && (
                          <div className="bg-error/20 border-l-2 border-error rounded-r px-2 py-1">
                            <div className="text-xs font-medium text-error">Removing</div>
                          </div>
                        )}

                        {/* No assignment */}
                        {!isAssigned && !wouldBeAssigned && (
                          <div className="bg-base-200 border-l-2 border-base-300 rounded-r px-2 py-1">
                            <div className="text-xs text-base-content/40">Unassigned</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/20 border-l-2 border-primary rounded-r"></div>
                <span>Current Assignment</span>
              </div>
              {selectedHours.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-success/20 border-l-2 border-success rounded-r"></div>
                    <span>New Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-error/20 border-l-2 border-error rounded-r"></div>
                    <span>Removing</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-base-200 border-l-2 border-base-300 rounded-r"></div>
                <span>Unassigned</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}