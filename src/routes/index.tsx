import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { useEffect } from "react";
import { KastelLogo } from "@/components/KastelLogo";

export const Route = createFileRoute("/")({
  component: V2HomePage,
});

function V2HomePage() {
  const {
    user,
    hasPermission,
    isLoading,
    isGuest,
    isStaff,
    isCustomer
  } = usePermissionsV2();
  const navigate = useNavigate();

  // Automatically redirect staff users to LUZ system
  useEffect(() => {
    if (!isLoading && isStaff) {
      navigate({ to: "/luz" });
    }
  }, [isLoading, isStaff, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Guest (Unauthenticated) Interface
  if (isGuest) {
    return <GuestHomePage />;
  }

  // Staff members should be automatically redirected via useEffect above
  // This fallback should rarely be reached for staff users
  if (isStaff) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Customer home page
  if (isCustomer) {
    return (
      <>
        <EnsureUserV2 />
        <CustomerHomePage user={user} hasPermission={hasPermission} />
      </>
    );
  }

  // Fallback
  return null;
}

// Guest (Unauthenticated) Home Page
function GuestHomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="hero bg-base-200 rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-6">
              <KastelLogo size={120} className="drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-bold">Welcome to Kastel Hardware</h1>
            <p className="py-6 text-lg">
              Your trusted partner for professional tools, educational workshops, and expert services.
              Discover quality tools, learn new skills, and grow your expertise with us.
            </p>
            <div className="not-prose space-x-4">
              <Link to="/tools" className="btn btn-primary">
                Browse Our Tools
              </Link>
              <Link to="/educational" className="btn btn-secondary">
                View Courses
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Service Preview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🔧 Tool Rental</h2>
            <p>Professional-grade tools for your projects. From basic hand tools to specialized equipment.</p>
            <div className="card-actions justify-center">
              <Link to="/tools" className="btn btn-primary btn-sm">Browse Tools</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">📚 Educational Courses</h2>
            <p>Learn from experts with hands-on workshops covering woodworking, electrical, and more.</p>
            <div className="card-actions justify-center">
              <Link to="/courses" className="btn btn-secondary btn-sm">View Courses</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🏪 About Us</h2>
            <p>Family-owned hardware shop serving the community with quality tools and knowledge.</p>
            <div className="card-actions justify-center">
              <button className="btn btn-accent btn-sm" disabled>Learn More</button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Store Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Hours</h3>
              <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
              <p>Saturday: 9:00 AM - 5:00 PM</p>
              <p>Sunday: 10:00 AM - 4:00 PM</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Contact</h3>
              <p>📞 (555) 123-4567</p>
              <p>📧 info@kastelhardware.com</p>
              <p>📍 123 Main Street, Hardware City</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Staff Home Page (LUZ System)
function StaffHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  const effective = user?.effectiveRole;

  return (
    <div className="max-w-7xl mx-auto">
      {/* LUZ Header */}
      <div className="hero bg-primary text-primary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-4">
              <KastelLogo size={80} className="drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold">LUZ - Scheduling Hub</h1>
            <p className="py-4">Welcome to your unified scheduling center, {user?.name}. Manage shifts, tools, and courses all in one place.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <div className="badge badge-primary">Staff</div>
              {effective?.workerTag && <div className="badge badge-info">Worker</div>}
              {effective?.instructorTag && <div className="badge badge-secondary">Instructor</div>}
              {effective?.toolHandlerTag && <div className="badge badge-accent">Tool Handler</div>}
              {effective?.managerTag && <div className="badge badge-warning">Manager</div>}
            </div>
          </div>
        </div>
      </div>

      {/* LUZ Interface Layout - Future 70/30 split */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Overview Section (Future: 30% width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">📊 Today's Overview</h2>
              <div className="space-y-3">
                <div className="p-3 rounded bg-info/10 border border-info/20">
                  <div className="font-medium text-sm">Shift Management</div>
                  <div className="text-xs opacity-70">Coming Soon - V2 Implementation</div>
                </div>
                <div className="p-3 rounded bg-warning/10 border border-warning/20">
                  <div className="font-medium text-sm">Tool Rentals</div>
                  <div className="text-xs opacity-70">
                    <Link to="/tools" className="link">View Current Rentals →</Link>
                  </div>
                </div>
                <div className="p-3 rounded bg-secondary/10 border border-secondary/20">
                  <div className="font-medium text-sm">Courses</div>
                  <div className="text-xs opacity-70">
                    <Link to="/educational" className="link">Manage Courses →</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">🎯 Quick Actions</h2>
              <div className="space-y-2">
                {hasPermission("request_tool_rentals") && (
                  <Link to="/tools" className="btn btn-primary btn-sm w-full justify-start">
                    🔧 Manage Tools
                  </Link>
                )}
                {hasPermission("manage_courses") && (
                  <Link to="/educational" className="btn btn-secondary btn-sm w-full justify-start">
                    📚 Manage Courses
                  </Link>
                )}
                {hasPermission("access_worker_portal") && (
                  <Link to="/luz" className="btn btn-accent btn-sm w-full justify-start">
                    📅 Full Calendar View
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section (Future: 70% width) */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl h-96">
            <div className="card-body">
              <h2 className="card-title">📅 Calendar Timeline</h2>
              <div className="flex-1 flex items-center justify-center bg-base-200 rounded-lg">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🚧</div>
                  <div>
                    <h3 className="text-xl font-bold">V2 Calendar Coming Soon</h3>
                    <p className="text-sm opacity-70 mt-2">
                      The unified LUZ calendar interface is under development.<br/>
                      For now, use the links above to access individual systems.
                    </p>
                  </div>
                  <div className="not-prose">
                    <Link to="/luz" className="btn btn-primary btn-sm">
                      View LUZ Calendar
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="mt-8 p-4 rounded bg-info/10 border border-info/20">
        <h3 className="font-semibold mb-2">🔨 V2 LUZ Development Status</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Phase 1:</strong> Role System & Navigation ✅
          </div>
          <div>
            <strong>Phase 2:</strong> LUZ Interface Layout 🚧
          </div>
          <div>
            <strong>Phase 3:</strong> Shift Management System 📋
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer Home Page
function CustomerHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="hero bg-base-200 rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="flex justify-center mb-6">
              <KastelLogo size={120} className="drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-bold">Welcome to Kastel Hardware</h1>
            <p className="py-6 text-lg">
              Your trusted partner for professional tools, educational workshops, and expert services.
              Discover quality tools, learn new skills, and grow your expertise with us.
            </p>
            <div className="not-prose space-x-4">
              <Link to="/tools" className="btn btn-primary">
                Browse Our Tools
              </Link>
              <Link to="/educational" className="btn btn-secondary">
                View Courses
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Service Preview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🔧 Tool Rental</h2>
            <p>Professional-grade tools for your projects. From basic hand tools to specialized equipment.</p>
            <div className="card-actions justify-center">
              <Link to="/tools" className="btn btn-primary btn-sm">Browse Tools</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">📚 Educational Courses</h2>
            <p>Learn from experts with hands-on workshops covering woodworking, electrical, and more.</p>
            <div className="card-actions justify-center">
              <Link to="/courses" className="btn btn-secondary btn-sm">View Courses</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center">🏪 About Us</h2>
            <p>Family-owned hardware shop serving the community with quality tools and knowledge.</p>
            <div className="card-actions justify-center">
              <button className="btn btn-accent btn-sm" disabled>Learn More</button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Store Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Hours</h3>
              <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
              <p>Saturday: 9:00 AM - 5:00 PM</p>
              <p>Sunday: 10:00 AM - 4:00 PM</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Contact</h3>
              <p>📞 (555) 123-4567</p>
              <p>📧 info@kastelhardware.com</p>
              <p>📍 123 Main Street, Hardware City</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}