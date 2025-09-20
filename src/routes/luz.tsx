import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "convex/react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { api } from "@/convex/_generated/api";
import { Calendar, Filter, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/luz")({
  component: LUZPage,
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function LUZPage() {
  const { user, isLoading, isAuthenticated, hasWorkerTag, hasManagerTag } = usePermissionsV2();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [filters, setFilters] = useState({
    shifts: true,
    courses: false,
    rentals: false,
  });

  // Query data
  const shifts = useQuery(api.shifts.getShiftTemplates);
  const shiftsForDate = useQuery(api.shifts.getShiftsForDate, { date: selectedDate });
  const assignmentsForDate = useQuery(api.shift_assignments.getAssignmentsForDate, { date: selectedDate });
  const pendingAssignments = useQuery(api.shift_assignments.getPendingAssignments);

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

  if (!hasWorkerTag) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Worker Access Required</h1>
        <p>The LUZ system is only accessible to staff members with worker permissions.</p>
      </div>
    );
  }

  const toggleFilter = (filterName: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  return (
    <>
      <EnsureUserV2 />
      <div className="max-w-[1600px] mx-auto p-4">
        {/* LUZ Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">LUZ</h1>
            <p className="text-base-content/70">Unified Scheduling Hub</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input input-bordered"
            />
            {hasManagerTag && (
              <button className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Shift
              </button>
            )}
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-base-100 border border-base-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="font-medium">View:</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.shifts}
                onChange={() => toggleFilter('shifts')}
                className="checkbox checkbox-sm"
              />
              <span>Shifts</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.courses}
                onChange={() => toggleFilter('courses')}
                className="checkbox checkbox-sm"
              />
              <span>Education</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.rentals}
                onChange={() => toggleFilter('rentals')}
                className="checkbox checkbox-sm"
              />
              <span>Rentals</span>
            </label>

            <div className="ml-auto">
              <input
                type="text"
                placeholder="Search..."
                className="input input-bordered input-sm"
              />
            </div>
          </div>
        </div>

        {/* Main Content: 70/30 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Overview Section (30%) */}
          <div className="lg:col-span-3">
            <div className="bg-base-100 border border-base-300 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Overview
              </h2>

              {/* Pending Actions */}
              {hasManagerTag && pendingAssignments && pendingAssignments.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3 text-warning">Pending Approvals ({pendingAssignments.length})</h3>
                  <div className="space-y-2">
                    {pendingAssignments.slice(0, 3).map((assignment) => (
                      <div key={assignment._id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{assignment.worker?.name}</div>
                            <div className="text-sm text-base-content/70">{assignment.shift?.name}</div>
                          </div>
                          <div className="flex gap-1">
                            <button className="btn btn-xs btn-success">Approve</button>
                            <button className="btn btn-xs btn-error">Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingAssignments.length > 3 && (
                      <div className="text-center">
                        <button className="btn btn-sm btn-outline">View All ({pendingAssignments.length})</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Assignments Summary */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Today's Schedule</h3>
                {assignmentsForDate && assignmentsForDate.length > 0 ? (
                  <div className="space-y-2">
                    {assignmentsForDate.slice(0, 3).map((assignment) => (
                      <div key={assignment._id} className="p-3 bg-base-200 rounded-lg">
                        <div className="font-medium">{assignment.worker?.name}</div>
                        <div className="text-sm text-base-content/70">
                          {assignment.shift?.name} • {assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}
                        </div>
                        <div className={`badge badge-sm ${
                          assignment.status === 'confirmed' ? 'badge-success' :
                          assignment.status.includes('pending') ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {assignment.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/50 text-sm">No assignments for selected date</p>
                )}
              </div>

              {/* Available Shifts */}
              {filters.shifts && shiftsForDate && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Available Shifts</h3>
                  {shiftsForDate.length > 0 ? (
                    <div className="space-y-2">
                      {shiftsForDate.map((shift) => (
                        <div key={shift._id} className="p-3 bg-info/10 border border-info/20 rounded-lg">
                          <div className="font-medium">{shift.name}</div>
                          <div className="text-sm text-base-content/70 mb-2">
                            {shift.storeHours.openTime} - {shift.storeHours.closeTime}
                          </div>
                          <button className="btn btn-xs btn-primary">
                            Request to Join
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base-content/50 text-sm">No shifts available for this day</p>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-success/10 border border-success/20 rounded">
                  <div className="text-lg font-bold">{assignmentsForDate?.filter(a => a.status === 'confirmed').length || 0}</div>
                  <div className="text-xs">Confirmed</div>
                </div>
                <div className="p-2 bg-warning/10 border border-warning/20 rounded">
                  <div className="text-lg font-bold">{pendingAssignments?.length || 0}</div>
                  <div className="text-xs">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Section (70%) */}
          <div className="lg:col-span-7">
            <div className="bg-base-100 border border-base-300 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Timeline
              </h2>

              {/* Calendar Content */}
              <div className="relative">
                {/* Time Hours Header */}
                <div className="grid grid-cols-12 gap-1 mb-2 text-xs text-center">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 8; // Start from 8 AM
                    return (
                      <div key={hour} className="p-1 border-r border-base-300 last:border-r-0">
                        {hour}:00
                      </div>
                    );
                  })}
                </div>

                {/* Timeline Grid */}
                <div className="relative min-h-[400px]">
                  {/* Hour Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-12 gap-1">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div key={i} className="border-r border-base-300/50 last:border-r-0"></div>
                    ))}
                  </div>

                  {/* Shift Templates Visual */}
                  {filters.shifts && shiftsForDate && shiftsForDate.map((shift, index) => {
                    // Convert time to grid position (simplified)
                    const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                    const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                    const startCol = Math.max(0, startHour - 8) + 1; // Grid starts at 8 AM
                    const span = Math.min(12 - startCol + 1, endHour - startHour);

                    return (
                      <div
                        key={shift._id}
                        className={`absolute bg-primary/20 border-2 border-primary rounded p-2 h-16`}
                        style={{
                          left: `${((startCol - 1) / 12) * 100}%`,
                          width: `${(span / 12) * 100}%`,
                          top: `${index * 80}px`,
                        }}
                      >
                        <div className="font-medium text-sm">{shift.name}</div>
                        <div className="text-xs text-base-content/70">
                          {shift.hourlyRequirements.reduce((sum, req) => sum + req.minWorkers, 0)} workers needed
                        </div>
                      </div>
                    );
                  })}

                  {/* Assignments Overlay */}
                  {assignmentsForDate && assignmentsForDate.map((assignment, index) => {
                    const startHour = parseInt(assignment.assignedHours[0]?.startTime.split(':')[0] || '9');
                    const endHour = parseInt(assignment.assignedHours[0]?.endTime.split(':')[0] || '17');
                    const startCol = Math.max(0, startHour - 8) + 1;
                    const span = Math.min(12 - startCol + 1, endHour - startHour);

                    return (
                      <div
                        key={assignment._id}
                        className={`absolute bg-success/30 border border-success rounded p-1 h-12`}
                        style={{
                          left: `${((startCol - 1) / 12) * 100}%`,
                          width: `${(span / 12) * 100}%`,
                          top: `${200 + index * 50}px`,
                        }}
                      >
                        <div className="text-xs font-medium">{assignment.worker?.name}</div>
                        <div className="text-xs">{assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}</div>
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {(!shiftsForDate || shiftsForDate.length === 0) && (
                    <div className="flex items-center justify-center h-full text-base-content/50">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No shifts scheduled for {selectedDate}</p>
                        {hasManagerTag && (
                          <button className="btn btn-sm btn-primary mt-2">
                            Create First Shift
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}