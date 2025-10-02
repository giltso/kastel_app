import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { X, Calendar, Clock, MapPin } from "lucide-react";

interface EnrollmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  onSuccess?: () => void;
}

export function EnrollmentRequestModal({ isOpen, onClose, course, onSuccess }: EnrollmentRequestModalProps) {
  const requestEnrollment = useMutation(api.courses_v2.requestEnrollmentV2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await requestEnrollment({ courseId: course._id });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request enrollment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl">Request Course Enrollment</h3>
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
          {/* Course Summary */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h4 className="card-title">{course.title}</h4>
              <p className="text-sm opacity-70">{course.description}</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 opacity-60" />
                  <div>
                    <div className="font-semibold">Duration</div>
                    <div className="opacity-70">{course.startDate} - {course.endDate}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 opacity-60" />
                  <div>
                    <div className="font-semibold">Time</div>
                    <div className="opacity-70">{course.startTime} - {course.endTime}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 opacity-60" />
                  <div>
                    <div className="font-semibold">Location</div>
                    <div className="opacity-70">{course.location}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="badge badge-outline">{course.skillLevel}</div>
                <div className="badge badge-secondary">{course.category}</div>
              </div>

              <div className="mt-2 text-sm">
                <span className="font-semibold">Available Spots:</span>{" "}
                <span className="opacity-70">{course.spotsAvailable || 0}</span>
              </div>
            </div>
          </div>

          {/* Enrollment Info */}
          <div className="alert alert-info">
            <div>
              <h4 className="font-semibold">What happens next?</h4>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Your enrollment request will be sent to the instructor</li>
                <li>You'll be notified when your enrollment is approved</li>
                <li>You can cancel your enrollment at any time before approval</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
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
              {isSubmitting ? <span className="loading loading-spinner"></span> : "Request Enrollment"}
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
