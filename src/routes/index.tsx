import { createFileRoute, Link } from "@tanstack/react-router";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { RoleEmulator } from "@/components/RoleEmulator";
import { UserRoleDebugV2 } from "@/components/UserRoleDebugV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";

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
    isCustomer,
    canEmulateRoles
  } = usePermissionsV2();

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

  // Authenticated user interface with role emulation for dev
  return (
    <div className="max-w-4xl mx-auto">
      <EnsureUserV2 />

      {/* Development Tools (dev only) */}
      {canEmulateRoles && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">V2 Development Tools</h2>
            <div className="flex gap-4 items-center">
              <UserRoleDebugV2 />
              <RoleEmulator />
            </div>
            <div className="mt-4">
              <Link to="/v1" className="btn btn-outline btn-sm">
                View V1 Legacy System →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Staff Interface */}
      {isStaff && <StaffHomePage user={user} hasPermission={hasPermission} />}

      {/* Customer Interface */}
      {isCustomer && <CustomerHomePage user={user} hasPermission={hasPermission} />}
    </div>
  );
}

// Guest (Unauthenticated) Home Page
function GuestHomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="hero bg-base-200 rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold">Welcome to Kastel Hardware</h1>
            <p className="py-6 text-lg">
              Your trusted partner for professional tools, educational workshops, and expert services.
              Discover quality tools, learn new skills, and grow your expertise with us.
            </p>
            <div className="not-prose space-x-4">
              <Link to="/tools" className="btn btn-primary">
                Browse Our Tools
              </Link>
              <Link to="/courses" className="btn btn-secondary">
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

// Staff Home Page
function StaffHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  return (
    <>
      {/* Staff Welcome */}
      <div className="hero bg-primary text-primary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Staff Portal</h1>
            <p className="py-4">Welcome back, {user?.name}! Access your operational tools and manage daily tasks.</p>
          </div>
        </div>
      </div>

      {/* Staff Navigation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">🔧 Tool Management</h2>
            <p>Manage inventory, process rentals, and track tool status.</p>
            <div className="card-actions">
              <Link to="/tools" className="btn btn-primary">Manage Tools</Link>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">📚 Course Management</h2>
            <p>Create courses, manage enrollments, and track student progress.</p>
            <div className="card-actions">
              <Link to="/courses" className="btn btn-secondary">Manage Courses</Link>
            </div>
          </div>
        </div>

        {hasPermission("request_shifts") && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">📅 Shift Planning</h2>
              <p>View schedules, request shifts, and manage work assignments.</p>
              <div className="card-actions">
                <button className="btn btn-accent" disabled>Coming Soon</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Staff Capabilities */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Your Capabilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hasPermission("access_staff_features") && (
              <div className="badge badge-primary">Staff Access</div>
            )}
            {hasPermission("request_shifts") && (
              <div className="badge badge-info">Request Shifts</div>
            )}
            {hasPermission("approve_shifts") && (
              <div className="badge badge-warning">Approve Shifts</div>
            )}
            {hasPermission("manage_courses") && (
              <div className="badge badge-secondary">Manage Courses</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Customer Home Page
function CustomerHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  return (
    <>
      {/* Customer Welcome */}
      <div className="hero bg-secondary text-secondary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Welcome Back!</h1>
            <p className="py-4">Hi {user?.name}! Explore our tools and courses, manage your bookings and enrollments.</p>
          </div>
        </div>
      </div>

      {/* Customer Services */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">🔧 Tool Rental</h2>
            <p>Browse our professional tool collection and make rental requests.</p>
            <div className="card-actions">
              <Link to="/tools" className="btn btn-primary">Browse Tools</Link>
            </div>
            {hasPermission("request_tool_rentals") && (
              <div className="badge badge-success">Rental Approved</div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">📚 Educational Courses</h2>
            <p>Discover workshops and educational opportunities to expand your skills.</p>
            <div className="card-actions">
              <Link to="/courses" className="btn btn-secondary">View Courses</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Account Status</h2>
          <div className="flex gap-2">
            <div className="badge badge-primary">Customer</div>
            {hasPermission("request_tool_rentals") ? (
              <div className="badge badge-success">Rental Approved</div>
            ) : (
              <div className="badge badge-warning">Rental Pending Approval</div>
            )}
          </div>
          {!hasPermission("request_tool_rentals") && (
            <p className="text-sm opacity-70 mt-2">
              Contact staff to get approved for tool rentals
            </p>
          )}
        </div>
      </div>
    </>
  );
}