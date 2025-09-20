import { createFileRoute } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";

export const Route = createFileRoute("/luz")({
  component: LUZPage,
});

function LUZPage() {
  const { user, isLoading, isAuthenticated } = usePermissionsV2();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Please sign in to access the LUZ system.</p>
      </div>
    );
  }

  return (
    <>
      <EnsureUserV2 />
      <div className="max-w-7xl mx-auto">
        {/* LUZ Header */}
        <div className="hero bg-primary text-primary-content rounded-lg mb-8">
          <div className="hero-content text-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold">LUZ</h1>
              <p className="py-4">Unified scheduling and operational management system</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="card-title justify-center text-2xl mb-4">LUZ System Coming Soon</h2>
            <p className="text-lg opacity-70 mb-6">
              The LUZ (Unified Scheduling Hub) is currently under development as part of V2 Phase 2.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded bg-info/10 border border-info/20">
                <h3 className="font-semibold mb-2">📅 Shift Management</h3>
                <p className="text-sm opacity-70">Population-based shift templates with flexible worker assignments</p>
              </div>
              <div className="p-4 rounded bg-warning/10 border border-warning/20">
                <h3 className="font-semibold mb-2">🔧 Tool Integration</h3>
                <p className="text-sm opacity-70">Unified tool rental management within scheduling interface</p>
              </div>
              <div className="p-4 rounded bg-secondary/10 border border-secondary/20">
                <h3 className="font-semibold mb-2">📚 Course Coordination</h3>
                <p className="text-sm opacity-70">Educational workshop scheduling and resource allocation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}