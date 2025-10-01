import { Calendar, Clock, MapPin, Users } from "lucide-react";

interface CourseCardProps {
  course: any;
  onViewDetails: () => void;
  onEnroll?: () => void;
  showEnrollButton?: boolean;
}

export function CourseCard({ course, onViewDetails, onEnroll, showEnrollButton = false }: CourseCardProps) {
  const getSkillLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return "badge-success";
      case "intermediate":
        return "badge-warning";
      case "advanced":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  const spotsAvailable = course.spotsAvailable ?? (course.maxParticipants - course.currentParticipants);
  const isFull = spotsAvailable <= 0;

  return (
    <div className="card bg-base-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer" onClick={onViewDetails}>
      <div className="card-body">
        <h3 className="card-title text-lg">{course.title}</h3>
        <p className="text-sm opacity-70 line-clamp-2">{course.description}</p>

        <div className="flex flex-wrap gap-2 my-2">
          <div className="flex items-center gap-1 text-xs opacity-60">
            <Calendar className="w-3 h-3" />
            {course.startDate}
          </div>
          <div className="flex items-center gap-1 text-xs opacity-60">
            <Clock className="w-3 h-3" />
            {course.startTime}
          </div>
          <div className="flex items-center gap-1 text-xs opacity-60">
            <MapPin className="w-3 h-3" />
            {course.location}
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm">
          <Users className="w-4 h-4 opacity-60" />
          <span className={isFull ? "text-error" : ""}>
            {spotsAvailable} {spotsAvailable === 1 ? "spot" : "spots"} left
          </span>
        </div>

        <div className="flex gap-2 mt-2">
          <div className={`badge badge-sm ${getSkillLevelBadge(course.skillLevel)}`}>
            {course.skillLevel}
          </div>
          <div className="badge badge-sm badge-secondary">{course.category}</div>
          {course.isTeaching && (
            <div className="badge badge-sm badge-accent">Teaching</div>
          )}
          {course.pendingEnrollments > 0 && (
            <div className="badge badge-sm badge-warning">{course.pendingEnrollments} pending</div>
          )}
        </div>

        <div className="card-actions justify-end mt-2">
          {showEnrollButton && onEnroll && !isFull && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnroll();
              }}
              className="btn btn-primary btn-sm"
            >
              Enroll Now
            </button>
          )}
          {isFull && (
            <div className="badge badge-error">Full</div>
          )}
        </div>
      </div>
    </div>
  );
}
