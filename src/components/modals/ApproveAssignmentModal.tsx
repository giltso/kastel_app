import { useState } from "react";
import { CheckCircle, XCircle, Clock, Users, AlertCircle, Calendar, User } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface ApproveAssignmentModalProps {
  assignmentId: Id<"shift_assignments"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ApproveAssignmentModal({
  assignmentId,
  isOpen,
  onClose,
  onSuccess,
}: ApproveAssignmentModalProps) {
  const { user, hasWorkerTag } = usePermissionsV2();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Fetch assignment details
  const assignment = useQuery(
    api.shift_assignments.getAssignmentsForDate,
    assignmentId ? { date: "temp" } : "skip" // We'll need to get the specific assignment
  );

  // For now, let's create a specific query for single assignment
  const allAssignments = useQuery(api.shift_assignments.getPendingAssignments) || [];

  // Find the specific assignment
  const specificAssignment = allAssignments.find(a => a._id === assignmentId);

  // Mutations
  const approveAssignment = useMutation(api.shift_assignments.approveAssignment);
  const rejectAssignment = useMutation(api.shift_assignments.rejectAssignment);

  const handleApprove = async () => {
    if (!assignmentId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await approveAssignment({ assignmentId });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await rejectAssignment({
        assignmentId,
        reason: rejectionReason || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return "No time specified";
    return timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ');
  };

  const formatBreaks = (breakPeriods: any[]) => {
    if (!breakPeriods || breakPeriods.length === 0) return "No breaks scheduled";
    return breakPeriods.map(bp =>
      `${bp.startTime}-${bp.endTime} ${bp.isPaid ? '(Paid)' : '(Unpaid)'}`
    ).join(', ');
  };

  // Check if this assignment is for the current user and pending their approval
  const canApprove = specificAssignment &&
    specificAssignment.workerId === user?._id &&
    specificAssignment.status === 'pending_worker_approval' &&
    hasWorkerTag;

  if (!isOpen || !specificAssignment) return null;

  // If user can't approve this assignment
  if (!canApprove) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Assignment Not Available</h3>
          <div className="alert alert-info">
            <AlertCircle className="w-4 h-4" />
            <span>
              {specificAssignment.workerId !== user?._id
                ? "This assignment is not for you"
                : specificAssignment.status !== 'pending_worker_approval'
                ? "This assignment is not pending your approval"
                : "You don't have permission to approve assignments"
              }
            </span>
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
      <div className="modal-box max-w-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">Assignment Approval Required</h3>
            <p className="text-base-content/70 mt-1">
              Please review and approve or reject this assignment
            </p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Assignment Details */}
        <div className="bg-base-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Assignment Details
          </h4>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Shift Information */}
            <div>
              <h5 className="font-medium mb-3">Shift Information</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Shift Name:</span>
                  <span className="font-medium">{specificAssignment.shift?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Date:</span>
                  <span className="font-medium">{new Date(specificAssignment.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Type:</span>
                  <span className="font-medium capitalize">{specificAssignment.shift?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Assigned by:</span>
                  <span className="font-medium">{specificAssignment.assignedBy?.name}</span>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div>
              <h5 className="font-medium mb-3">Your Schedule</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-base-content/70">Working Hours:</span>
                  <div className="font-medium mt-1">
                    {formatTime(specificAssignment.assignedHours)}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/70">Break Periods:</span>
                  <div className="font-medium mt-1">
                    {formatBreaks(specificAssignment.breakPeriods)}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/70">Assignment Date:</span>
                  <div className="font-medium mt-1">
                    {new Date(specificAssignment.assignedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Notes */}
          {specificAssignment.assignmentNotes && (
            <div className="mt-6 pt-4 border-t border-base-300">
              <h5 className="font-medium mb-2">Assignment Notes</h5>
              <div className="bg-base-100 rounded p-3 text-sm">
                {specificAssignment.assignmentNotes}
              </div>
            </div>
          )}
        </div>

        {/* Important Information */}
        <div className="bg-base-100 border border-base-300 rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-info" />
            Important Information
          </h4>
          <ul className="text-sm text-base-content/70 space-y-1">
            <li>• Approving this assignment confirms your availability for the specified time</li>
            <li>• Once approved, this assignment becomes part of your schedule</li>
            <li>• If you reject, the manager will be notified and may offer alternatives</li>
            <li>• You can discuss any concerns with your manager before deciding</li>
          </ul>
        </div>

        {/* Rejection Form */}
        {showRejectForm && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3 text-error">Rejection Reason</h4>
            <form onSubmit={handleReject}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Please provide a reason for rejecting this assignment (optional but helpful for your manager)..."
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  className="btn btn-error btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectForm && (
          <div className="flex justify-end gap-3">
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={() => setShowRejectForm(true)}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4" />
              Reject Assignment
            </button>
            <button
              className="btn btn-success"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve Assignment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}