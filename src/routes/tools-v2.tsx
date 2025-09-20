import { createFileRoute } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/tools-v2")({
  component: ToolsV2Page,
});

function ToolsV2Page() {
  const {
    user,
    isLoading,
    isAuthenticated,
    isStaff,
    isCustomer,
    isGuest,
    hasToolHandlerTag,
    hasRentalApprovedTag
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
          <div className="hero bg-warning text-warning-content rounded-lg mb-8">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <div className="flex justify-center mb-4">
                  <Wrench className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Tool Management</h1>
                <p className="py-4">
                  Manage tool inventory, rental operations, and maintenance schedules.
                  {hasToolHandlerTag ? " Full tool management and rental processing capabilities." : " View tool status and availability."}
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <div className="badge badge-warning">Staff</div>
                  {hasToolHandlerTag && <div className="badge badge-accent">Tool Handler</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Banner */}
        {isCustomer && (
          <div className="hero bg-primary text-primary-content rounded-lg mb-8">
            <div className="hero-content text-center">
              <div className="max-w-2xl">
                <div className="flex justify-center mb-4">
                  <Wrench className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Tool Rental</h1>
                <p className="py-4">
                  Access professional-grade tools for your projects. From basic hand tools to
                  specialized equipment, rent quality tools when you need them.
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <div className="badge badge-primary">Customer</div>
                  {hasRentalApprovedTag && <div className="badge badge-success">Rental Approved</div>}
                </div>
                {!hasRentalApprovedTag && (
                  <div className="mt-4 not-prose">
                    <div className="alert alert-info">
                      <span>Contact staff to get approved for tool rentals</span>
                    </div>
                  </div>
                )}
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
                  <Wrench className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold">Professional Tool Rental</h1>
                <p className="py-4">
                  Discover our extensive collection of professional-grade tools. From construction
                  to woodworking, automotive to electrical - we have the tools you need.
                </p>
                <div className="not-prose">
                  <button className="btn btn-primary">Sign Up to Rent Tools</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Content */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="card-title justify-center text-2xl mb-4">Tool System V2 Coming Soon</h2>
            <p className="text-lg opacity-70 mb-6">
              The V2 Tool Rental system is currently under development as part of Phase 2.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded bg-warning/10 border border-warning/20">
                <h3 className="font-semibold mb-2">📦 Inventory Management</h3>
                <p className="text-sm opacity-70">Real-time tool availability, maintenance tracking, and condition monitoring</p>
              </div>
              <div className="p-4 rounded bg-primary/10 border border-primary/20">
                <h3 className="font-semibold mb-2">📅 Rental Scheduling</h3>
                <p className="text-sm opacity-70">Integrated calendar booking with conflict prevention and automated reminders</p>
              </div>
              <div className="p-4 rounded bg-accent/10 border border-accent/20">
                <h3 className="font-semibold mb-2">💰 Pricing & Billing</h3>
                <p className="text-sm opacity-70">Flexible rental rates, damage assessment, and integrated payment tracking</p>
              </div>
            </div>

            {/* Legacy System Link */}
            <div className="mt-8 p-4 rounded bg-info/10 border border-info/20">
              <p className="text-sm mb-3">Looking for the current tool rental system?</p>
              <a href="/tools" className="btn btn-info btn-sm">View Legacy Tools →</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}