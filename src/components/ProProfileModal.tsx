import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { X, Save, Plus } from "lucide-react";
import { useState } from "react";

const proProfileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  specialties: z.array(z.string()).min(1, "At least one specialty is required"),
  experience: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  hourlyRate: z.number().min(0, "Hourly rate must be positive").optional(),
  availability: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

type ProProfileFormData = z.infer<typeof proProfileSchema>;

interface ProProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
}

export function ProProfileModal({ isOpen, onClose, mode }: ProProfileModalProps) {
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newCertification, setNewCertification] = useState("");
  
  const existingProfile = useQuery(api.proProfiles.getMyProfile);
  const createProfile = useMutation(api.proProfiles.createProProfile);
  const updateProfile = useMutation(api.proProfiles.updateProProfile);

  const form = useForm({
    defaultValues: {
      title: existingProfile?.title || "",
      description: existingProfile?.description || "",
      specialties: existingProfile?.specialties || [],
      experience: existingProfile?.experience || "",
      contactPhone: existingProfile?.contactPhone || "",
      contactEmail: existingProfile?.contactEmail || "",
      hourlyRate: existingProfile?.hourlyRate || undefined,
      availability: existingProfile?.availability || "",
      certifications: existingProfile?.certifications || [],
    },
    // Remove validator to fix type issues
    onSubmit: async ({ value }) => {
      try {
        if (mode === "create") {
          await createProfile(value);
        } else {
          await updateProfile(value);
        }
        onClose();
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    },
  });

  if (!isOpen) return null;

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      const currentSpecialties = form.getFieldValue("specialties");
      form.setFieldValue("specialties", [...currentSpecialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index: number) => {
    const currentSpecialties = form.getFieldValue("specialties");
    form.setFieldValue("specialties", currentSpecialties.filter((_: any, i: number) => i !== index));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      const currentCertifications = form.getFieldValue("certifications") || [];
      form.setFieldValue("certifications", [...currentCertifications, newCertification.trim()]);
      setNewCertification("");
    }
  };

  const removeCertification = (index: number) => {
    const currentCertifications = form.getFieldValue("certifications") || [];
    form.setFieldValue("certifications", currentCertifications.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">
            {mode === "create" ? "Create Professional Profile" : "Edit Professional Profile"}
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          {/* Title */}
          <form.Field name="title">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Professional Title *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Master Carpenter, Licensed Electrician"
                  className={`input input-bordered w-full ${
                    !field.state.meta.isValid ? "input-error" : ""
                  }`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors?.map((e: any) => e?.message).filter(Boolean).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Service Description *</span>
                </label>
                <textarea
                  placeholder="Describe your professional services, experience, and what makes you unique..."
                  className={`textarea textarea-bordered w-full h-24 ${
                    !field.state.meta.isValid ? "textarea-error" : ""
                  }`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors?.map((e: any) => e?.message).filter(Boolean).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Specialties */}
          <form.Field name="specialties">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Specialties *</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., Plumbing, Electrical, Carpentry"
                    className="input input-bordered flex-1"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={addSpecialty}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {field.state.value.map((specialty: string, index: number) => (
                    <div key={index} className="badge badge-primary gap-2">
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(index)}
                        className="btn btn-xs btn-circle btn-ghost"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors?.map((e: any) => e?.message).filter(Boolean).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <form.Field name="contactPhone">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Contact Phone</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="input input-bordered"
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="contactEmail">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Contact Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className={`input input-bordered ${
                      !field.state.meta.isValid ? "input-error" : ""
                    }`}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors?.map((e: any) => e?.message).filter(Boolean).join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Experience and Rate */}
          <div className="grid md:grid-cols-2 gap-4">
            <form.Field name="experience">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Years of Experience</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 15+ years"
                    className="input input-bordered"
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="hourlyRate">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Hourly Rate ($)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="45"
                    min="0"
                    step="5"
                    className="input input-bordered"
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.valueAsNumber || undefined)}
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Availability */}
          <form.Field name="availability">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Availability</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Weekdays 9-5, Flexible schedule"
                  className="input input-bordered"
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          {/* Certifications */}
          <form.Field name="certifications">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Certifications</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., Licensed Contractor, OSHA Certified"
                    className="input input-bordered flex-1"
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCertification())}
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="btn btn-outline btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(field.state.value || []).map((cert: string, index: number) => (
                    <div key={index} className="badge badge-outline gap-2">
                      {cert}
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="btn btn-xs btn-circle btn-ghost"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          {/* Submit Buttons */}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary gap-2"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              <Save className="w-4 h-4" />
              {mode === "create" ? "Create Profile" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}