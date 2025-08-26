import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { X, Calendar, Clock, Repeat, CheckCircle, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Form validation schema
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"), 
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.enum(["work", "meeting", "maintenance", "team"]),
  isRecurring: z.boolean(),
  recurringType: z.enum(["weekly"]).optional(),
  recurringDays: z.array(z.enum([
    "monday", "tuesday", "wednesday", "thursday", 
    "friday", "saturday", "sunday"
  ])).optional(),
  participants: z.array(z.string()).optional(),
}).refine((data) => {
  // Check if end date/time is after start date/time
  const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
  const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: "End date and time must be after start date and time",
  path: ["endDate"], // Show error on endDate field
}).refine((data) => {
  // If recurring, must have at least one day selected
  if (data.isRecurring && (!data.recurringDays || data.recurringDays.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Please select at least one day for recurring events",
  path: ["recurringDays"],
});

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledData?: {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
}

export function CreateEventModal({ isOpen, onClose, prefilledData = {} }: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const createEvent = useMutation(api.events.createEvent);
  const users = useQuery(api.users.listWorkers);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      startDate: prefilledData.startDate || "",
      endDate: prefilledData.endDate || "",
      startTime: prefilledData.startTime || "09:00",
      endTime: prefilledData.endTime || "17:00",
      type: "work" as const,
      isRecurring: false,
      recurringType: "weekly" as const,
      recurringDays: [] as string[],
      participants: [] as string[],
    },
    // Validators will be handled in onSubmit to avoid type mismatches
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        // Validate the form data first
        eventSchema.parse(value);
        
        // Prepare the data for submission
        const eventData = {
          title: value.title,
          description: value.description || undefined,
          startDate: value.startDate,
          endDate: value.endDate,
          startTime: value.startTime,
          endTime: value.endTime,
          type: value.type,
          isRecurring: value.isRecurring,
          recurringType: value.isRecurring && value.recurringType ? value.recurringType : undefined,
          recurringDays: value.isRecurring && value.recurringDays && value.recurringDays.length > 0 
            ? value.recurringDays as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[]
            : undefined,
          assignedTo: undefined, // Optional field for user assignment
          participants: value.participants && value.participants.length > 0 
            ? value.participants as Id<"users">[]
            : undefined,
        };

        await createEvent(eventData);
        setSubmitSuccess(true);
        
        // Reset form and close modal after short delay
        setTimeout(() => {
          form.reset();
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Failed to create event:", error);
        alert("Failed to create event. Please check your input and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Reset form when prefilled data changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: "",
        description: "",
        startDate: prefilledData.startDate || "",
        endDate: prefilledData.endDate || "",
        startTime: prefilledData.startTime || "09:00",
        endTime: prefilledData.endTime || "17:00",
        type: "work" as const,
        isRecurring: false,
        recurringType: "weekly" as const,
        recurringDays: [] as string[],
        participants: [] as string[],
      });
    }
  }, [isOpen, prefilledData, form]);

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

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create New Event
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
            <span>Event created successfully!</span>
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
          {/* Title */}
          <form.Field
            name="title"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Event Title</span>
                </label>
                <input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter event title..."
                />
                {!field.state.meta.isValid && (
                  <div className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map(e => e.message).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          />

          {/* Description */}
          <form.Field
            name="description"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="What happens in this event..."
                  rows={3}
                />
              </div>
            )}
          />

          {/* Event Type */}
          <form.Field
            name="type"
            children={(field) => (
              <div>
                <label className="label">
                  <span className="label-text">Event Type</span>
                </label>
                <select
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value as any)}
                  className="select select-bordered w-full"
                >
                  <option value="work">Work</option>
                  <option value="meeting">Meeting</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="team">Team</option>
                </select>
              </div>
            )}
          />

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="startDate"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text">Start Date</span>
                  </label>
                  <input
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="input input-bordered w-full"
                  />
                  {!field.state.meta.isValid && (
                    <div className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            />

            <form.Field
              name="endDate"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text">End Date</span>
                  </label>
                  <input
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="input input-bordered w-full"
                  />
                  {!field.state.meta.isValid && (
                    <div className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

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
                  {!field.state.meta.isValid && (
                    <div className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </div>
                  )}
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
                  {!field.state.meta.isValid && (
                    <div className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors.map(e => e.message).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          {/* Participants */}
          {users && (
            <form.Field
              name="participants"
              children={(field) => (
                <div>
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Participants
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-base-300 rounded p-2">
                    {users.map((user) => (
                      <label key={user._id} className="cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.state.value.includes(user._id)}
                          onChange={(e) => {
                            const current = field.state.value;
                            if (e.target.checked) {
                              field.handleChange([...current, user._id]);
                            } else {
                              field.handleChange(current.filter((id: string) => id !== user._id));
                            }
                          }}
                          className="checkbox checkbox-primary checkbox-sm"
                        />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {/* Recurring Toggle */}
          <form.Field
            name="isRecurring"
            children={(field) => (
              <div>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Repeating Event
                  </span>
                </label>
              </div>
            )}
          />

          {/* Recurring Options */}
          {form.state.values.isRecurring && (
            <div className="card bg-base-200 p-4">
              <h4 className="font-semibold mb-3">Repetition Settings</h4>
              
              <form.Field
                name="recurringType"
                children={(field) => (
                  <div className="mb-4">
                    <label className="label">
                      <span className="label-text">Repeat Type</span>
                    </label>
                    <select
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value as any)}
                      className="select select-bordered w-full"
                    >
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                )}
              />

              <form.Field
                name="recurringDays"
                children={(field) => (
                  <div>
                    <label className="label">
                      <span className="label-text">Days of the Week</span>
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
                    {form.state.values.isRecurring && field.state.value.length === 0 && (
                      <div className="label">
                        <span className="label-text-alt text-warning">
                          Please select at least one day for weekly repetition
                        </span>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          )}

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
              {submitSuccess ? "Created!" : isSubmitting ? "Creating..." : "Create Event"}
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