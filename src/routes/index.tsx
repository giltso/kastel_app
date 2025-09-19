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
  const effective = user?.effectiveRole;

  return (
    <>
      {/* Staff Welcome */}
      <div className="hero bg-primary text-primary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Staff Portal</h1>
            <p className="py-4">Welcome back, {user?.name}! Access your operational tools and manage daily tasks.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <div className="badge badge-primary">Staff</div>
              {effective?.workerTag && <div className="badge badge-info">Worker</div>}
              {effective?.instructorTag && <div className="badge badge-secondary">Instructor</div>}
              {effective?.managerTag && <div className="badge badge-warning">Manager</div>}
            </div>
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
            {effective?.workerTag && (
              <div className="badge badge-info badge-sm">Worker Access</div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">📚 Course Management</h2>
            <p>Create courses, manage enrollments, and track student progress.</p>
            <div className="card-actions">
              <Link to="/courses" className="btn btn-secondary">
                {hasPermission("manage_courses") ? "Manage Courses" : "View Courses"}
              </Link>
            </div>
            {effective?.instructorTag && (
              <div className="badge badge-secondary badge-sm">Instructor Access</div>
            )}
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
              <div className="badge badge-info badge-sm">Worker Access</div>
            </div>
          </div>
        )}

        {hasPermission("approve_shifts") && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">⚡ Management Tools</h2>
              <p>Approve requests, manage staff, and oversee operations.</p>
              <div className="card-actions">
                <button className="btn btn-warning" disabled>Management Portal</button>
              </div>
              <div className="badge badge-warning badge-sm">Manager Access</div>
            </div>
          </div>
        )}
      </div>

      {/* Tag-Based Capabilities Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Your Active Tags</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Staff Access</div>
                  <div className="text-xs opacity-70">Base staff permissions</div>
                </div>
                <div className="badge badge-primary">Active</div>
              </div>

              {effective?.workerTag ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Worker Tag</div>
                    <div className="text-xs opacity-70">Operational capabilities, shift requests</div>
                  </div>
                  <div className="badge badge-info">Active</div>
                </div>
              ) : (
                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <div className="font-medium">Worker Tag</div>
                    <div className="text-xs opacity-70">Operational capabilities</div>
                  </div>
                  <div className="badge badge-ghost">Inactive</div>
                </div>
              )}

              {effective?.instructorTag ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Instructor Tag</div>
                    <div className="text-xs opacity-70">Course creation and management</div>
                  </div>
                  <div className="badge badge-secondary">Active</div>
                </div>
              ) : (
                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <div className="font-medium">Instructor Tag</div>
                    <div className="text-xs opacity-70">Course management</div>
                  </div>
                  <div className="badge badge-ghost">Inactive</div>
                </div>
              )}

              {effective?.managerTag ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Manager Tag</div>
                    <div className="text-xs opacity-70">Approval permissions, staff oversight</div>
                  </div>
                  <div className="badge badge-warning">Active</div>
                </div>
              ) : (
                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <div className="font-medium">Manager Tag</div>
                    <div className="text-xs opacity-70">Approval permissions</div>
                  </div>
                  <div className="badge badge-ghost">Inactive</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Available Actions</h2>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${hasPermission("browse_tools") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("browse_tools") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Browse and manage tools</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("browse_courses") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("browse_courses") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">View course information</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("manage_courses") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("manage_courses") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Create and manage courses</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("request_shifts") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("request_shifts") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Request shift assignments</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("approve_shifts") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("approve_shifts") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Approve shift requests</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Customer Home Page
function CustomerHomePage({ user, hasPermission }: { user: any, hasPermission: (p: string) => boolean }) {
  const effective = user?.effectiveRole;

  return (
    <>
      {/* Customer Welcome */}
      <div className="hero bg-secondary text-secondary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Welcome Back!</h1>
            <p className="py-4">Hi {user?.name}! Explore our tools and courses, manage your bookings and enrollments.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <div className="badge badge-secondary">Customer</div>
              {effective?.rentalApprovedTag && <div className="badge badge-success">Rental Approved</div>}
            </div>
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
              <Link to="/tools" className="btn btn-primary">
                {hasPermission("request_tool_rentals") ? "Request Rentals" : "Browse Tools"}
              </Link>
            </div>
            <div className="mt-2">
              {hasPermission("request_tool_rentals") ? (
                <div className="badge badge-success badge-sm">Can Request Rentals</div>
              ) : (
                <div className="badge badge-warning badge-sm">View Only</div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">📚 Educational Courses</h2>
            <p>Discover workshops and educational opportunities to expand your skills.</p>
            <div className="card-actions">
              <Link to="/courses" className="btn btn-secondary">View Courses</Link>
            </div>
            <div className="badge badge-info badge-sm">Enrollment Available</div>
          </div>
        </div>
      </div>

      {/* Customer Capabilities */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Account Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Customer Access</div>
                  <div className="text-xs opacity-70">Browse services and make requests</div>
                </div>
                <div className="badge badge-secondary">Active</div>
              </div>

              {effective?.rentalApprovedTag ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Tool Rental Access</div>
                    <div className="text-xs opacity-70">Approved to request tool rentals</div>
                  </div>
                  <div className="badge badge-success">Approved</div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Tool Rental Access</div>
                    <div className="text-xs opacity-70">Contact staff for rental approval</div>
                  </div>
                  <div className="badge badge-warning">Pending</div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Course Enrollment</div>
                  <div className="text-xs opacity-70">Can enroll in available courses</div>
                </div>
                <div className="badge badge-info">Available</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Available Services</h2>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${hasPermission("browse_tools") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("browse_tools") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Browse tool catalog</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("request_tool_rentals") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("request_tool_rentals") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">Request tool rentals</span>
              </div>
              <div className={`flex items-center gap-2 ${hasPermission("browse_courses") ? "" : "opacity-50"}`}>
                <div className={`w-2 h-2 rounded-full ${hasPermission("browse_courses") ? "bg-success" : "bg-error"}`}></div>
                <span className="text-sm">View course information</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-sm">Enroll in courses</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-sm">Contact support</span>
              </div>
            </div>

            {!hasPermission("request_tool_rentals") && (
              <div className="mt-4 p-3 rounded bg-warning/10 border border-warning/20">
                <p className="text-sm">
                  <strong>Get Rental Access:</strong> Contact our staff to get approved for tool rental requests.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}