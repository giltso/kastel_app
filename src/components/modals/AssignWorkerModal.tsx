import { useState, useEffect } from "react";
import { Clock, Users, UserPlus, AlertCircle, Search, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";

interface AssignWorkerModalProps {
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

export function AssignWorkerModal({
  shiftId,
  selectedDate,
  isOpen,
  onClose,
  onSuccess,
}: AssignWorkerModalProps) {
  const { t, currentLanguage } = useLanguage();
  const { hasManagerTag, user } = usePermissionsV2();
  const [selectedWorkerId, setSelectedWorkerId] = useState<Id<"users"> | "">("");
  const [assignedHours, setAssignedHours] = useState<TimeSlot[]>([]);
  const [breakPeriods, setBreakPeriods] = useState<BreakPeriod[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch shift details
  const shift = useQuery(
    api.shifts.getShiftTemplate,
    shiftId ? { shiftId } : "skip"
  );

  // Fetch all users with worker permissions for assignment
  const allUsers = useQuery(api.users_v2.getAllUsersV2) || [];

  // Fetch existing assignments for this shift on this date
  const assignmentsForDate = useQuery(
    api.shift_assignments.getAssignmentsForDate,
    { date: selectedDate }
  ) || [];

  // Assignment mutation
  const assignWorker = useMutation(api.shift_assignments.assignWorkerToShift);

  // Check if manager is assigning themselves (auto-approval case)
  const isManagerSelfAssignment = hasManagerTag && user && selectedWorkerId === user._id;

  // Filter for workers only and apply search
  const availableWorkers = allUsers.filter(user => {
    // Must have worker permissions (either real or emulated)
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
  });

  // Get currently assigned workers for this shift
  const currentAssignments = assignmentsForDate.filter(
    assignment => assignment.shiftTemplateId === shiftId && assignment.status !== 'rejected'
  );

  // Initialize with default shift hours
  useEffect(() => {
    if (shift && assignedHours.length === 0) {
      setAssignedHours([{
        startTime: shift.storeHours.openTime,
        endTime: shift.storeHours.closeTime
      }]);
    }
  }, [shift, assignedHours.length]);

  const addTimeSlot = () => {
    const lastSlot = assignedHours[assignedHours.length - 1];
    setAssignedHours([...assignedHours, {
      startTime: lastSlot?.endTime || "09:00",
      endTime: "17:00"
    }]);
  };

  const removeTimeSlot = (index: number) => {
    setAssignedHours(assignedHours.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = [...assignedHours];
    updated[index] = { ...updated[index], [field]: value };
    setAssignedHours(updated);
  };

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

  // Check for overlapping time slots
  const checkForOverlaps = (slots: TimeSlot[]) => {
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
            slot1: i + 1,
            slot2: j + 1,
            time1: `${slot1.startTime}-${slot1.endTime}`,
            time2: `${slot2.startTime}-${slot2.endTime}`,
          };
        }
      }
    }
    return { hasOverlap: false };
  };

  // Validate time slots before submission
  const overlapCheck = assignedHours.length > 0 ? checkForOverlaps(assignedHours) : { hasOverlap: false };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId || !shift) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (assignedHours.length === 0) {
        throw new Error(t("shifts:assignment.atLeastOneTimeSlot"));
      }

      // Validate time slots
      for (const slot of assignedHours) {
        if (slot.startTime >= slot.endTime) {
          throw new Error(t("shifts:assignment.endTimeAfterStartTime"));
        }

        // Check if within shift bounds
        if (slot.startTime < shift.storeHours.openTime ||
            slot.endTime > shift.storeHours.closeTime) {
          throw new Error(t("shifts:assignment.assignedHoursWithinShift"));
        }
      }

      // Validate break periods
      for (const breakPeriod of breakPeriods) {
        if (breakPeriod.startTime >= breakPeriod.endTime) {
          throw new Error(t("shifts:assignment.breakEndAfterStart"));
        }
      }

      await assignWorker({
        shiftTemplateId: shiftId!,
        workerId: selectedWorkerId as Id<"users">,
        date: selectedDate,
        assignedHours: assignedHours,
        breakPeriods: breakPeriods.length > 0 ? breakPeriods : undefined,
        assignmentNotes: assignmentNotes || undefined,
      });

      onSuccess?.();
      onClose();

      // Reset form
      setSelectedWorkerId("");
      setAssignmentNotes("");
      setBreakPeriods([]);
      // Keep assignedHours for potential next assignment
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shifts:assignment.failedToAssignWorker"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !hasManagerTag || !shift) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">{t("shifts:assignment.assignWorkerToShift")}</h3>
            <p className="text-base-content/70 mt-1">
              {t("shifts:assignment.assignWorkerToShiftDesc", {
                shiftName: shift.name,
                date: new Date(selectedDate).toLocaleDateString(currentLanguage)
              })}
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
          <h4 className="font-semibold mb-3">{t("shifts:shift.shiftDetails")}</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{shift.storeHours.openTime} - {shift.storeHours.closeTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t("shifts:assignment.currentlyAssigned", { count: currentAssignments.length })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{t(`shifts:types.${shift.type}`)}</span>
            </div>
          </div>

          {/* Current Assignments Preview */}
          {currentAssignments.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">{t("shifts:assignment.currentlyAssignedLabel")}</div>
              <div className="flex flex-wrap gap-2">
                {currentAssignments.map((assignment) => (
                  <div key={assignment._id} className="badge badge-outline">
                    {assignment.worker?.name} ({assignment.status})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Worker Selection */}
          <div>
            <label className="label">
              <span className="label-text font-medium">{t("shifts:assignment.selectWorker")}</span>
            </label>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="input input-bordered w-full pl-10"
                placeholder={t("shifts:assignment.searchWorkersByName")}
              />
            </div>

            {/* Worker Selection */}
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value as Id<"users"> | "")}
              className="select select-bordered w-full"
              required
            >
              <option value="">{t("shifts:assignment.selectAWorker")}</option>
              {availableWorkers.map((worker) => (
                <option key={worker._id} value={worker._id}>
                  {worker.name} {worker.email ? `(${worker.email})` : ""}
                </option>
              ))}
            </select>

            {availableWorkers.length === 0 && (
              <div className="text-sm text-base-content/60 mt-2">
                {workerSearch
                  ? t("shifts:assignment.noWorkersFound")
                  : t("shifts:assignment.noAvailableWorkers")
                }
              </div>
            )}
          </div>

          {/* Assigned Hours */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label-text font-medium">{t("shifts:assignment.assignedHoursRequired")}</label>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={addTimeSlot}
              >
                <Plus className="w-3 h-3" />
                {t("shifts:assignment.addTimeSlot")}
              </button>
            </div>

            <>
              <div className="space-y-2">
                {assignedHours.map((slot, index) => {
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
                        required
                      />
                      <span className="text-sm">{t("common:time.to")}</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                        className={`input input-bordered input-sm ${isInvolved ? 'input-error' : ''}`}
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
                  );
                })}
              </div>

              {/* Overlap Warning */}
              {overlapCheck.hasOverlap && (
                <div className="alert alert-error mt-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {t("shifts:assignment.overlapWarning", {
                      slot1: overlapCheck.slot1,
                      time1: overlapCheck.time1,
                      slot2: overlapCheck.slot2,
                      time2: overlapCheck.time2
                    })}
                  </span>
                </div>
              )}
            </>
          </div>

          {/* Break Periods */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label-text font-medium">{t("shifts:assignment.breakPeriods")}</label>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={addBreakPeriod}
              >
                <Plus className="w-3 h-3" />
                {t("shifts:assignment.addBreak")}
              </button>
            </div>

            {breakPeriods.length === 0 ? (
              <div className="text-sm text-base-content/60 p-3 bg-base-100 rounded border">
                {t("shifts:assignment.noBreakPeriods")}
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
                    <span className="text-sm">{t("common:time.to")}</span>
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
                      <span className="text-xs">{t("shifts:assignment.paid")}</span>
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

          {/* Assignment Notes */}
          <div>
            <label className="label">
              <span className="label-text font-medium">{t("shifts:assignment.assignmentNotes")}</span>
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={t("shifts:assignment.assignmentNotesPlaceholder")}
            />
          </div>

          {/* Assignment Summary */}
          <div className="bg-base-100 border border-base-300 rounded-lg p-4">
            <h4 className="font-medium mb-2">{t("shifts:assignment.assignmentSummary")}</h4>
            <ul className="text-sm text-base-content/70 space-y-1">
              <li>• {t("shifts:assignment.workerNotification")}</li>
              <li>• {t("shifts:assignment.assignmentBecomesActive")}</li>
              <li>• {t("shifts:assignment.canModifyBeforeApproval")}</li>
              <li>• {t("shifts:assignment.breakPeriodsOptional")}</li>
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
              {t("common:actions.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !selectedWorkerId || overlapCheck.hasOverlap}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t("shifts:assignment.assigning")}
                </>
              ) : isManagerSelfAssignment ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t("shifts:assignment.assignMyself")}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t("shifts:assignment.assignWorker")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}