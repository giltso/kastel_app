import { useState } from "react";
import { Clock, Users, Calendar, Plus, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";

interface RequestJoinShiftModalProps {
  shiftId: Id<"shifts"> | null;
  selectedDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestJoinShiftModal({
  shiftId,
  selectedDate,
  isOpen,
  onClose,
  onSuccess,
}: RequestJoinShiftModalProps) {
  const { t, currentLanguage } = useLanguage();
  const { user, hasManagerTag } = usePermissionsV2();
  const [requestNotes, setRequestNotes] = useState("");
  const [selectedHours, setSelectedHours] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Check if user already has an assignment for this shift
  const existingAssignment = assignmentsForDate.find(
    assignment => assignment.shiftTemplateId === shiftId && assignment.workerId === user?._id
  );

  // Check if user has any other assignments on this date (conflict detection)
  const userAssignmentsOnDate = assignmentsForDate.filter(
    assignment => assignment.workerId === user?._id
  );

  // Use the new worker-initiated join request mutation
  const requestJoinShift = useMutation(api.shift_assignments.requestJoinShift);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Default to full shift hours if no specific hours selected
      const hoursToRequest = selectedHours.length > 0 ? selectedHours : [{
        startTime: shift.storeHours.openTime,
        endTime: shift.storeHours.closeTime
      }];

      // This will create an assignment with status "pending_manager_approval"
      await requestJoinShift({
        shiftTemplateId: shiftId!,
        date: selectedDate,
        requestedHours: hoursToRequest.length > 0 ? hoursToRequest : undefined,
        requestNotes: requestNotes || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shifts:assignment.failedToSubmitRequest"));
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
  const overlapCheck = selectedHours.length > 0 ? checkForOverlaps(selectedHours) : { hasOverlap: false };

  if (!isOpen || !shift) return null;

  // Show error if user already has assignment
  if (existingAssignment) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{t("shifts:assignment.alreadyAssigned")}</h3>
          <div className="alert alert-info">
            <AlertCircle className="w-4 h-4" />
            <span>{t("shifts:assignment.alreadyAssignedMessage", { date: new Date(selectedDate).toLocaleDateString(currentLanguage) })}</span>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={onClose}>{t("common:actions.close")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">{t("shifts:assignment.requestJoinShift")}</h3>
            <p className="text-base-content/70 mt-1">{t("shifts:assignment.submitRequestToJoin")}</p>
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
          <div className="grid md:grid-cols-2 gap-4 text-sm">
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
              <span>{t("shifts:shift.date")}: {new Date(selectedDate).toLocaleDateString(currentLanguage)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{t(`shifts:types.${shift.type}`)}</span>
            </div>
          </div>
        </div>

        {/* Conflict Warning */}
        {userAssignmentsOnDate.length > 0 && (
          <div className="alert alert-warning mb-6">
            <AlertCircle className="w-4 h-4" />
            <span>
              {t("shifts:assignment.conflictWarning", { count: userAssignmentsOnDate.length })}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Time Preferences (Optional) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="font-medium">{t("shifts:assignment.preferredHours")}</label>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={addTimeSlot}
              >
                <Plus className="w-3 h-3" />
                {t("shifts:assignment.addTimeSlot")}
              </button>
            </div>

            {selectedHours.length === 0 ? (
              <div className="text-sm text-base-content/60 p-3 bg-base-100 rounded border">
                {t("shifts:assignment.noSpecificHours", {
                  openTime: shift.storeHours.openTime,
                  closeTime: shift.storeHours.closeTime
                })}
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
            )}
          </div>

          {/* Request Notes */}
          <div className="mb-6">
            <label className="block font-medium mb-2">{t("shifts:assignment.additionalNotes")}</label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={t("shifts:assignment.additionalNotesPlaceholder")}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Section */}
          <div className="bg-base-100 border border-base-300 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2">{t("shifts:assignment.requestSummary")}</h4>
            <ul className="text-sm text-base-content/70 space-y-1">
              {hasManagerTag ? (
                <>
                  <li>• {t("shifts:assignment.managerAutoApprove1")}</li>
                  <li>• {t("shifts:assignment.managerAutoApprove2")}</li>
                  <li>• {t("shifts:assignment.managerAutoApprove3")}</li>
                </>
              ) : (
                <>
                  <li>• {t("shifts:assignment.workerApproval1")}</li>
                  <li>• {t("shifts:assignment.workerApproval2")}</li>
                  <li>• {t("shifts:assignment.workerApproval3")}</li>
                </>
              )}
            </ul>
          </div>

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
              disabled={isSubmitting || overlapCheck.hasOverlap}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {hasManagerTag ? t("shifts:assignment.autoApproving") : t("shifts:assignment.submitting")}
                </>
              ) : hasManagerTag ? (
                t("shifts:assignment.submitRequestAutoApproved")
              ) : (
                t("shifts:assignment.submitRequest")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}