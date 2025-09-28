import { useState, useEffect } from "react";
import { Clock, Users, Calendar, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

interface CreateEditShiftModalProps {
  shiftId?: Id<"shifts"> | null; // If provided, we're editing; if null/undefined, we're creating
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shiftId: Id<"shifts">) => void;
}

interface HourlyRequirement {
  hour: string;
  minWorkers: number;
  optimalWorkers: number;
  notes?: string;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

const SHIFT_TYPES = [
  { value: "operational", label: "Operational" },
  { value: "maintenance", label: "Maintenance" },
  { value: "special", label: "Special" },
] as const;

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
];

export function CreateEditShiftModal({
  shiftId,
  isOpen,
  onClose,
  onSuccess,
}: CreateEditShiftModalProps) {
  const { hasManagerTag } = usePermissionsV2();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "operational" as const,
    openTime: "08:00",
    closeTime: "18:00",
    recurringDays: [] as string[],
    color: PRESET_COLORS[0],
  });

  const [hourlyRequirements, setHourlyRequirements] = useState<HourlyRequirement[]>([]);

  // Fetch existing shift data if editing
  const existingShift = useQuery(
    api.shifts.getShiftTemplate,
    shiftId ? { shiftId } : "skip"
  );

  // Mutations
  const createShift = useMutation(api.shifts.createShiftTemplate);
  const updateShift = useMutation(api.shifts.updateShiftTemplate);

  const isEditing = !!shiftId;

  // Load existing data when editing
  useEffect(() => {
    if (existingShift && isEditing) {
      setFormData({
        name: existingShift.name,
        description: existingShift.description || "",
        type: existingShift.type,
        openTime: existingShift.storeHours.openTime,
        closeTime: existingShift.storeHours.closeTime,
        recurringDays: existingShift.recurringDays,
        color: existingShift.color || PRESET_COLORS[0],
      });

      setHourlyRequirements(
        existingShift.hourlyRequirements.map(req => ({
          hour: req.hour,
          minWorkers: req.minWorkers,
          optimalWorkers: req.optimalWorkers,
          notes: req.notes || "",
        }))
      );
    }
  }, [existingShift, isEditing]);

  // Generate hourly requirements based on open/close times
  const generateHourlySlots = () => {
    const slots: HourlyRequirement[] = [];
    const startHour = parseInt(formData.openTime.split(':')[0]);
    const endHour = parseInt(formData.closeTime.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      const hourStr = hour.toString().padStart(2, '0') + ':00';

      // Check if we already have this hour
      const existing = hourlyRequirements.find(req => req.hour === hourStr);

      slots.push(existing || {
        hour: hourStr,
        minWorkers: 1,
        optimalWorkers: 2,
        notes: "",
      });
    }

    setHourlyRequirements(slots);
  };

  const updateHourlyRequirement = (index: number, field: keyof HourlyRequirement, value: string | number) => {
    const updated = [...hourlyRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setHourlyRequirements(updated);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error("Shift name is required");
      }

      if (formData.recurringDays.length === 0) {
        throw new Error("At least one recurring day must be selected");
      }

      if (hourlyRequirements.length === 0) {
        throw new Error("At least one hourly requirement is needed");
      }

      // Validate hourly requirements
      for (const req of hourlyRequirements) {
        if (req.minWorkers < 0 || req.optimalWorkers < req.minWorkers) {
          throw new Error("Optimal workers must be >= minimum workers >= 0");
        }
      }

      const shiftData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        storeHours: {
          openTime: formData.openTime,
          closeTime: formData.closeTime,
        },
        hourlyRequirements: hourlyRequirements,
        recurringDays: formData.recurringDays as any,
        color: formData.color,
      };

      let resultId: Id<"shifts">;

      if (isEditing && shiftId) {
        await updateShift({
          shiftId,
          ...shiftData,
        });
        resultId = shiftId;
      } else {
        resultId = await createShift(shiftData);
      }

      onSuccess?.(resultId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !hasManagerTag) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-2xl">
              {isEditing ? "Edit Shift Template" : "Create New Shift Template"}
            </h3>
            <p className="text-base-content/70 mt-1">
              {isEditing ? "Modify shift template settings" : "Define a new recurring shift template"}
            </p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Basic Information</h4>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Shift Name *</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input input-bordered w-full"
                  placeholder="e.g., Daily Operations, Weekend Coverage"
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">Shift Type</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="select select-bordered w-full"
                >
                  {SHIFT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="textarea textarea-bordered w-full"
                rows={2}
                placeholder="Optional description of this shift..."
              />
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Schedule Configuration</h4>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Opening Time</span>
                </label>
                <input
                  type="time"
                  value={formData.openTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">Closing Time</span>
                </label>
                <input
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-medium">Recurring Days *</span>
              </label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.recurringDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">{day.label.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Visual Settings</h4>
            <div>
              <label className="label">
                <span className="label-text font-medium">Color Theme</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-base-content' : 'border-base-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hourly Requirements */}
          <div className="bg-base-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Hourly Staffing Requirements</h4>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={generateHourlySlots}
              >
                <Plus className="w-4 h-4" />
                Generate from Hours
              </button>
            </div>

            {hourlyRequirements.length === 0 ? (
              <div className="text-center py-6 text-base-content/60">
                <p>No hourly requirements defined.</p>
                <p className="text-sm">Click "Generate from Hours" to create slots based on your schedule.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hourlyRequirements.map((req, index) => (
                  <div key={index} className="bg-base-100 rounded-lg p-3">
                    <div className="grid md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="label-text text-sm font-medium">Hour</label>
                        <input
                          type="time"
                          value={req.hour}
                          onChange={(e) => updateHourlyRequirement(index, 'hour', e.target.value)}
                          className="input input-bordered input-sm w-full"
                        />
                      </div>

                      <div>
                        <label className="label-text text-sm font-medium">Min Workers</label>
                        <input
                          type="number"
                          min="0"
                          value={req.minWorkers}
                          onChange={(e) => updateHourlyRequirement(index, 'minWorkers', parseInt(e.target.value))}
                          className="input input-bordered input-sm w-full"
                        />
                      </div>

                      <div>
                        <label className="label-text text-sm font-medium">Optimal Workers</label>
                        <input
                          type="number"
                          min="0"
                          value={req.optimalWorkers}
                          onChange={(e) => updateHourlyRequirement(index, 'optimalWorkers', parseInt(e.target.value))}
                          className="input input-bordered input-sm w-full"
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-circle"
                          onClick={() => setHourlyRequirements(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <input
                        type="text"
                        value={req.notes || ""}
                        onChange={(e) => updateHourlyRequirement(index, 'notes', e.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="Optional notes for this hour..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Actions */}
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
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? "Update Shift" : "Create Shift"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}