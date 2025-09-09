import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { X, User, Calendar, Clock, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: any;
  date: Date;
  currentUser: any;
}

export function ShiftAssignmentModal({ isOpen, onClose, shift, date, currentUser }: ShiftAssignmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const assignWorkerToShift = useMutation(api.shifts.assignWorkerToShift);
  
  const dateString = date.toISOString().split('T')[0];
  
  // Get list of workers for manager assignment
  const workers = useQuery(api.users.listUsers) || [];
  const shiftAssignments = useQuery(api.shifts.getShiftAssignments, { date: dateString }) || [];
  
  // Filter out workers who are already assigned to any shift on this date
  const assignedWorkerIds = new Set(
    shiftAssignments
      .filter(assignment => assignment.status !== "cancelled")
      .map(assignment => assignment.workerId)
  );
  
  const eligibleWorkers = workers.filter(w => 
    (w.role === "worker" || w.role === "manager") && 
    !assignedWorkerIds.has(w._id)
  );
  const isManager = currentUser?.role === "manager" || currentUser?.role === "dev";
  const canSelfAssign = currentUser?.role === "worker" || currentUser?.role === "manager";

  const form = useForm({
    defaultValues: {
      workerId: currentUser?._id || "" as Id<"users">,
      notes: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        // Extract base shift ID from composite ID if needed
        let shiftId = shift._id;
        if (typeof shiftId === 'string' && shiftId.includes('_')) {
          // Handle composite IDs like "shift_m9731pzwwcz557rscr6ssb8czh7pv8qy_2025-09-01"
          const parts = shiftId.split('_');
          if (parts.length >= 2 && parts[0] === 'shift') {
            shiftId = parts[1]; // Extract the middle part
          }
        }
        
        await assignWorkerToShift({
          shiftId: shiftId as Id<"shifts">,
          workerId: value.workerId,
          date: dateString,
          notes: value.notes || undefined,
        });
        
        setSubmitSuccess(true);
        
        // Reset form and close modal after short delay
        setTimeout(() => {
          form.reset();
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Failed to assign worker to shift:", error);
        if (error instanceof Error) {
          alert(`Failed to assign worker: ${error.message}`);
        } else {
          alert("Failed to assign worker. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {submitSuccess ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-success rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-success-content" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Assignment Successful!</h3>
            <p className="text-sm opacity-70">Worker has been assigned to the shift.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-base-300">
              <h2 className="text-xl font-bold">Assign Worker to Shift</h2>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-square"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* Shift Info */}
              <div className="bg-base-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  {shift.name}
                </h3>
                <div className="text-sm space-y-1 opacity-70">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {shift.startTime} - {shift.endTime}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {shift.currentWorkers || 0}/{shift.requiredWorkers} workers assigned
                  </div>
                  <div>Date: {date.toLocaleDateString()}</div>
                </div>
                
                {/* Capacity warning */}
                {shift.currentWorkers >= shift.requiredWorkers && (
                  <div className="flex items-center gap-2 mt-2 text-warning text-xs">
                    <AlertCircle className="w-3 h-3" />
                    This shift is at or above capacity
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void form.handleSubmit();
                }}
                className="space-y-4"
              >
                {/* Worker Selection */}
                <form.Field name="workerId">
                  {(field) => (
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Select Worker</span>
                      </label>
                      {isManager ? (
                        <select
                          className="select select-bordered w-full"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value as Id<"users">)}
                          disabled={isSubmitting}
                        >
                          <option value="">Choose a worker...</option>
                          {eligibleWorkers.map((worker) => (
                            <option key={worker._id} value={worker._id}>
                              {worker.name} ({worker.role})
                              {worker.proTag && " - Pro"}
                            </option>
                          ))}
                        </select>
                      ) : canSelfAssign ? (
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={currentUser?.name || ""}
                          disabled
                        />
                      ) : (
                        <div className="text-error text-sm">
                          You don't have permission to assign workers to shifts.
                        </div>
                      )}
                      {!field.state.meta.isValid && (
                        <div className="text-error text-xs mt-1">
                          {field.state.meta.errors.map((e: any) => e?.message).filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>

                {/* Notes */}
                <form.Field name="notes">
                  {(field) => (
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Notes (Optional)</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered w-full"
                        rows={3}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Add any notes about this assignment..."
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </form.Field>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || (!isManager && !canSelfAssign) || !form.state.values.workerId}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Assigning...
                      </>
                    ) : (
                      "Assign Worker"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}