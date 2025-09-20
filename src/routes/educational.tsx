import { createFileRoute } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { GraduationCap } from "lucide-react";

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
    hasInstructorTag
  } = usePermissionsV2();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <EnsureUserV2 />}
      <div className="max-w-7xl mx-auto">

        {/* Staff Banner */}
        {isStaff && (
          <div className="hero bg-secondary text-secondary-content rounded-lg mb-8">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <div className="flex justify-center mb-4">
                  <GraduationCap className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Educational Management</h1>
                <p className="py-4">
                  Manage courses, workshops, and educational programs.
                  {hasInstructorTag ? " Create and manage your courses as an instructor." : " View and coordinate educational activities."}
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <div className="badge badge-secondary">Staff</div>
                  {hasInstructorTag && <div className="badge badge-accent">Instructor</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Banner */}
        {isCustomer && (
          <div className="hero bg-accent text-accent-content rounded-lg mb-8">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <div className="flex justify-center mb-4">
                  <GraduationCap className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Educational Workshops</h1>
                <p className="py-4">
                  Discover hands-on workshops and educational courses. Learn new skills with expert instruction
                  and quality tools in our professional workshop environment.
                </p>
                <div className="flex justify-center gap-2">
                  <div className="badge badge-accent">Student Access</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guest Banner */}
        {isGuest && (
          <div className="hero bg-neutral text-neutral-content rounded-lg mb-8">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <div className="flex justify-center mb-4">
                  <GraduationCap className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Educational Programs</h1>
                <p className="py-4">
                  Explore our comprehensive educational offerings. From beginner workshops to advanced
                  technical training, learn with professional-grade tools and expert instruction.
                </p>
                <div className="not-prose">
                  <button className="btn btn-primary">Sign Up to Enroll</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Content */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="card-title justify-center text-2xl mb-4">Educational System Coming Soon</h2>
            <p className="text-lg opacity-70 mb-6">
              The V2 Educational system is currently under development as part of Phase 2.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded bg-secondary/10 border border-secondary/20">
                <h3 className="font-semibold mb-2">🛠️ Workshop Courses</h3>
                <p className="text-sm opacity-70">Hands-on workshops covering woodworking, electrical, plumbing, and more</p>
              </div>
              <div className="p-4 rounded bg-accent/10 border border-accent/20">
                <h3 className="font-semibold mb-2">👨‍🏫 Expert Instruction</h3>
                <p className="text-sm opacity-70">Learn from experienced professionals with real-world expertise</p>
              </div>
              <div className="p-4 rounded bg-primary/10 border border-primary/20">
                <h3 className="font-semibold mb-2">🏆 Skill Certification</h3>
                <p className="text-sm opacity-70">Earn certificates and build your professional capabilities</p>
              </div>
            </div>

            {/* Legacy System Link */}
            <div className="mt-8 p-4 rounded bg-info/10 border border-info/20">
              <p className="text-sm mb-3">Looking for the current course system?</p>
              <a href="/courses" className="btn btn-info btn-sm">View Legacy Courses →</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}