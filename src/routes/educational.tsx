import { createFileRoute } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
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
  const filteredCourses = courses?.filter(c =>
    categoryFilter === "all" || c.category === categoryFilter
  );

  return (
    <>
      {isAuthenticated && <EnsureUserV2 />}
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Educational Programs</h1>
            <p className="text-base-content/70">
              {isStaff && hasInstructorTag
                ? "Manage your courses and student enrollments"
                : isCustomer
                ? "Browse courses and manage your enrollments"
                : "Discover our educational offerings"}
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
              <div className="stat-title">Total Courses</div>
              <div className="stat-value">{stats.totalCourses}</div>
              <div className="stat-desc">{stats.activeCourses} active</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-secondary">
                <Users className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Enrollments</div>
              <div className="stat-value">{stats.totalEnrollments}</div>
              <div className="stat-desc">{stats.confirmedEnrollments} confirmed</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-warning">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="stat-title">Pending Approvals</div>
              <div className="stat-value text-warning">{stats.pendingEnrollments}</div>
              <div className="stat-desc">Awaiting review</div>
            </div>

            {hasManagerTag && stats.totalRevenue !== undefined && (
              <div className="stat">
                <div className="stat-figure text-success">
                  <div className="text-2xl">$</div>
                </div>
                <div className="stat-title">Revenue</div>
                <div className="stat-value text-success">${stats.totalRevenue}</div>
                <div className="stat-desc">{stats.pendingPayments} pending</div>
              </div>
            )}
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
              Create Course
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
                All Courses
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
            <h2 className="text-2xl font-bold mb-4">My Enrollments</h2>
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
                          {enrollment.status}
                        </div>
                        <div className={`badge ${getPaymentStatusBadge(enrollment.paymentStatus)}`}>
                          {enrollment.paymentStatus}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm opacity-60 mt-2">
                      Enrolled: {enrollment.enrollmentDate}
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
            {hasInstructorTag ? "All Courses" : "Available Courses"}
          </h2>

          {!filteredCourses || filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 mx-auto opacity-20 mb-4" />
              <p className="text-lg opacity-60">
                {categoryFilter === "all"
                  ? "No courses available yet"
                  : `No courses in ${categoryFilter} category`}
              </p>
              {hasInstructorTag && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="btn btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Course
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
                    isCustomer && !course.userEnrollment
                      ? () => setEnrollCourse(course)
                      : undefined
                  }
                  showEnrollButton={isCustomer && !course.userEnrollment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Guest CTA */}
        {isGuest && (
          <div className="alert alert-info mt-8">
            <div>
              <h3 className="font-bold">Ready to learn?</h3>
              <p className="text-sm">Sign in to enroll in courses and start your educational journey.</p>
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

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "paid":
      return "badge-success";
    case "refunded":
      return "badge-info";
    default:
      return "badge-neutral";
  }
}
