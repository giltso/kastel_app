import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { X, User, Calendar, Clock, AlertCircle, Users, Settings } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: any;
  date: Date;
  currentUser: any;
}

type TabType = 'overview' | 'assignments' | 'edit';

export function ShiftDetailsModal({ isOpen, onClose, shift, date, currentUser }: ShiftDetailsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const assignWorkerToShift = useMutation(api.shifts.assignWorkerToShift);
  const createShiftReplacement = useMutation(api.events.createShiftReplacement);
  
  const dateString = date.toISOString().split('T')[0];
  const isManager = currentUser?.role === "manager" || currentUser?.role === "dev";
  const canEdit = isManager;
  
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

  // Assignment form
  const assignmentForm = useForm({
    defaultValues: {
      workerId: "" as Id<"users">,
      notes: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        await assignWorkerToShift({
          shiftId: shift._id,
          workerId: value.workerId,
          date: dateString,
          notes: value.notes || undefined,
        });
        
        setSubmitSuccess(true);
        setTimeout(() => {
          assignmentForm.reset();
          setSubmitSuccess(false);
          setActiveTab('overview');
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

  // Edit form
  const editForm = useForm({
    defaultValues: {
      title: shift?.title || "",
      description: shift?.description || "",
      startTime: shift?.startTime || "09:00",
      endTime: shift?.endTime || "17:00",
      requiredWorkers: shift?.requiredWorkers || 1,
      maxWorkers: shift?.maxWorkers || 10,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        // Create a shift replacement (exception) for this date
        await createShiftReplacement({
          parentShiftId: shift._id,
          date: dateString,
          title: value.title,
          description: value.description,
          startTime: value.startTime,
          endTime: value.endTime,
          requiredWorkers: value.requiredWorkers,
          maxWorkers: value.maxWorkers,
        });
        
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Failed to edit shift:", error);
        if (error instanceof Error) {
          alert(`Failed to edit shift: ${error.message}`);
        } else {
          alert("Failed to edit shift. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  if (!isOpen || !shift) return null;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Calendar },
    { id: 'assignments' as TabType, label: 'Assignments', icon: Users },
    ...(canEdit ? [{ id: 'edit' as TabType, label: 'Edit Shift', icon: Settings }] : []),
  ];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl max-h-[90vh]">
        {submitSuccess ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-success rounded-full flex items-center justify-center">
              {activeTab === 'assignments' ? (
                <User className="w-8 h-8 text-success-content" />
              ) : (
                <Settings className="w-8 h-8 text-success-content" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'assignments' ? 'Worker Assigned!' : 'Shift Modified!'}
            </h3>
            <p className="text-sm opacity-70">
              {activeTab === 'assignments' 
                ? 'Worker has been assigned to the shift.' 
                : 'Shift exception has been created for this date.'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Shift Details</h2>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-square"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-bordered w-full mb-6">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  className={`tab tab-bordered ${activeTab === tab.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </a>
              ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content min-h-[200px]">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Shift Info */}
                  <div className="bg-base-200 rounded-lg p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4" />
                      {shift?.title || shift?.name || 'Shift'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{shift?.startTime || 'N/A'} - {shift?.endTime || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{shift?.currentWorkers || 0}/{shift?.requiredWorkers || 0} workers</span>
                      </div>
                      <div className="col-span-2">
                        <span className="opacity-70">Date: {date.toLocaleDateString()}</span>
                      </div>
                      {shift.description && (
                        <div className="col-span-2">
                          <span className="opacity-70">{shift.description}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`badge ${
                        shift.status === 'bad' ? 'badge-error' :
                        shift.status === 'close' ? 'badge-warning' :
                        shift.status === 'good' ? 'badge-success' :
                        shift.status === 'warning' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {shift.status === 'bad' ? 'Understaffed' :
                         shift.status === 'close' ? 'Almost Full' :
                         shift.status === 'good' ? 'Fully Staffed' :
                         shift.status === 'warning' ? 'Overstaffed' :
                         'Available'}
                      </span>
                      {shift.currentWorkers >= shift.requiredWorkers && (
                        <div className="flex items-center gap-1 text-warning text-xs">
                          <AlertCircle className="w-3 h-3" />
                          {shift.isOverpopulated ? 'Overstaffed' : 'At capacity'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Assignments */}
                  {shift.assignments && shift.assignments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Current Assignments</h4>
                      <div className="space-y-2">
                        {shift.assignments.map((assignment: any) => (
                          <div key={assignment.workerId} className="flex items-center gap-3 p-2 bg-base-100 rounded border">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-medium text-sm">
                              {(assignment.worker?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{assignment.worker?.name || 'Unknown Worker'}</div>
                              {assignment.notes && (
                                <div className="text-xs opacity-70">{assignment.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nested Activities */}
                  {shift.nestedEvents && shift.nestedEvents.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Scheduled Activities ({shift.nestedEvents.length})</h4>
                      <div className="space-y-2">
                        {shift.nestedEvents.map((nestedEvent: any) => (
                          <div key={nestedEvent._id} className="p-2 bg-base-100 rounded border text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{nestedEvent.title}</span>
                              <span className="text-xs opacity-70">
                                {nestedEvent.startTime}-{nestedEvent.endTime}
                              </span>
                            </div>
                            {nestedEvent.description && (
                              <div className="text-xs opacity-70 mt-1">{nestedEvent.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  {isManager && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void assignmentForm.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  {/* Worker Selection */}
                  <assignmentForm.Field name="workerId">
                    {(field) => (
                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Select Worker</span>
                        </label>
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
                        {!field.state.meta.isValid && (
                          <div className="text-error text-xs mt-1">
                            {field.state.meta.errors.map(e => String(e)).join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </assignmentForm.Field>

                  {/* Notes */}
                  <assignmentForm.Field name="notes">
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
                  </assignmentForm.Field>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="btn btn-ghost"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || !assignmentForm.state.values.workerId}
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
                  )}
                  {!isManager && (
                    <div className="alert alert-warning">
                      <div>
                        <h4 className="font-medium">Manager Access Required</h4>
                        <p className="text-sm">Only managers can assign workers to shifts</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Tab */}
              {activeTab === 'edit' && canEdit && (
                <div className="space-y-4">
                  <div className="alert alert-warning">
                    <AlertCircle className="w-4 h-4" />
                    <div>
                      <h4 className="font-semibold">Creating Shift Exception</h4>
                      <p className="text-sm">
                        Editing this shift will create a non-recurring exception for {date.toLocaleDateString()}.
                        The original recurring shift pattern will remain unchanged for other dates.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void editForm.handleSubmit();
                    }}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <editForm.Field name="title">
                      {(field) => (
                        <div>
                          <label className="label">
                            <span className="label-text font-medium">Shift Title</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </editForm.Field>

                    {/* Description */}
                    <editForm.Field name="description">
                      {(field) => (
                        <div>
                          <label className="label">
                            <span className="label-text font-medium">Description (Optional)</span>
                          </label>
                          <textarea
                            className="textarea textarea-bordered w-full"
                            rows={2}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </editForm.Field>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <editForm.Field name="startTime">
                        {(field) => (
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Start Time</span>
                            </label>
                            <input
                              type="time"
                              className="input input-bordered w-full"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </editForm.Field>

                      <editForm.Field name="endTime">
                        {(field) => (
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">End Time</span>
                            </label>
                            <input
                              type="time"
                              className="input input-bordered w-full"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </editForm.Field>
                    </div>

                    {/* Worker Requirements */}
                    <div className="grid grid-cols-2 gap-4">
                      <editForm.Field name="requiredWorkers">
                        {(field) => (
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Required Workers</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="input input-bordered w-full"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </editForm.Field>

                      <editForm.Field name="maxWorkers">
                        {(field) => (
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Max Workers</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="input input-bordered w-full"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </editForm.Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="btn btn-ghost"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-warning"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Creating Exception...
                          </>
                        ) : (
                          "Create Shift Exception"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} disabled={isSubmitting}>close</button>
      </form>
    </div>
  );
}