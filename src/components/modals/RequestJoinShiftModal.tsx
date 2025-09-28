import { useState } from "react";
import { Clock, Users, Calendar, Plus, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

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
  const { user } = usePermissionsV2();
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
        shiftTemplateId: shiftId,
        date: selectedDate,
        requestedHours: hoursToRequest.length > 0 ? hoursToRequest : undefined,
        requestNotes: requestNotes || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
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

  if (!isOpen || !shift) return null;

  // Show error if user already has assignment
  if (existingAssignment) {
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
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">Request to Join Shift</h3>
            <p className="text-base-content/70 mt-1">Submit a request to join this shift</p>
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
              <span>Date: {new Date(selectedDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="capitalize">{shift.type} shift</span>
            </div>
          </div>
        </div>

        {/* Conflict Warning */}
        {userAssignmentsOnDate.length > 0 && (
          <div className="alert alert-warning mb-6">
            <AlertCircle className="w-4 h-4" />
            <span>
              You already have {userAssignmentsOnDate.length} assignment(s) on this date.
              Please ensure there are no scheduling conflicts.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Time Preferences (Optional) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="font-medium">Preferred Hours (Optional)</label>
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
              <div className="text-sm text-base-content/60 p-3 bg-base-100 rounded border">
                No specific hours selected. You'll be considered for the full shift: {shift.storeHours.openTime} - {shift.storeHours.closeTime}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedHours.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                      className="input input-bordered input-sm"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                      className="input input-bordered input-sm"
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-circle"
                      onClick={() => removeTimeSlot(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Notes */}
          <div className="mb-6">
            <label className="block font-medium mb-2">Additional Notes (Optional)</label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Any additional information about your request, availability, or special considerations..."
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
            <h4 className="font-medium mb-2">Request Summary</h4>
            <ul className="text-sm text-base-content/70 space-y-1">
              <li>• Your request will be sent to managers for approval</li>
              <li>• You'll be notified once a decision is made</li>
              <li>• You can view the status in your assignments dashboard</li>
            </ul>
          </div>

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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}