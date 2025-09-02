import { useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { X, Clock, Users, Calendar, CheckCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateShiftModal({ isOpen, onClose }: CreateShiftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const createShift = useMutation(api.shifts.createShift);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      startTime: "09:00",
      endTime: "17:00",
      recurringDays: [] as string[],
      requiredWorkers: 2,
      maxWorkers: 4,
      color: "#3B82F6", // Blue default
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        await createShift({
          ...value,
          recurringDays: value.recurringDays as any,
          maxWorkers: value.maxWorkers || undefined,
        });
        
        setSubmitSuccess(true);
        
        // Reset form and close modal after short delay
        setTimeout(() => {
          form.reset();
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Failed to create shift:", error);
        if (error instanceof Error) {
          alert(`Failed to create shift: ${error.message}`);
        } else {
          alert("Failed to create shift. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setSubmitSuccess(false);
      onClose();
    }
  };

  const daysOfWeek = [
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" }, 
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
  ];

  const colorOptions = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Yellow" },
    { value: "#EF4444", label: "Red" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#06B6D4", label: "Cyan" },
  ];

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Shift
          </h3>
          <button 
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="alert alert-success mb-4">
            <CheckCircle className="w-4 h-4" />
            <span>Shift created successfully!</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Shift Name */}
          <form.Field
            name="name"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Shift Name</span>
                </label>
                <input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`input input-bordered w-full ${!field.state.meta.isValid && field.state.meta.isTouched ? 'input-error' : ''}`}
                  placeholder="e.g., Morning Shift, Evening Shift..."
                />
              </div>
            )}
          />

          {/* Description */}
          <form.Field
            name="description"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="Additional details about this shift..."
                  rows={2}
                />
              </div>
            )}
          />

          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="startTime"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Start Time
                    </span>
                  </label>
                  <input
                    type="time"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              )}
            />

            <form.Field
              name="endTime"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      End Time
                    </span>
                  </label>
                  <input
                    type="time"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              )}
            />
          </div>

          {/* Recurring Days */}
          <form.Field
            name="recurringDays"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Days of the Week
                  </span>
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => (
                    <label key={day.value} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.state.value.includes(day.value)}
                        onChange={(e) => {
                          const current = field.state.value;
                          if (e.target.checked) {
                            field.handleChange([...current, day.value]);
                          } else {
                            field.handleChange(current.filter(d => d !== day.value));
                          }
                        }}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="label-text text-xs ml-1">{day.label}</span>
                    </label>
                  ))}
                </div>
                {field.state.value.length === 0 && (
                  <div className="label">
                    <span className="label-text-alt text-warning">
                      Please select at least one day
                    </span>
                  </div>
                )}
              </div>
            )}
          />

          {/* Worker Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="requiredWorkers"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text">Required Workers</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(parseInt(e.target.value) || 1)}
                    className="input input-bordered w-full"
                  />
                  <div className="label">
                    <span className="label-text-alt">Target number of workers for this shift</span>
                  </div>
                </div>
              )}
            />

            <form.Field
              name="maxWorkers"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text">Maximum Workers</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(parseInt(e.target.value) || 1)}
                    className="input input-bordered w-full"
                  />
                  <div className="label">
                    <span className="label-text-alt">Maximum workers allowed (optional)</span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Color Picker */}
          <form.Field
            name="color"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Shift Color</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <label key={color.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        checked={field.state.value === color.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="sr-only"
                      />
                      <div 
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          field.state.value === color.value ? 'border-base-content' : 'border-base-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {field.state.value === color.value && (
                          <CheckCircle className="w-4 h-4 text-white drop-shadow" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          />

          {/* Form Actions */}
          <div className="modal-action">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.state.canSubmit || isSubmitting || submitSuccess}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
              {submitSuccess ? "Created!" : isSubmitting ? "Creating..." : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose} disabled={isSubmitting}>close</button>
      </form>
    </div>
  );
}