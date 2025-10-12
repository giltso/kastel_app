import { createFileRoute } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { GraduationCap, Plus, BookOpen, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { CreateCourseModal } from "@/components/modals/CreateCourseModal";
import { CourseDetailsModal } from "@/components/modals/CourseDetailsModal";
import { EnrollmentRequestModal } from "@/components/modals/EnrollmentRequestModal";
import { CourseCard } from "@/components/CourseCard";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/educational")({
  component: EducationalPage,
});

function EducationalPage() {
  const { t } = useLanguage();
  const {
    user,
    isLoading,
    isAuthenticated,
    isStaff,
    isCustomer,
    isGuest,
    hasInstructorTag,
    hasManagerTag,
  } = usePermissionsV2();

  const courses = useQuery(api.courses_v2.getAllCoursesV2);
  const stats = useQuery(api.courses_v2.getCourseStatisticsV2);
  const userEnrollments = useQuery(api.courses_v2.getUserEnrollmentsV2);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Get unique categories
  const categories = Array.from(new Set(courses?.map(c => c.category) || []));

  // Get set of enrolled course IDs for customers
  const enrolledCourseIds = new Set(
    isCustomer ? userEnrollments?.map(e => e.courseId) || [] : []
  );

  // Filter courses by category and exclude enrolled courses for customers
  const filteredCourses = courses?.filter(c => {
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const notEnrolled = !isCustomer || !enrolledCourseIds.has(c._id);
    return matchesCategory && notEnrolled;
  });

  return (
    <>
      {isAuthenticated && <EnsureUserV2 />}
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t("courses:educationalPrograms")}</h1>
            <p className="text-base-content/70">
              {isStaff && hasInstructorTag
                ? t("courses:descriptions.manageCoursesEnrollments")
                : isCustomer
                ? t("courses:descriptions.browseCoursesEnrollments")
                : t("courses:descriptions.discoverOfferings")}
            </p>
          </div>
        </div>

        {/* Stats Dashboard (Instructors/Managers) */}
        {(hasInstructorTag || hasManagerTag) && stats && (
          <div className="stats shadow mb-6 w-full">
            <div className="stat">
              <div className="stat-figure text-primary">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="stat-title">{t("courses:stats.totalCourses")}</div>
              <div className="stat-value">{stats.totalCourses}</div>
              <div className="stat-desc">{stats.activeCourses} {t("courses:stats.active")}</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-secondary">
                <Users className="w-8 h-8" />
              </div>
              <div className="stat-title">{t("courses:stats.totalEnrollments")}</div>
              <div className="stat-value">{stats.totalEnrollments}</div>
              <div className="stat-desc">{stats.confirmedEnrollments} {t("courses:stats.confirmed")}</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-warning">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="stat-title">{t("courses:stats.pendingApprovals")}</div>
              <div className="stat-value text-warning">{stats.pendingEnrollments}</div>
              <div className="stat-desc">{t("courses:stats.awaitingReview")}</div>
            </div>
          </div>
        )}

        {/* Action Buttons (Instructors) */}
        {hasInstructorTag && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              {t("courses:createCourse")}
            </button>
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex justify-center mb-6">
            <div className="tabs tabs-boxed">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`tab ${categoryFilter === "all" ? "tab-active" : ""}`}
              >
                {t("courses:allCourses")}
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`tab ${categoryFilter === category ? "tab-active" : ""}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My Enrollments (Customers) */}
        {isCustomer && userEnrollments && userEnrollments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t("courses:myEnrollments")}</h2>
            <div className="grid grid-cols-1 gap-4">
              {userEnrollments.map(enrollment => (
                <div key={enrollment._id} className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="card-title">{enrollment.course?.title}</h3>
                        <p className="text-sm opacity-70">{enrollment.course?.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <div className={`badge ${getEnrollmentStatusBadge(enrollment.status)}`}>
                          {t(`courses:enrollment.${enrollment.status}`)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm opacity-60 mt-2">
                      {t("courses:messages.enrolled")}: {enrollment.enrollmentDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {hasInstructorTag ? t("courses:allCourses") : t("courses:availableCourses")}
          </h2>

          {!filteredCourses || filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 mx-auto opacity-20 mb-4" />
              <p className="text-lg opacity-60">
                {categoryFilter === "all"
                  ? t("courses:messages.noCoursesAvailable")
                  : t("courses:messages.noCoursesInCategory", { category: categoryFilter })}
              </p>
              {hasInstructorTag && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="btn btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  {t("courses:messages.createFirstCourse")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course._id}
                  course={course}
                  onViewDetails={() => setSelectedCourseId(course._id)}
                  onEnroll={
                    isCustomer && !("userEnrollment" in course ? course.userEnrollment : null)
                      ? () => setEnrollCourse(course)
                      : undefined
                  }
                  showEnrollButton={isCustomer && !("userEnrollment" in course ? course.userEnrollment : null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Guest CTA */}
        {isGuest && (
          <div className="alert alert-info mt-8">
            <div>
              <h3 className="font-bold">{t("courses:messages.readyToLearn")}</h3>
              <p className="text-sm">{t("courses:messages.signInToEnroll")}</p>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateCourseModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
          }}
        />

        {selectedCourseId && (
          <CourseDetailsModal
            isOpen={true}
            onClose={() => setSelectedCourseId(null)}
            courseId={selectedCourseId}
            onEnroll={() => {
              const course = courses?.find(c => c._id === selectedCourseId);
              if (course) {
                setEnrollCourse(course);
                setSelectedCourseId(null);
              }
            }}
          />
        )}

        {enrollCourse && (
          <EnrollmentRequestModal
            isOpen={true}
            onClose={() => setEnrollCourse(null)}
            course={enrollCourse}
            onSuccess={() => {
              setEnrollCourse(null);
            }}
          />
        )}
      </div>
    </>
  );
}

function getEnrollmentStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "approved":
      return "badge-info";
    case "confirmed":
      return "badge-success";
    case "completed":
      return "badge-success";
    case "cancelled":
      return "badge-error";
    default:
      return "badge-neutral";
  }
}

