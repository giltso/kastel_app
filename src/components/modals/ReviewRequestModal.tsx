import { useState } from "react";
import { CheckCircle, XCircle, Clock, Users, AlertCircle, Eye, Filter } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface ReviewRequestModalProps {
  shiftId?: Id<"shifts"> | null; // If provided, filter to specific shift
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type RequestStatus = "all" | "pending_manager_approval" | "pending_worker_approval";

export function ReviewRequestModal({
  shiftId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewRequestModalProps) {
  const { hasManagerTag } = usePermissionsV2();
  const [selectedRequests, setSelectedRequests] = useState<Set<Id<"shift_assignments">>>(new Set());
  const [statusFilter, setStatusFilter] = useState<RequestStatus>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<Id<"shift_assignments"> | null>(null);

  // Fetch pending assignments
  const allPendingAssignments = useQuery(api.shift_assignments.getPendingAssignments) || [];

  // Mutations
  const approveAssignment = useMutation(api.shift_assignments.approveAssignment);
  const rejectAssignment = useMutation(api.shift_assignments.rejectAssignment);

  // Filter assignments based on shift and status
  const filteredAssignments = allPendingAssignments.filter(assignment => {
    // Filter by shift if specified
    if (shiftId && assignment.shiftTemplateId !== shiftId) {
      return false;
    }

    // Filter by status
    if (statusFilter !== "all" && assignment.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Group assignments by status
  const groupedRequests = {
    pending_manager_approval: filteredAssignments.filter(a => a.status === 'pending_manager_approval'),
    pending_worker_approval: filteredAssignments.filter(a => a.status === 'pending_worker_approval'),
  };

  const handleSelectAll = () => {
    if (selectedRequests.size === filteredAssignments.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filteredAssignments.map(a => a._id)));
    }
  };

  const handleSelectRequest = (requestId: Id<"shift_assignments">) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRequests.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const promises = Array.from(selectedRequests).map(requestId => {
        return action === 'approve'
          ? approveAssignment({ assignmentId: requestId })
          : rejectAssignment({ assignmentId: requestId, reason: "Bulk rejection by manager" });
      });

      await Promise.all(promises);

      setSelectedRequests(new Set());
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} requests`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleAction = async (requestId: Id<"shift_assignments">, action: 'approve' | 'reject', reason?: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (action === 'approve') {
        await approveAssignment({ assignmentId: requestId });
      } else {
        await rejectAssignment({ assignmentId: requestId, reason });
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_manager_approval':
        return <div className="badge badge-warning">Manager Approval Needed</div>;
      case 'pending_worker_approval':
        return <div className="badge badge-info">Worker Approval Needed</div>;
      default:
        return <div className="badge badge-ghost">{status}</div>;
    }
  };

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return "No time specified";
    return timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ');
  };

  if (!isOpen || !hasManagerTag) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-2xl">Review Assignment Requests</h3>
            <p className="text-base-content/70 mt-1">
              {shiftId ? "Shift-specific requests" : "All pending assignment requests"}
            </p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Summary Statistics */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Manager Approval</div>
            <div className="stat-value text-warning">{groupedRequests.pending_manager_approval.length}</div>
            <div className="stat-desc">Worker requests</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Worker Approval</div>
            <div className="stat-value text-info">{groupedRequests.pending_worker_approval.length}</div>
            <div className="stat-desc">Manager assignments</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Total Pending</div>
            <div className="stat-value">{filteredAssignments.length}</div>
            <div className="stat-desc">All requests</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus)}
                className="select select-bordered select-sm"
              >
                <option value="all">All Requests</option>
                <option value="pending_manager_approval">Need Manager Approval</option>
                <option value="pending_worker_approval">Need Worker Approval</option>
              </select>
            </div>

            {filteredAssignments.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRequests.size === filteredAssignments.length && filteredAssignments.length > 0}
                  onChange={handleSelectAll}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">Select All ({filteredAssignments.length})</span>
              </label>
            )}
          </div>

          {selectedRequests.size > 0 && (
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleBulkAction('approve')}
                disabled={isSubmitting}
              >
                <CheckCircle className="w-4 h-4" />
                Approve Selected ({selectedRequests.size})
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleBulkAction('reject')}
                disabled={isSubmitting}
              >
                <XCircle className="w-4 h-4" />
                Reject Selected ({selectedRequests.size})
              </button>
            </div>
          )}
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-medium mb-2">No Pending Requests</h4>
              <p>
                {statusFilter === "all"
                  ? "All assignment requests have been processed"
                  : `No requests with status: ${statusFilter.replace(/_/g, ' ')}`
                }
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div
                key={assignment._id}
                className={`border rounded-lg p-4 ${
                  selectedRequests.has(assignment._id) ? 'border-primary bg-primary/5' : 'border-base-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRequests.has(assignment._id)}
                      onChange={() => handleSelectRequest(assignment._id)}
                      className="checkbox mt-1"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{assignment.worker?.name}</h4>
                        {getStatusBadge(assignment.status)}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{assignment.shift?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(assignment.date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-base-content/70">
                            <div>Hours: {formatTime(assignment.assignedHours)}</div>
                            <div>Assigned by: {assignment.assignedBy?.name}</div>
                            <div>Request time: {new Date(assignment.assignedAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedRequest === assignment._id && (
                        <div className="mt-4 pt-4 border-t border-base-300">
                          {assignment.assignmentNotes && (
                            <div className="mb-3">
                              <div className="font-medium text-sm mb-1">Notes:</div>
                              <div className="text-sm text-base-content/70 bg-base-100 p-2 rounded">
                                {assignment.assignmentNotes}
                              </div>
                            </div>
                          )}

                          {assignment.breakPeriods && assignment.breakPeriods.length > 0 && (
                            <div>
                              <div className="font-medium text-sm mb-1">Break Periods:</div>
                              <div className="text-sm">
                                {assignment.breakPeriods.map((breakPeriod, index) => (
                                  <div key={index} className="text-base-content/70">
                                    {breakPeriod.startTime} - {breakPeriod.endTime}
                                    {breakPeriod.isPaid ? " (Paid)" : " (Unpaid)"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-ghost btn-circle"
                      onClick={() => setExpandedRequest(
                        expandedRequest === assignment._id ? null : assignment._id
                      )}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {assignment.status === 'pending_manager_approval' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSingleAction(assignment._id, 'approve')}
                          disabled={isSubmitting}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleSingleAction(assignment._id, 'reject', "Rejected by manager")}
                          disabled={isSubmitting}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}

                    {assignment.status === 'pending_worker_approval' && (
                      <div className="text-sm text-base-content/60">
                        Waiting for worker approval
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mt-6">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-action">
          <button
            className="btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}