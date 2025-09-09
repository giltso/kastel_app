import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { X, RefreshCw, User, Clock, ArrowRightLeft } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ShiftSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any; // The user's current assignment they want to switch
  currentUser: any;
}

export function ShiftSwitchModal({ isOpen, onClose, assignment, currentUser }: ShiftSwitchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const requestShiftSwap = useMutation(api.shifts.requestShiftSwap);
  
  // Get available shifts to swap with
  const availableShifts = useQuery(
    api.shifts.getAvailableShiftsForSwap, 
    assignment ? { myAssignmentId: assignment._id } : "skip"
  ) || [];

  const form = useForm({
    defaultValues: {
      targetAssignmentId: "" as Id<"shift_assignments">,
      reason: "",
    },
    onSubmit: async ({ value }) => {
      if (!assignment || !value.targetAssignmentId) return;
      
      setIsSubmitting(true);
      try {
        await requestShiftSwap({
          myAssignmentId: assignment._id,
          targetAssignmentId: value.targetAssignmentId,
          reason: value.reason || undefined,
        });
        
        setSubmitSuccess(true);
        
        // Reset form and close modal after short delay
        setTimeout(() => {
          form.reset();
          setSubmitSuccess(false);
          onClose();
        }, 2000);
      } catch (error) {
        console.error("Failed to request shift swap:", error);
        if (error instanceof Error) {
          alert(`Failed to request switch: ${error.message}`);
        } else {
          alert("Failed to request switch. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {submitSuccess ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-success rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-8 h-8 text-success-content" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Switch Request Sent!</h3>
            <p className="text-sm opacity-70">The other worker will be notified and can approve your request.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-base-300">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Request Shift Switch
              </h2>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-square"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* Current Assignment Info */}
              <div className="bg-base-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Your Current Shift
                </h3>
                <div className="text-sm space-y-1 opacity-70">
                  <div>{assignment.shift?.name}</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {assignment.shift?.startTime} - {assignment.shift?.endTime}
                  </div>
                  <div>Date: {new Date(assignment.date).toLocaleDateString()}</div>
                </div>
              </div>

              {availableShifts.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No other workers available for switching on this date.</p>
                  <p className="text-xs mt-1">Workers need to be assigned to shifts to enable switching.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void form.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  {/* Target Shift Selection */}
                  <form.Field name="targetAssignmentId">
                    {(field) => (
                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Switch With</span>
                        </label>
                        <div className="space-y-2">
                          {availableShifts.map((targetAssignment) => (
                            <label
                              key={targetAssignment._id}
                              className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                                field.state.value === targetAssignment._id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-base-300 hover:border-base-400'
                              }`}
                            >
                              <input
                                type="radio"
                                name="targetAssignment"
                                value={targetAssignment._id}
                                checked={field.state.value === targetAssignment._id}
                                onChange={(e) => field.handleChange(e.target.value as Id<"shift_assignments">)}
                                className="sr-only"
                              />
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {targetAssignment.worker?.name || 'Unknown Worker'}
                                  </div>
                                  <div className="text-xs opacity-70">
                                    {targetAssignment.shift?.name} • {targetAssignment.shift?.startTime} - {targetAssignment.shift?.endTime}
                                  </div>
                                </div>
                                <ArrowRightLeft className={`w-4 h-4 ${
                                  field.state.value === targetAssignment._id ? 'text-primary' : 'opacity-40'
                                }`} />
                              </div>
                            </label>
                          ))}
                        </div>
                        {!field.state.meta.isValid && (
                          <div className="text-error text-xs mt-1">
                            {field.state.meta.errors.map((e: any) => e?.message).filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {/* Reason */}
                  <form.Field name="reason">
                    {(field) => (
                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Reason (Optional)</span>
                        </label>
                        <textarea
                          className="textarea textarea-bordered w-full"
                          rows={3}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Why do you want to switch shifts? (optional)"
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
                      disabled={isSubmitting || !form.state.values.targetAssignmentId}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Requesting...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4" />
                          Request Switch
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}