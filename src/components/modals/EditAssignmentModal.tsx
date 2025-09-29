import { useState } from "react";
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

  // Use the edit assignment mutation (we'll create this)
  const editAssignment = useMutation(api.shift_assignments.editAssignment);

  // Initialize form with existing assignment data
  useState(() => {
    if (assignment && isOpen) {
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
      // Default to existing hours if no changes made
      const hoursToRequest = selectedHours.length > 0 ? selectedHours : assignment.assignedHours;

      // Create a new assignment with edited details - approval workflow based on permissions
      await editAssignment({
        originalAssignmentId: assignmentId!,
        requestedHours: hoursToRequest.length > 0 ? hoursToRequest : undefined,
        requestNotes: requestNotes || undefined,
      });

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
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">Edit Assignment</h3>
            <p className="text-base-content/70 mt-1">Request changes to your assignment</p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Current Assignment Information */}
        <div className="bg-base-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-3">Current Assignment</h4>
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
              <span>Date: {new Date(assignment.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${
                assignment.status === 'confirmed' ? 'badge-success' :
                assignment.status.includes('pending') ? 'badge-warning' : 'badge-neutral'
              }`}>
                {assignment.status}
              </span>
            </div>
          </div>

          {/* Current Hours */}
          <div className="mt-4">
            <span className="font-medium text-sm">Current Hours:</span>
            <div className="text-sm mt-1">
              {assignment.assignedHours?.map((hour, index) => (
                <span key={index} className="mr-2">
                  {hour.startTime} - {hour.endTime}
                </span>
              )) || "No hours assigned"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New Time Preferences */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="font-medium">New Hours (Optional - leave empty to keep current)</label>
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
                No changes to hours. Current assignment hours will be kept.
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
            <label className="block font-medium mb-2">Edit Notes (Optional)</label>
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
    </div>
  );
}