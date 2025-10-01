import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Plus, Trash2 } from "lucide-react";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const createCourse = useMutation(api.courses_v2.createCourseV2);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    maxParticipants: 10,
    price: 0,
    syllabus: [""],
    materials: [""],
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Filter out empty syllabus and materials
      const cleanedSyllabus = formData.syllabus.filter(item => item.trim());
      const cleanedMaterials = formData.materials.filter(item => item.trim());

      await createCourse({
        ...formData,
        syllabus: cleanedSyllabus,
        materials: cleanedMaterials,
      });

      onSuccess?.();
      onClose();

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        skillLevel: "beginner",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        location: "",
        maxParticipants: 10,
        price: 0,
        syllabus: [""],
        materials: [""],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArrayItem = (field: "syllabus" | "materials") => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const updateArrayItem = (field: "syllabus" | "materials", index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeArrayItem = (field: "syllabus" | "materials", index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  if (!isOpen) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl">Create New Course</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Course Title *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Introduction to Woodworking"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Category *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                required
                placeholder="Woodworking"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description *</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              placeholder="Course overview and what students will learn..."
            />
          </div>

          {/* Course Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Skill Level *</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.skillLevel}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  skillLevel: e.target.value as "beginner" | "intermediate" | "advanced",
                }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Max Participants *</span>
              </label>
              <input
                type="number"
                min="1"
                className="input input-bordered"
                value={formData.maxParticipants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Price ($) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                required
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Date *</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">End Date *</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Time *</span>
              </label>
              <input
                type="time"
                className="input input-bordered"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">End Time *</span>
              </label>
              <input
                type="time"
                className="input input-bordered"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Location *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
                placeholder="Workshop A"
              />
            </div>
          </div>

          {/* Syllabus */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Syllabus Topics</span>
            </label>
            <div className="space-y-2">
              {formData.syllabus.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder={`Topic ${index + 1}`}
                    value={item}
                    onChange={(e) => updateArrayItem("syllabus", index, e.target.value)}
                  />
                  {formData.syllabus.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("syllabus", index)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("syllabus")}
                className="btn btn-outline btn-sm"
              >
                <Plus className="w-4 h-4" />
                Add Topic
              </button>
            </div>
          </div>

          {/* Materials */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Materials Provided</span>
            </label>
            <div className="space-y-2">
              {formData.materials.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder={`Material ${index + 1}`}
                    value={item}
                    onChange={(e) => updateArrayItem("materials", index, e.target.value)}
                  />
                  {formData.materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("materials", index)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("materials")}
                className="btn btn-outline btn-sm"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="loading loading-spinner"></span> : "Create Course"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
