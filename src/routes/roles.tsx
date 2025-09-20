import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { Users, Shield, UserPlus, Settings } from "lucide-react";

export const Route = createFileRoute("/roles")({
  component: RolesPage,
});

function RolesPage() {
  const { checkPermission, isLoading, isAuthenticated } = usePermissionsV2();
  const [viewMode, setViewMode] = useState<'staff' | 'customers'>('staff');

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

  return (
    <>
      <EnsureUserV2 />
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Role Management</h1>
              <p className="text-base-content/70">Manage user roles and permissions</p>
            </div>
          </div>
          <button className="btn btn-primary">
            <UserPlus className="w-4 h-4" />
            {viewMode === 'staff' ? 'Add Staff Member' : 'Promote to Staff'}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${viewMode === 'staff' ? 'tab-active' : ''}`}
              onClick={() => setViewMode('staff')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Staff Management
            </button>
            <button
              className={`tab ${viewMode === 'customers' ? 'tab-active' : ''}`}
              onClick={() => setViewMode('customers')}
            >
              <Users className="w-4 h-4 mr-2" />
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
                <div className="stat-value text-primary">0</div>
                <div className="stat-desc">Active members</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">Managers</div>
                <div className="stat-value text-success">0</div>
                <div className="stat-desc">With manager tag</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Workers</div>
                <div className="stat-value text-info">0</div>
                <div className="stat-desc">With worker tag</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">Instructors</div>
                <div className="stat-value text-warning">0</div>
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
                <div className="stat-value text-primary">0</div>
                <div className="stat-desc">Registered users</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-success">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="stat-title">Rental Approved</div>
                <div className="stat-value text-success">0</div>
                <div className="stat-desc">Can rent tools</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-info">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title">Active</div>
                <div className="stat-value text-info">0</div>
                <div className="stat-desc">Last 30 days</div>
              </div>

              <div className="stat bg-base-100 rounded-lg border border-base-300">
                <div className="stat-figure text-warning">
                  <Settings className="w-8 h-8" />
                </div>
                <div className="stat-title">Pending</div>
                <div className="stat-value text-warning">0</div>
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
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search staff members..."
                    className="input input-bordered flex-1"
                  />
                  <select className="select select-bordered">
                    <option value="">All Roles</option>
                    <option value="manager">Managers</option>
                    <option value="worker">Workers</option>
                    <option value="instructor">Instructors</option>
                    <option value="toolHandler">Tool Handlers</option>
                  </select>
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
                      {/* Empty state - will be populated with real data */}
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-base-content/60">
                          No staff members found. Staff data will be loaded from the backend.
                        </td>
                      </tr>
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
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Search customers..."
                        className="input input-bordered flex-1"
                      />
                      <select className="select select-bordered">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="rental_approved">Rental Approved</option>
                        <option value="pending">Pending Approval</option>
                        <option value="inactive">Inactive</option>
                      </select>
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
                          {/* Empty state - will be populated with real data */}
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-base-content/60">
                              No customers found. Customer data will be loaded from the backend.
                            </td>
                          </tr>
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
      </div>
    </>
  );
}