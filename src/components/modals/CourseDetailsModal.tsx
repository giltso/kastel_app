import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { X, Calendar, Clock, MapPin, Users, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: Id<"courses">;
  onEnroll?: () => void;
}

export function CourseDetailsModal({ isOpen, onClose, courseId, onEnroll }: CourseDetailsModalProps) {
  const courseDetails = useQuery(api.courses_v2.getCourseDetailsV2, { courseId });
  const updateEnrollmentStatus = useMutation(api.courses_v2.updateEnrollmentStatusV2);

  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !courseDetails) return null;

  const handleApproveEnrollment = async (enrollmentId: Id<"course_enrollments">) => {
    setIsUpdating(true);
    try {
      await updateEnrollmentStatus({ enrollmentId, status: "approved" });
    } catch (error) {
      console.error("Failed to approve enrollment:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectEnrollment = async (enrollmentId: Id<"course_enrollments">) => {
    setIsUpdating(true);
    try {
      await updateEnrollmentStatus({ enrollmentId, status: "cancelled" });
    } catch (error) {
      console.error("Failed to reject enrollment:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmEnrollment = async (enrollmentId: Id<"course_enrollments">) => {
    setIsUpdating(true);
    try {
      await updateEnrollmentStatus({ enrollmentId, status: "confirmed" });
    } catch (error) {
      console.error("Failed to confirm enrollment:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending": return "badge-warning";
      case "approved": return "badge-info";
      case "confirmed": return "badge-success";
      case "completed": return "badge-success";
      case "cancelled": return "badge-error";
      case "no_show": return "badge-error";
      default: return "badge-neutral";
    }
  };

  const getSkillLevelBadge = (level: string) => {
    switch (level) {
      case "beginner": return "badge-success";
      case "intermediate": return "badge-warning";
      case "advanced": return "badge-error";
      default: return "badge-neutral";
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-2xl mb-2">{courseDetails.title}</h3>
            <div className="flex gap-2 flex-wrap">
              <div className={`badge ${getSkillLevelBadge(courseDetails.skillLevel)}`}>
                {courseDetails.skillLevel}
              </div>
              <div className="badge badge-secondary">{courseDetails.category}</div>
              <div className={`badge ${courseDetails.isActive ? 'badge-success' : 'badge-neutral'}`}>
                {courseDetails.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Info */}
        <div className="space-y-4">
          <p className="text-base-content/80">{courseDetails.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-70" />
              <div className="text-sm">
                <div className="font-semibold">Start</div>
                <div className="opacity-70">{courseDetails.startDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-70" />
              <div className="text-sm">
                <div className="font-semibold">End</div>
                <div className="opacity-70">{courseDetails.endDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 opacity-70" />
              <div className="text-sm">
                <div className="font-semibold">Time</div>
                <div className="opacity-70">
                  {courseDetails.schedule?.startTime || courseDetails.startTime} - {courseDetails.schedule?.endTime || courseDetails.endTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-70" />
              <div className="text-sm">
                <div className="font-semibold">Location</div>
                <div className="opacity-70">{courseDetails.schedule?.location || courseDetails.location}</div>
              </div>
            </div>
          </div>

          <div className="stat bg-base-200 rounded-lg p-4 w-full">
            <div className="stat-figure text-secondary">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-title">Participants</div>
            <div className="stat-value text-2xl">
              {courseDetails.currentParticipants}/{courseDetails.maxParticipants}
            </div>
            <div className="stat-desc">{courseDetails.spotsAvailable} spots left</div>
          </div>

          {/* Instructor Info */}
          {courseDetails.instructor && (
            <div className="p-4 bg-base-200 rounded-lg">
              <div className="font-semibold mb-1">Instructor</div>
              <div className="text-sm opacity-70">{courseDetails.instructor.name}</div>
              {courseDetails.helperInstructors && courseDetails.helperInstructors.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold mb-1">Helper Instructors:</div>
                  <div className="flex gap-2 flex-wrap">
                    {courseDetails.helperInstructors.map((helper: any) => (
                      <div key={helper._id} className="badge badge-sm">{helper.name}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Syllabus */}
          {courseDetails.syllabus && courseDetails.syllabus.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Syllabus
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {courseDetails.syllabus.map((topic: string, index: number) => (
                  <li key={index} className="text-sm opacity-80">{topic}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Materials */}
          {courseDetails.materials && courseDetails.materials.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Materials Provided</h4>
              <ul className="list-disc list-inside space-y-1">
                {courseDetails.materials.map((material: string, index: number) => (
                  <li key={index} className="text-sm opacity-80">{material}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Enrollments (Instructor/Manager view) */}
          {courseDetails.enrollments && courseDetails.enrollments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Enrolled Students</h4>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Enrollment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseDetails.enrollments.map((enrollment: any) => (
                      <tr key={enrollment._id}>
                        <td>
                          <div className="font-semibold">{enrollment.student?.name}</div>
                          <div className="text-xs opacity-60">{enrollment.student?.email}</div>
                        </td>
                        <td className="text-sm">{enrollment.enrollmentDate}</td>
                        <td>
                          <div className={`badge badge-sm ${getStatusBadgeClass(enrollment.status)}`}>
                            {enrollment.status}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {enrollment.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApproveEnrollment(enrollment._id)}
                                  className="btn btn-xs btn-success"
                                  disabled={isUpdating}
                                  title="Approve"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleRejectEnrollment(enrollment._id)}
                                  className="btn btn-xs btn-error"
                                  disabled={isUpdating}
                                  title="Reject"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            {enrollment.status === "approved" && (
                              <button
                                onClick={() => handleConfirmEnrollment(enrollment._id)}
                                className="btn btn-xs btn-info"
                                disabled={isUpdating}
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Enrollment Status */}
          {courseDetails.userEnrollment && (
            <div className="alert alert-info">
              <div>
                <div className="font-semibold">Your Enrollment Status</div>
                <div className="flex gap-2 mt-2">
                  <div className={`badge ${getStatusBadgeClass(courseDetails.userEnrollment.status)}`}>
                    {courseDetails.userEnrollment.status}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          {!courseDetails.userEnrollment && !courseDetails.canManage && courseDetails.spotsAvailable > 0 && (
            <button onClick={onEnroll} className="btn btn-primary">
              Enroll Now
            </button>
          )}
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
