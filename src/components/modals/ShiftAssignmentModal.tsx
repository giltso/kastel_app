import { useState, useEffect } from "react";
import { Clock, Users, Calendar, Plus, AlertCircle, Search, UserPlus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface ShiftAssignmentModalProps {
  shiftId: Id<"shifts"> | null;
  selectedDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface BreakPeriod {
  startTime: string;
  endTime: string;
  isPaid: boolean;
}

export function ShiftAssignmentModal({
  shiftId,
  selectedDate,
  isOpen,
  onClose,
  onSuccess,
}: ShiftAssignmentModalProps) {
  const { user, hasManagerTag, hasWorkerTag } = usePermissionsV2();

  // Determine mode based on permissions
  const isManagerMode = hasManagerTag;
  const isWorkerMode = hasWorkerTag && !isManagerMode;

  // Common state
  const [assignedHours, setAssignedHours] = useState<TimeSlot[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manager-only state
  const [selectedWorkerId, setSelectedWorkerId] = useState<Id<"users"> | "">("");
  const [breakPeriods, setBreakPeriods] = useState<BreakPeriod[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");

  // Fetch shift details
  const shift = useQuery(
    api.shifts.getShiftTemplate,
    shiftId ? { shiftId } : "skip"
  );

  // Fetch existing assignments to check for conflicts
  const assignmentsForDate = useQuery(
    api.shift_assignments.getAssignmentsForDate,
    { date: selectedDate }
  ) || [];

  // Manager-only: Fetch all users for worker selection
  const allUsers = useQuery(
    isManagerMode ? api.users_v2.getAllUsersV2 : "skip"
  ) || [];

  // Worker-only: Check if user already has an assignment for this shift
  const existingAssignment = isWorkerMode ? assignmentsForDate.find(
    assignment => assignment.shiftTemplateId === shiftId && assignment.workerId === user?._id
  ) : null;

  // Worker-only: Check if user has any other assignments on this date
  const userAssignmentsOnDate = isWorkerMode ? assignmentsForDate.filter(
    assignment => assignment.workerId === user?._id
  ) : [];

  // Manager-only: Filter available workers
  const availableWorkers = isManagerMode ? allUsers.filter(user => {
    const isStaff = user.emulatingIsStaff ?? user.isStaff ?? false;
    const hasWorkerTag = user.emulatingWorkerTag ?? user.workerTag ?? false;

    if (!isStaff || !hasWorkerTag) return false;

    // Apply search filter
    if (workerSearch && !user.name.toLowerCase().includes(workerSearch.toLowerCase())) {
      return false;
    }

    // Check if already assigned to this specific shift on this date
    const alreadyAssigned = assignmentsForDate.some(
      assignment =>
        assignment.workerId === user._id &&
        assignment.shiftTemplateId === shiftId &&
        assignment.status !== 'rejected'
    );

    return !alreadyAssigned;
  }) : [];

  // Mutations
  const assignWorker = useMutation(api.shift_assignments.assignWorkerToShift);
  const requestJoinShift = useMutation(api.shift_assignments.requestJoinShift);

  // Initialize with default shift hours
  useEffect(() => {
    if (shift && assignedHours.length === 0) {
      setAssignedHours([{
        startTime: shift.storeHours.openTime,
        endTime: shift.storeHours.closeTime
      }]);
    }
  }, [shift, assignedHours.length]);

  // Time slot management
  const addTimeSlot = () => {
    const lastSlot = assignedHours[assignedHours.length - 1];
    setAssignedHours([...assignedHours, {
      startTime: lastSlot?.endTime || "09:00",
      endTime: "17:00"
    }]);
  };

  const removeTimeSlot = (index: number) => {
    if (assignedHours.length > 1) {
      setAssignedHours(assignedHours.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...assignedHours];
    updated[index] = { ...updated[index], [field]: value };
    setAssignedHours(updated);
  };

  // Break period management (manager only)
  const addBreakPeriod = () => {
    setBreakPeriods([...breakPeriods, {
      startTime: "12:00",
      endTime: "13:00",
      isPaid: false
    }]);
  };

  const removeBreakPeriod = (index: number) => {
    setBreakPeriods(breakPeriods.filter((_, i) => i !== index));
  };

  const updateBreakPeriod = (index: number, field: keyof BreakPeriod, value: string | boolean) => {
    const updated = [...breakPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setBreakPeriods(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift || (!selectedWorkerId && isManagerMode)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (assignedHours.length === 0) {
        throw new Error("At least one time slot must be assigned");
      }

      // Validate time slots
      for (const slot of assignedHours) {
        if (slot.startTime >= slot.endTime) {
          throw new Error("End time must be after start time for all slots");
        }

        // Check if within shift bounds
        if (slot.startTime < shift.storeHours.openTime ||
            slot.endTime > shift.storeHours.closeTime) {
          throw new Error("Hours must be within shift operating hours");
        }
      }

      // Manager mode: assign worker
      if (isManagerMode) {
        // Validate break periods
        for (const breakPeriod of breakPeriods) {
          if (breakPeriod.startTime >= breakPeriod.endTime) {
            throw new Error("Break end time must be after start time");
          }
        }

        await assignWorker({
          shiftTemplateId: shiftId,
          workerId: selectedWorkerId as Id<"users">,
          date: selectedDate,
          assignedHours: assignedHours,
          breakPeriods: breakPeriods.length > 0 ? breakPeriods : undefined,
          assignmentNotes: assignmentNotes || undefined,
        });
      } else {
        // Worker mode: request to join
        await requestJoinShift({
          shiftTemplateId: shiftId,
          date: selectedDate,
          requestedHours: assignedHours.length > 0 ? assignedHours : undefined,
          requestNotes: assignmentNotes || undefined,
        });
      }

      onSuccess?.();
      onClose();

      // Reset form
      setSelectedWorkerId("");
      setAssignmentNotes("");
      setBreakPeriods([]);
      // Keep assignedHours for potential next assignment
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isManagerMode ? 'assign worker' : 'submit request'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !shift) return null;

  // Worker mode: show error if already assigned
  if (isWorkerMode && existingAssignment) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Already Assigned</h3>
          <div className="alert alert-info">
            <AlertCircle className="w-4 h-4" />
            <span>You already have an assignment for this shift on {new Date(selectedDate).toLocaleDateString()}.</span>
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
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">
              {isManagerMode ? 'Assign Worker to Shift' : 'Request to Join Shift'}
            </h3>
            <p className="text-base-content/70 mt-1">
              {isManagerMode
                ? `Assign a worker to ${shift.name} on ${new Date(selectedDate).toLocaleDateString()}`
                : 'Submit a request to join this shift'
              }
            </p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Shift Information */}
        <div className="bg-base-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-3">Shift Details</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{shift.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{shift.storeHours.openTime} - {shift.storeHours.closeTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Date: {new Date(selectedDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Worker Mode: Conflict Warning */}
        {isWorkerMode && userAssignmentsOnDate.length > 0 && (
          <div className="alert alert-warning mb-6">
            <AlertCircle className="w-4 h-4" />
            <span>
              You already have {userAssignmentsOnDate.length} assignment(s) on this date.
              Please ensure there are no scheduling conflicts.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Manager Mode: Worker Selection */}
          {isManagerMode && (
            <div>
              <label className="label">
                <span className="label-text font-medium">Select Worker *</span>
              </label>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <input
                  type="text"
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  className="input input-bordered w-full pl-10"
                  placeholder="Search workers by name..."
                />
              </div>

              {/* Worker Selection */}
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value as Id<"users"> | "")}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select a worker...</option>
                {availableWorkers.map((worker) => (
                  <option key={worker._id} value={worker._id}>
                    {worker.name} {worker.email ? `(${worker.email})` : ""}
                  </option>
                ))}
              </select>

              {availableWorkers.length === 0 && (
                <div className="text-sm text-base-content/60 mt-2">
                  {workerSearch
                    ? "No workers found matching your search"
                    : "No available workers (all may be already assigned to this shift)"
                  }
                </div>
              )}
            </div>
          )}

          {/* Hours Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label-text font-medium">
                {isManagerMode ? 'Assigned Hours *' : 'Preferred Hours (Optional)'}
              </label>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={addTimeSlot}
              >
                <Plus className="w-3 h-3" />
                Add Time Slot
              </button>
            </div>

            {assignedHours.length === 0 ? (
              <div className="text-sm text-base-content/60 p-3 bg-base-100 rounded border">
                {isManagerMode
                  ? "No hours assigned. Add time slots above."
                  : `No specific hours selected. You'll be considered for the full shift: ${shift.storeHours.openTime} - ${shift.storeHours.closeTime}`
                }
              </div>
            ) : (
              <div className="space-y-2">
                {assignedHours.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                      className="input input-bordered input-sm"
                      required
                    />
                    <span className="text-sm">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                      className="input input-bordered input-sm"
                      required
                    />
                    {assignedHours.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => removeTimeSlot(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manager Mode: Break Periods */}
          {isManagerMode && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="label-text font-medium">Break Periods (Optional)</label>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={addBreakPeriod}
                >
                  <Plus className="w-3 h-3" />
                  Add Break
                </button>
              </div>

              {breakPeriods.length === 0 ? (
                <div className="text-sm text-base-content/60 p-3 bg-base-100 rounded border">
                  No break periods defined. Click "Add Break" to schedule breaks.
                </div>
              ) : (
                <div className="space-y-2">
                  {breakPeriods.map((breakPeriod, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={breakPeriod.startTime}
                        onChange={(e) => updateBreakPeriod(index, 'startTime', e.target.value)}
                        className="input input-bordered input-sm"
                      />
                      <span className="text-sm">to</span>
                      <input
                        type="time"
                        value={breakPeriod.endTime}
                        onChange={(e) => updateBreakPeriod(index, 'endTime', e.target.value)}
                        className="input input-bordered input-sm"
                      />
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={breakPeriod.isPaid}
                          onChange={(e) => updateBreakPeriod(index, 'isPaid', e.target.checked)}
                          className="checkbox checkbox-xs"
                        />
                        <span className="text-xs">Paid</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => removeBreakPeriod(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">
              <span className="label-text font-medium">
                {isManagerMode ? 'Assignment Notes (Optional)' : 'Additional Notes (Optional)'}
              </span>
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={
                isManagerMode
                  ? "Any specific instructions, requirements, or notes for this assignment..."
                  : "Any additional information about your request, availability, or special considerations..."
              }
            />
          </div>

          {/* Summary */}
          <div className="bg-base-100 border border-base-300 rounded-lg p-4">
            <h4 className="font-medium mb-2">
              {isManagerMode ? 'Assignment Summary' : 'Request Summary'}
            </h4>
            <ul className="text-sm text-base-content/70 space-y-1">
              {isManagerMode ? (
                <>
                  <li>• Worker will receive a notification to approve this assignment</li>
                  <li>• Assignment becomes active once worker approves</li>
                  <li>• You can modify assignments before worker approval</li>
                  <li>• Break periods are optional and can be adjusted as needed</li>
                </>
              ) : hasManagerTag ? (
                <>
                  <li>• As a manager, your request will be automatically approved</li>
                  <li>• Your assignment will be confirmed immediately</li>
                  <li>• You can view your confirmed assignment in the assignments dashboard</li>
                </>
              ) : (
                <>
                  <li>• Your request will be sent to managers for approval</li>
                  <li>• You'll be notified once a decision is made</li>
                  <li>• You can view the status in your assignments dashboard</li>
                </>
              )}
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || (isManagerMode && !selectedWorkerId)}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isManagerMode ? 'Assigning...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {isManagerMode ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isManagerMode ? 'Assign Worker' : 'Submit Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}