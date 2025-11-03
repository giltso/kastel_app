import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { Users, Shield, Settings, Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EditRoleModal } from "@/components/modals/EditRoleModal";
import { Id } from "../../convex/_generated/dataModel";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/roles")({
  component: RolesPage,
});

function RolesPage() {
  const { t } = useLanguage();
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

  // Build set of enrolled customer IDs (must be called before early returns)
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
      .filter(user => user.isStaff ?? false)
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
          if (tag === 'worker') return user.workerTag ?? false;
          if (tag === 'manager') return user.managerTag ?? false;
          if (tag === 'instructor') return user.instructorTag ?? false;
          if (tag === 'toolHandler') return user.toolHandlerTag ?? false;
          return false;
        });
      });
  }, [allUsers, searchQuery, roleFilters]);

  const customerUsers = useMemo(() => {
    if (!allUsers) return [];

    return allUsers
      .filter(user => !(user.isStaff ?? false))
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
          if (tag === 'rentalApproved') return user.rentalApprovedTag ?? false;
          if (tag === 'enrolled') return enrolledCustomerIds.has(user._id);
          return false;
        });
      });
  }, [allUsers, searchQuery, roleFilters, enrolledCustomerIds]);

  // Early returns must come AFTER all hooks
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
        <h1 className="text-2xl font-bold mb-4">{t('auth:accessDenied')}</h1>
        <p>{t('auth:signInToAccess')}</p>
      </div>
    );
  }

  if (!checkPermission("manage_staff_roles")) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">{t('auth:staffAccessRequired')}</h1>
        <p>{t('auth:staffOnly')}</p>
      </div>
    );
  }

  // Helper function to get role badges for a user
  const getRoleBadges = (user: any) => {
    const badges = [];
    if (user.workerTag) badges.push(t('roles:tags.worker'));
    if (user.managerTag) badges.push(t('roles:tags.manager'));
    if (user.instructorTag) badges.push(t('roles:tags.instructor'));
    if (user.toolHandlerTag) badges.push(t('roles:tags.toolHandler'));
    if (user.rentalApprovedTag) badges.push(t('roles:tags.rentalApproved'));
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
            <h1 className="text-3xl font-bold">{t('roles:title')}</h1>
            <p className="text-base-content/70">{t('roles:manageRolesPermissions')}</p>
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
              {t('roles:staffManagement')}
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
              {t('roles:customerManagement')}
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
                <div className="stat-title">{t('roles:totalStaff')}</div>
                <div className="stat-value text-primary">{userStats?.staff.total || 0}</div>
                <div className="stat-desc">{t('roles:activeMembers')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('roles:managers')}</div>
                <div className="stat-value text-success">{userStats?.staff.managers || 0}</div>
                <div className="stat-desc">{t('roles:withManagerTag')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('roles:workers')}</div>
                <div className="stat-value text-info">{userStats?.staff.workers || 0}</div>
                <div className="stat-desc">{t('roles:withWorkerTag')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('roles:instructors')}</div>
                <div className="stat-value text-warning">{userStats?.staff.instructors || 0}</div>
                <div className="stat-desc">{t('roles:withInstructorTag')}</div>
              </div>
            </>
          ) : (
            <>
              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('roles:customerManagement')}</div>
                <div className="stat-value text-primary">{userStats?.customers.total || 0}</div>
                <div className="stat-desc">{t('roles:activeMembers')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('roles:tags.rentalApproved')}</div>
                <div className="stat-value text-success">{userStats?.customers.rentalApproved || 0}</div>
                <div className="stat-desc">{t('roles:descriptions.rentalApprovedDescription')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('common:status.active')}</div>
                <div className="stat-value text-info">{userStats?.customers.active || 0}</div>
                <div className="stat-desc">{t('roles:activeMembers')}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">{t('common:status.pending')}</div>
                <div className="stat-value text-warning">{userStats?.customers.pending || 0}</div>
                <div className="stat-desc">{t('courses:stats.awaitingReview')}</div>
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
                      {t('roles:staffMembers')}
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
                      placeholder={t('roles:searchStaffPlaceholder')}
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
                      <span className="text-sm font-medium">{t('roles:tags.worker')}</span>
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
                      <span className="text-sm font-medium">{t('roles:tags.manager')}</span>
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
                      <span className="text-sm font-medium">{t('roles:tags.instructor')}</span>
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
                      <span className="text-sm font-medium">{t('roles:tags.toolHandler')}</span>
                    </label>
                  </div>
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>{t('roles:name')}</th>
                        <th>{t('roles:email')}</th>
                        <th>{t('roles:roles')}</th>
                        <th>{t('roles:status')}</th>
                        <th>{t('roles:actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-base-content/60">
                            {t('common:messages.noResults')}
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
                              <span className="badge badge-success">{t('roles:active')}</span>
                            </td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  setEditRoleModal({ isOpen: true, user })
                                }
                              >
{t('roles:editRoles')}
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
                      {t('roles:roleInformation')}
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="card bg-primary/10 border border-primary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-primary text-sm">{t('roles:managerTagTitle')}</h3>
                        <p className="text-sm">{t('roles:managerTagDescription')}</p>
                        <div className="text-xs text-primary/70 mt-2">
                          {t('roles:requiresStaffWorker')}
                        </div>
                      </div>
                    </div>

                    <div className="card bg-secondary/10 border border-secondary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-secondary text-sm">{t('roles:workerTagTitle')}</h3>
                        <p className="text-sm">{t('roles:workerTagDescription')}</p>
                      </div>
                    </div>

                    <div className="card bg-info/10 border border-info/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-info text-sm">{t('roles:instructorTagTitle')}</h3>
                        <p className="text-sm">{t('roles:instructorTagDescription')}</p>
                      </div>
                    </div>

                    <div className="card bg-warning/10 border border-warning/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-warning text-sm">{t('roles:toolHandlerTagTitle')}</h3>
                        <p className="text-sm">{t('roles:toolHandlerTagDescription')}</p>
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
                      {t('roles:customerManagement')}
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
                          placeholder={t('roles:search.searchUsers')}
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
                          <span className="text-sm font-medium">{t('roles:tags.rentalApproved')}</span>
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
                          <span className="text-sm font-medium">{t('courses:enrollment.enrolledStudents')}</span>
                        </label>
                      </div>
                    </div>

                    {/* Customer Table */}
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>{t('roles:name')}</th>
                            <th>{t('roles:email')}</th>
                            <th>{t('roles:status')}</th>
                            <th>{t('common:status.active')}</th>
                            <th>{t('roles:actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-base-content/60">
                                {t('common:messages.noResults')}
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
                                  {user.rentalApprovedTag ? (
                                    <span className="badge badge-success">{t('roles:tags.rentalApproved')}</span>
                                  ) : (
                                    <span className="badge badge-secondary">{t('roles:tags.customer')}</span>
                                  )}
                                </td>
                                <td>
                                  <div className="text-sm text-base-content/70">
                                    {/* TODO: Implement last active tracking */}
                                    {t('common:time.today')}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() =>
                                      setEditRoleModal({ isOpen: true, user })
                                    }
                                  >
    {t('roles:editRoles')}
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
                      {t('roles:roleInformation')}
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="card bg-primary/10 border border-primary/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-primary text-sm">{t('roles:tags.customer')}</h3>
                        <p className="text-sm">{t('roles:descriptions.staffDescription')}</p>
                      </div>
                    </div>

                    <div className="card bg-success/10 border border-success/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-success text-sm">{t('roles:tags.rentalApproved')}</h3>
                        <p className="text-sm">{t('roles:descriptions.rentalApprovedDescription')}</p>
                      </div>
                    </div>

                    <div className="card bg-warning/10 border border-warning/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-warning text-sm">{t('common:status.pending')}</h3>
                        <p className="text-sm">{t('courses:stats.awaitingReview')}</p>
                      </div>
                    </div>

                    <div className="card bg-error/10 border border-error/20">
                      <div className="card-body p-4">
                        <h3 className="card-title text-error text-sm">{t('common:status.inactive')}</h3>
                        <p className="text-sm">{t('common:status.inactive')}</p>
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
              // Queries will automatically refetch via Convex reactivity
            }}
          />
        )}
      </div>
    </>
  );
}