import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { LUZOverview } from "@/components/LUZOverview";
import { LUZVerticalTimeline } from "@/components/LUZVerticalTimeline";
import { LUZHorizontalTimeline } from "@/components/LUZHorizontalTimeline";
import { Calendar, Filter, Plus, Nut } from "lucide-react";

export const Route = createFileRoute("/luz")({
  component: LUZPage,
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Calculate staffing status for a shift
const getShiftStaffingStatus = (shift: any, assignedWorkers: any[]) => {
  // Use maximum concurrent workers needed rather than sum of all hours
  const minWorkers = Math.max(...shift.hourlyRequirements.map((req: any) => req.minWorkers));
  const currentWorkers = assignedWorkers.filter(worker => worker.status === 'confirmed').length;

  if (currentWorkers < minWorkers) {
    return { status: 'understaffed', currentWorkers, minWorkers, severity: 'error' };
  } else if (currentWorkers === minWorkers) {
    return { status: 'staffed', currentWorkers, minWorkers, severity: 'success' };
  } else {
    return { status: 'overstaffed', currentWorkers, minWorkers, severity: 'warning' };
  }
};

// Empty data arrays - ready for backend integration
const mockShifts: any[] = [];
const mockAssignments: any[] = [];
const mockPendingAssignments: any[] = [];
const mockCourses: any[] = [];

function LUZPage() {
  const { user, isLoading, isAuthenticated, hasWorkerTag, hasManagerTag } = usePermissionsV2();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [timelineView, setTimelineView] = useState<'vertical' | 'horizontal'>('vertical');
  const [filters, setFilters] = useState({
    shifts: true,
    courses: false,
    rentals: false,
  });

  // Data arrays - ready for backend integration
  const shifts = mockShifts;
  const shiftsForDate = filters.shifts ? mockShifts : [];
  const assignmentsForDate = mockAssignments;
  const pendingAssignments = mockPendingAssignments;
  const coursesForDate = filters.courses ? mockCourses : [];

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
          <div className="flex items-start gap-2">
            <Nut className="w-6 h-6 text-amber-600 mt-1" />
            <div>
              <h1 className="text-3xl font-bold">LUZ</h1>
              <p className="text-base-content/70">Unified Scheduling Hub</p>
            </div>
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

        {/* Timeline View Tabs */}
        <div className="mb-6">
          <div className="tabs tabs-bordered">
            <button
              className={`tab ${timelineView === 'vertical' ? 'tab-active' : ''}`}
              onClick={() => setTimelineView('vertical')}
            >
              <span className="mr-2">|</span>
              Vertical View
            </button>
            <button
              className={`tab ${timelineView === 'horizontal' ? 'tab-active' : ''}`}
              onClick={() => setTimelineView('horizontal')}
            >
              <span className="mr-2">—</span>
              Horizontal View
            </button>
          </div>
        </div>

        {/* Main Content: 70/30 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Overview Section (30%) - Identical in both views */}
          <div className="lg:col-span-3">
            <LUZOverview
              assignmentsForDate={assignmentsForDate}
              shiftsForDate={shiftsForDate}
              pendingAssignments={pendingAssignments}
              filters={filters}
              hasManagerTag={hasManagerTag}
            />
          </div>

          {/* Timeline Section (70%) - Changes based on tab */}
          <div className="lg:col-span-7">
            {timelineView === 'vertical' ? (
              <LUZVerticalTimeline
                assignmentsForDate={assignmentsForDate}
                shiftsForDate={shiftsForDate}
                coursesForDate={coursesForDate}
                selectedDate={selectedDate}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
              />
            ) : (
              <LUZHorizontalTimeline
                assignmentsForDate={assignmentsForDate}
                shiftsForDate={shiftsForDate}
                coursesForDate={coursesForDate}
                selectedDate={selectedDate}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}