import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Session {
  sessionNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
}

type SessionType = "single" | "multi-meeting" | "recurring-template";

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const createCourse = useMutation(api.courses_v2.createCourseV2);

  const [step, setStep] = useState(1); // 1: Basic Info, 2: Sessions, 3: Materials
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    location: "",
    maxParticipants: 10,
    syllabus: [""],
    materials: [""],
  });

  const [sessionType, setSessionType] = useState<SessionType>("single");

  // Single session data
  const [singleSession, setSingleSession] = useState({
    date: "",
    startTime: "",
    endTime: "",
  });

  // Multi-meeting sessions
  const [sessions, setSessions] = useState<Session[]>([
    { sessionNumber: 1, date: "", startTime: "", endTime: "", location: "", notes: "" }
  ]);

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

      if (sessionType === "single") {
        // Validate single session
        if (!singleSession.date || !singleSession.startTime || !singleSession.endTime) {
          throw new Error("Please fill in all session details");
        }

        const startDateTime = new Date(`${singleSession.date}T${singleSession.startTime}`);
        const endDateTime = new Date(`${singleSession.date}T${singleSession.endTime}`);

        if (endDateTime <= startDateTime) {
          throw new Error("End time must be after start time");
        }

        await createCourse({
          ...formData,
          sessionType: "single",
          startDate: singleSession.date,
          endDate: singleSession.date,
          startTime: singleSession.startTime,
          endTime: singleSession.endTime,
          syllabus: cleanedSyllabus,
          materials: cleanedMaterials,
        });
      } else if (sessionType === "multi-meeting") {
        // Validate multi-meeting sessions
        if (sessions.length === 0) {
          throw new Error("Please add at least one session");
        }

        for (const session of sessions) {
          if (!session.date || !session.startTime || !session.endTime) {
            throw new Error(`Session ${session.sessionNumber}: Please fill in all required fields`);
          }

          const startDateTime = new Date(`${session.date}T${session.startTime}`);
          const endDateTime = new Date(`${session.date}T${session.endTime}`);

          if (endDateTime <= startDateTime) {
            throw new Error(`Session ${session.sessionNumber}: End time must be after start time`);
          }
        }

        await createCourse({
          ...formData,
          sessionType: "multi-meeting",
          syllabus: cleanedSyllabus,
          materials: cleanedMaterials,
          sessions: sessions,
        });
      } else {
        throw new Error("Recurring templates are not yet supported");
      }

      onSuccess?.();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      title: "",
      description: "",
      category: "",
      skillLevel: "beginner",
      location: "",
      maxParticipants: 10,
      syllabus: [""],
      materials: [""],
    });
    setSessionType("single");
    setSingleSession({ date: "", startTime: "", endTime: "" });
    setSessions([{ sessionNumber: 1, date: "", startTime: "", endTime: "", location: "", notes: "" }]);
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

  const addSession = () => {
    setSessions(prev => [
      ...prev,
      {
        sessionNumber: prev.length + 1,
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        notes: "",
      }
    ]);
  };

  const updateSession = (index: number, field: keyof Session, value: string | number) => {
    setSessions(prev => prev.map((session, i) =>
      i === index ? { ...session, [field]: value } : session
    ));
  };

  const removeSession = (index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index).map((session, i) => ({
      ...session,
      sessionNumber: i + 1,
    })));
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceedToNextStep = () => {
    if (step === 1) {
      return formData.title && formData.description && formData.category && formData.location;
    }
    if (step === 2) {
      if (sessionType === "single") {
        return singleSession.date && singleSession.startTime && singleSession.endTime;
      }
      if (sessionType === "multi-meeting") {
        return sessions.every(s => s.date && s.startTime && s.endTime);
      }
    }
    return true;
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

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-6">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-base-content/50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>
              1
            </div>
            <span className="text-sm font-medium">Basic Info</span>
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-base-300">
            <div className={`h-full transition-all ${step >= 2 ? 'bg-primary w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-base-content/50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>
              2
            </div>
            <span className="text-sm font-medium">Sessions</span>
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-base-300">
            <div className={`h-full transition-all ${step >= 3 ? 'bg-primary w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-base-content/50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>
              3
            </div>
            <span className="text-sm font-medium">Materials</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
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
                    <span className="label-text">Default Location *</span>
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
            </div>
          )}

          {/* Step 2: Session Scheduling */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Session Type</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                    <input
                      type="radio"
                      name="sessionType"
                      value="single"
                      checked={sessionType === "single"}
                      onChange={(e) => setSessionType(e.target.value as SessionType)}
                      className="radio radio-primary mt-1"
                    />
                    <div>
                      <div className="font-medium">Single Session Course</div>
                      <div className="text-sm text-base-content/70">One-time course happening on a single date</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                    <input
                      type="radio"
                      name="sessionType"
                      value="multi-meeting"
                      checked={sessionType === "multi-meeting"}
                      onChange={(e) => setSessionType(e.target.value as SessionType)}
                      className="radio radio-primary mt-1"
                    />
                    <div>
                      <div className="font-medium">Multi-Meeting Course</div>
                      <div className="text-sm text-base-content/70">Course with multiple sessions (e.g., Session 1, Session 2, Session 3)</div>
                      <div className="text-sm text-base-content/70">Students enroll once for all sessions</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-not-allowed opacity-50">
                    <input
                      type="radio"
                      name="sessionType"
                      value="recurring-template"
                      disabled
                      className="radio radio-primary mt-1"
                    />
                    <div>
                      <div className="font-medium">Recurring Template <span className="badge badge-sm">Coming Soon</span></div>
                      <div className="text-sm text-base-content/70">Create multiple independent course instances</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Single Session Form */}
              {sessionType === "single" && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h4 className="card-title text-lg">Session Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Date *</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered"
                          value={singleSession.date}
                          onChange={(e) => setSingleSession(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Start Time *</span>
                        </label>
                        <input
                          type="time"
                          className="input input-bordered"
                          value={singleSession.startTime}
                          onChange={(e) => setSingleSession(prev => ({ ...prev, startTime: e.target.value }))}
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
                          value={singleSession.endTime}
                          onChange={(e) => setSingleSession(prev => ({ ...prev, endTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Meeting Sessions Form */}
              {sessionType === "multi-meeting" && (
                <div className="space-y-3">
                  {sessions.map((session, index) => (
                    <div key={index} className="card bg-base-200">
                      <div className="card-body">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="card-title text-lg">Session {session.sessionNumber}</h4>
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSession(index)}
                              className="btn btn-ghost btn-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Date *</span>
                            </label>
                            <input
                              type="date"
                              className="input input-bordered"
                              value={session.date}
                              onChange={(e) => updateSession(index, 'date', e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Start Time *</span>
                            </label>
                            <input
                              type="time"
                              className="input input-bordered"
                              value={session.startTime}
                              onChange={(e) => updateSession(index, 'startTime', e.target.value)}
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
                              value={session.endTime}
                              onChange={(e) => updateSession(index, 'endTime', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Location (optional)</span>
                            </label>
                            <input
                              type="text"
                              className="input input-bordered"
                              value={session.location || ""}
                              onChange={(e) => updateSession(index, 'location', e.target.value)}
                              placeholder={formData.location}
                            />
                          </div>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Notes (optional)</span>
                            </label>
                            <input
                              type="text"
                              className="input input-bordered"
                              value={session.notes || ""}
                              onChange={(e) => updateSession(index, 'notes', e.target.value)}
                              placeholder="Bring safety goggles"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSession}
                    className="btn btn-outline w-full"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Course Materials */}
          {step === 3 && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary"
                  disabled={!canProceedToNextStep()}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <span className="loading loading-spinner"></span> : "Create Course"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
