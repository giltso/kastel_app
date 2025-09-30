import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { Users, Shield, Settings, Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EditRoleModal } from "@/components/modals/EditRoleModal";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/roles")({
  component: RolesPage,
});

function RolesPage() {
  const { checkPermission, isLoading, isAuthenticated } = usePermissionsV2();
  const [viewMode, setViewMode] = useState<'staff' | 'customers'>('staff');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState({
    // Staff filters
    worker: false,
    manager: false,
    instructor: false,
    toolHandler: false,
    // Customer filters
    rentalApproved: false,
    enrolled: false,
  });

  // Modal state
  const [editRoleModal, setEditRoleModal] = useState<{
    isOpen: boolean;
    user: any | null;
  }>({ isOpen: false, user: null });

  // Get real user data from backend
  const allUsers = useQuery(api.users_v2.getAllUsersV2);
  const userStats = useQuery(api.users_v2.getUserStatistics);
  const enrollments = useQuery(api.users_v2.getAllEnrollments);

  if (isLoading || allUsers === undefined || userStats === undefined) {
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
        <p>Please sign in to access role management.</p>
      </div>
    );
  }

  if (!checkPermission("manage_staff_roles")) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Manager Access Required</h1>
        <p>Role management is only accessible to staff members with manager permissions.</p>
      </div>
    );
  }

  // Build set of enrolled customer IDs
  const enrolledCustomerIds = useMemo(() => {
    if (!enrollments) return new Set<Id<"users">>();
    return new Set(
      enrollments
        .filter(e => e.status === 'confirmed' || e.status === 'approved')
        .map(e => e.studentId)
    );
  }, [enrollments]);

  // Filter users based on view mode, search, and role filters
  const staffUsers = useMemo(() => {
    if (!allUsers) return [];

    return allUsers
      .filter(user => user.effectiveRole.isStaff)
      .filter(user => {
        // Search filter
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Role filters (OR logic - show if ANY active filter matches)
        const activeFilters = Object.entries(roleFilters).filter(([_, active]) => active);
        if (activeFilters.length === 0) return true; // No filters = show all

        return activeFilters.some(([tag, _]) => {
          if (tag === 'worker') return user.effectiveRole.workerTag;
          if (tag === 'manager') return user.effectiveRole.managerTag;
          if (tag === 'instructor') return user.effectiveRole.instructorTag;
          if (tag === 'toolHandler') return user.effectiveRole.toolHandlerTag;
          return false;
        });
      });
  }, [allUsers, searchQuery, roleFilters]);

  const customerUsers = useMemo(() => {
    if (!allUsers) return [];

    return allUsers
      .filter(user => !user.effectiveRole.isStaff)
      .filter(user => {
        // Search filter
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Role filters (OR logic - show if ANY active filter matches)
        const activeFilters = Object.entries(roleFilters).filter(([_, active]) => active);
        if (activeFilters.length === 0) return true; // No filters = show all

        return activeFilters.some(([tag, _]) => {
          if (tag === 'rentalApproved') return user.effectiveRole.rentalApprovedTag;
          if (tag === 'enrolled') return enrolledCustomerIds.has(user._id);
          return false;
        });
      });
  }, [allUsers, searchQuery, roleFilters, enrolledCustomerIds]);

  // Helper function to get role badges for a user
  const getRoleBadges = (user: any) => {
    const badges = [];
    if (user.effectiveRole.workerTag) badges.push('Worker');
    if (user.effectiveRole.managerTag) badges.push('Manager');
    if (user.effectiveRole.instructorTag) badges.push('Instructor');
    if (user.effectiveRole.toolHandlerTag) badges.push('Tool Handler');
    if (user.effectiveRole.rentalApprovedTag) badges.push('Rental Approved');
    return badges;
  };

  return (
    <>
      <EnsureUserV2 />
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-base-content/70">Manage user roles and permissions</p>
          </div>
        </div>

        {/* View Mode Toggle - Enhanced */}
        <div className="flex justify-center mb-6">
          <div className="tabs tabs-boxed tabs-lg p-2">
            <button
              className={`tab tab-lg px-8 py-4 text-lg font-semibold transition-all ${
                viewMode === 'staff'
                  ? 'tab-active bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
              onClick={() => setViewMode('staff')}
            >
              <Shield className="w-5 h-5 mr-2" />
              Staff Management
            </button>
            <button
              className={`tab tab-lg px-8 py-4 text-lg font-semibold transition-all ${
                viewMode === 'customers'
                  ? 'tab-active bg-warning text-warning-content'
                  : 'hover:bg-base-300'
              }`}
              onClick={() => setViewMode('customers')}
            >
              <Users className="w-5 h-5 mr-2" />
              Customer Management
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {viewMode === 'staff' ? (
            <>
              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Total Staff</div>
                <div className="stat-value text-primary">{userStats?.staff.total || 0}</div>
                <div className="stat-desc">Active members</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">Managers</div>
                <div className="stat-value text-success">{userStats?.staff.managers || 0}</div>
                <div className="stat-desc">With manager tag</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Workers</div>
                <div className="stat-value text-info">{userStats?.staff.workers || 0}</div>
                <div className="stat-desc">With worker tag</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">Instructors</div>
                <div className="stat-value text-warning">{userStats?.staff.instructors || 0}</div>
                <div className="stat-desc">With instructor tag</div>
              </div>
            </>
          ) : (
            <>
              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Total Customers</div>
                <div className="stat-value text-primary">{userStats?.customers.total || 0}</div>
                <div className="stat-desc">Registered users</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">Rental Approved</div>
                <div className="stat-value text-success">{userStats?.customers.rentalApproved || 0}</div>
                <div className="stat-desc">Can rent tools</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Active</div>
                <div className="stat-value text-info">{userStats?.customers.active || 0}</div>
                <div className="stat-desc">Last 30 days</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">Pending</div>
                <div className="stat-value text-warning">{userStats?.customers.pending || 0}</div>
                <div className="stat-desc">Awaiting approval</div>
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {viewMode === 'staff' ? (
            <>
              {/* Staff List */}
              <div className="lg:col-span-2">
                <div className="bg-base-100 border border-base-300 rounded-lg">
                  <div className="p-4 border-b border-base-300">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Staff Members
                    </h2>
                  </div>
              <div className="p-4">
                {/* Search and Filter */}
                <div className="mb-4 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
                    <input
                      type="text"
                      placeholder="Search staff members by name or email..."
                      className="input input-bordered w-full pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Role Filter Toggles */}
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={roleFilters.worker}
                        onChange={(e) =>
                          setRoleFilters(prev => ({ ...prev, worker: e.target.checked }))
                        }
                      />
                      <span className="text-sm font-medium">Worker</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-success checkbox-sm"
                        checked={roleFilters.manager}
                        onChange={(e) =>
                          setRoleFilters(prev => ({ ...prev, manager: e.target.checked }))
                        }
                      />
                      <span className="text-sm font-medium">Manager</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-info checkbox-sm"
                        checked={roleFilters.instructor}
                        onChange={(e) =>
                          setRoleFilters(prev => ({ ...prev, instructor: e.target.checked }))
                        }
                      />
                      <span className="text-sm font-medium">Instructor</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-warning checkbox-sm"
                        checked={roleFilters.toolHandler}
                        onChange={(e) =>
                          setRoleFilters(prev => ({ ...prev, toolHandler: e.target.checked }))
                        }
                      />
                      <span className="text-sm font-medium">Tool Handler</span>
                    </label>
                  </div>
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Roles</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-base-content/60">
                            No staff members found.
                          </td>
                        </tr>
                      ) : (
                        staffUsers.map(user => (
                          <tr key={user._id}>
                            <td>
                              <div className="font-medium">{user.name}</div>
                            </td>
                            <td>
                              <div className="text-sm text-base-content/70">{user.email}</div>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {getRoleBadges(user).map(badge => (
                                  <span key={badge} className="badge badge-primary badge-sm">
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-success">Active</span>
                            </td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  setEditRoleModal({ isOpen: true, user })
                                }
                              >
                                Edit Roles
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

              {/* Role Information Panel - Staff */}
              <div className="lg:col-span-1">
                <div className="bg-base-100 border border-base-300 rounded-lg">
                  <div className="p-4 border-b border-base-300">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Role Information
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="card bg-primary/10 border border-primary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-primary text-sm">Manager Tag</h3>
                        <p className="text-sm">Full system access including role management and shift approval.</p>
                        <div className="text-xs text-primary/70 mt-2">
                          Requires: Staff + Worker Tag
                        </div>
                      </div>
                    </div>

                    <div className="card bg-secondary/10 border border-secondary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-secondary text-sm">Worker Tag</h3>
                        <p className="text-sm">Access to LUZ system and shift management features.</p>
                      </div>
                    </div>

                    <div className="card bg-info/10 border border-info/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-info text-sm">Instructor Tag</h3>
                        <p className="text-sm">Course management and educational content creation.</p>
                      </div>
                    </div>

                    <div className="card bg-warning/10 border border-warning/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-warning text-sm">Tool Handler Tag</h3>
                        <p className="text-sm">Tool inventory management and rental processing.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Customer List */}
              <div className="lg:col-span-2">
                <div className="bg-base-100 border border-base-300 rounded-lg">
                  <div className="p-4 border-b border-base-300">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Customer Accounts
                    </h2>
                  </div>
                  <div className="p-4">
                    {/* Search and Filter for Customers */}
                    <div className="mb-4 space-y-3">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
                        <input
                          type="text"
                          placeholder="Search customers by name or email..."
                          className="input input-bordered w-full pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Customer Filter Toggles */}
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-success checkbox-sm"
                            checked={roleFilters.rentalApproved}
                            onChange={(e) =>
                              setRoleFilters(prev => ({ ...prev, rentalApproved: e.target.checked }))
                            }
                          />
                          <span className="text-sm font-medium">Rental Approved</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-3 py-2 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-secondary checkbox-sm"
                            checked={roleFilters.enrolled}
                            onChange={(e) =>
                              setRoleFilters(prev => ({ ...prev, enrolled: e.target.checked }))
                            }
                          />
                          <span className="text-sm font-medium">Enrolled in Courses</span>
                        </label>
                      </div>
                    </div>

                    {/* Customer Table */}
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Last Active</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-base-content/60">
                                No customers found.
                              </td>
                            </tr>
                          ) : (
                            customerUsers.map(user => (
                              <tr key={user._id}>
                                <td>
                                  <div className="font-medium">{user.name}</div>
                                </td>
                                <td>
                                  <div className="text-sm text-base-content/70">{user.email}</div>
                                </td>
                                <td>
                                  {user.effectiveRole.rentalApprovedTag ? (
                                    <span className="badge badge-success">Rental Approved</span>
                                  ) : (
                                    <span className="badge badge-secondary">Registered</span>
                                  )}
                                </td>
                                <td>
                                  <div className="text-sm text-base-content/70">
                                    {/* TODO: Implement last active tracking */}
                                    Recent
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() =>
                                      setEditRoleModal({ isOpen: true, user })
                                    }
                                  >
                                    Edit Roles
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Panel */}
              <div className="lg:col-span-1">
                <div className="bg-base-100 border border-base-300 rounded-lg">
                  <div className="p-4 border-b border-base-300">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Customer Status Guide
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="card bg-primary/10 border border-primary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-primary text-sm">Registered Customer</h3>
                        <p className="text-sm">Basic account with access to course browsing and tool viewing.</p>
                      </div>
                    </div>

                    <div className="card bg-success/10 border border-success/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-success text-sm">Rental Approved</h3>
                        <p className="text-sm">Can request and rent tools after approval process.</p>
                      </div>
                    </div>

                    <div className="card bg-warning/10 border border-warning/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-warning text-sm">Pending Approval</h3>
                        <p className="text-sm">Waiting for rental approval from management.</p>
                      </div>
                    </div>

                    <div className="card bg-error/10 border border-error/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-error text-sm">Inactive</h3>
                        <p className="text-sm">Account suspended or deactivated.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Edit Role Modal */}
        {editRoleModal.user && (
          <EditRoleModal
            isOpen={editRoleModal.isOpen}
            onClose={() => setEditRoleModal({ isOpen: false, user: null })}
            user={editRoleModal.user}
            onSuccess={() => {
              // Modal will close automatically, data will refresh via Convex reactivity
            }}
          />
        )}
      </div>
    </>
  );
}