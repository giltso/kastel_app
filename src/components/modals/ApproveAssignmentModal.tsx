import { useState } from "react";
import { CheckCircle, XCircle, Clock, Users, AlertCircle, Calendar, User } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t, currentLanguage } = useLanguage();
  const { user, hasWorkerTag, hasManagerTag } = usePermissionsV2();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
      setError(err instanceof Error ? err.message : t("shifts:assignment.failedToApproveAssignment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
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
      setError(err instanceof Error ? err.message : t("shifts:assignment.failedToRejectAssignment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return t("shifts:assignment.noTimeSpecified");
    return timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ');
  };

  const formatBreaks = (breakPeriods: any[]) => {
    if (!breakPeriods || breakPeriods.length === 0) return t("shifts:assignment.noBreaksScheduled");
    return breakPeriods.map(bp =>
      `${bp.startTime}-${bp.endTime} ${bp.isPaid ? t("shifts:assignment.paidLabel") : t("shifts:assignment.unpaidLabel")}`
    ).join(', ');
  };

  // Check if user can approve this assignment
  const canApprove = specificAssignment && user && (
    // Worker approving their own assignment
    (specificAssignment.workerId === user._id &&
     specificAssignment.status === 'pending_worker_approval' &&
     hasWorkerTag) ||
    // Manager approving worker-requested assignment
    (specificAssignment.status === 'pending_manager_approval' &&
     hasManagerTag)
  );

  if (!isOpen || !specificAssignment) return null;

  // If user can't approve this assignment
  if (!canApprove) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{t("shifts:assignment.assignmentNotAvailable")}</h3>
          <div className="alert alert-info">
            <AlertCircle className="w-4 h-4" />
            <span>
              {specificAssignment.status === 'pending_worker_approval' && specificAssignment.workerId !== user?._id
                ? t("shifts:assignment.assignmentForAnotherWorker")
                : specificAssignment.status === 'pending_manager_approval' && !hasManagerTag
                ? t("shifts:assignment.onlyManagersCanApprove")
                : specificAssignment.status === 'pending_worker_approval' && !hasWorkerTag
                ? t("shifts:assignment.needWorkerPermissions")
                : specificAssignment.status === 'confirmed'
                ? t("shifts:assignment.assignmentAlreadyApproved")
                : specificAssignment.status === 'rejected'
                ? t("shifts:assignment.assignmentAlreadyRejected")
                : t("shifts:assignment.notPendingYourApproval")
              }
            </span>
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
      <div className="modal-box max-w-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl">{t("shifts:assignment.assignmentApprovalRequired")}</h3>
            <p className="text-base-content/70 mt-1">
              {specificAssignment.status === 'pending_worker_approval'
                ? t("shifts:assignment.reviewApproveRejectSelf")
                : t("shifts:assignment.reviewApproveRejectWorker")
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

        {/* Assignment Details */}
        <div className="bg-base-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t("shifts:assignment.assignmentDetailsTitle")}
          </h4>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Shift Information */}
            <div>
              <h5 className="font-medium mb-3">{t("shifts:assignment.shiftInformation")}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">{t("shifts:assignment.shiftNameLabel")}:</span>
                  <span className="font-medium">{specificAssignment.shift?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">{t("shifts:shift.date")}:</span>
                  <span className="font-medium">{new Date(specificAssignment.date).toLocaleDateString(currentLanguage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">{t("shifts:assignment.typeLabel")}:</span>
                  <span className="font-medium capitalize">{specificAssignment.shift?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">{t("shifts:assignment.assignedByLabel")}:</span>
                  <span className="font-medium">{specificAssignment.assignedBy?.name}</span>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div>
              <h5 className="font-medium mb-3">{t("shifts:assignment.yourSchedule")}</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-base-content/70">{t("shifts:assignment.workingHours")}:</span>
                  <div className="font-medium mt-1">
                    {formatTime(specificAssignment.assignedHours)}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/70">{t("shifts:assignment.breakPeriodsColon")}:</span>
                  <div className="font-medium mt-1">
                    {formatBreaks(specificAssignment.breakPeriods || [])}
                  </div>
                </div>
                <div>
                  <span className="text-base-content/70">{t("shifts:assignment.assignmentDate")}:</span>
                  <div className="font-medium mt-1">
                    {new Date(specificAssignment.assignedAt).toLocaleString(currentLanguage)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Notes */}
          {specificAssignment.assignmentNotes && (
            <div className="mt-6 pt-4 border-t border-base-300">
              <h5 className="font-medium mb-2">{t("shifts:assignment.assignmentNotesTitle")}</h5>
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
            {t("shifts:assignment.importantInformation")}
          </h4>
          <ul className="text-sm text-base-content/70 space-y-1">
            {specificAssignment.status === 'pending_worker_approval' ? (
              <>
                <li>• {t("shifts:assignment.approveConfirmsAvailability")}</li>
                <li>• {t("shifts:assignment.becomesPartOfSchedule")}</li>
                <li>• {t("shifts:assignment.rejectNotifiesManager")}</li>
                <li>• {t("shifts:assignment.discussConcerns")}</li>
              </>
            ) : (
              <>
                <li>• {t("shifts:assignment.approveConfirmsWorkerScheduled")}</li>
                <li>• {t("shifts:assignment.workerIndicatedAvailability")}</li>
                <li>• {t("shifts:assignment.rejectNotifiesWorker")}</li>
                <li>• {t("shifts:assignment.considerStaffingNeeds")}</li>
              </>
            )}
          </ul>
        </div>


        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common:actions.cancel")}
          </button>
          <button
            className="btn btn-error"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {t("shifts:assignment.rejecting")}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                {t("shifts:assignment.rejectAssignment")}
              </>
            )}
          </button>
          <button
            className="btn btn-success"
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {t("shifts:assignment.approving")}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {t("shifts:assignment.approveAssignment")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}