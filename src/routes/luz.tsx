import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { LUZOverview } from "@/components/LUZOverview";
import { LUZVerticalTimeline } from "@/components/LUZVerticalTimeline";
import { LUZWeekView } from "@/components/LUZWeekView";
import { LUZMonthView } from "@/components/LUZMonthView";
import { Calendar, Filter, Plus, Nut } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/luz")({
  component: LUZPage,
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Generate week dates (Sunday to Saturday) for a given date
const getWeekDates = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const sunday = new Date(date);

  // Calculate days to subtract to get to Sunday (0)
  sunday.setDate(date.getDate() - dayOfWeek);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(sunday);
    currentDate.setDate(sunday.getDate() + i);
    weekDates.push(currentDate.toISOString().split('T')[0]);
  }

  return weekDates;
};

// Generate month dates for calendar grid (42 days including surrounding weeks)
const getMonthDates = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);

  // Calculate start of calendar grid (Sunday of first week)
  const startDate = new Date(firstDay);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // For Sunday-based weeks, subtract the day of week directly
  startDate.setDate(firstDay.getDate() - dayOfWeek);

  // Generate 42 days (6 weeks) to cover the entire month view
  const monthDates = [];
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    monthDates.push(currentDate.toISOString().split('T')[0]);
  }

  return monthDates;
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

function LUZPage() {
  const { user, isLoading, isAuthenticated, hasWorkerTag, hasManagerTag } = usePermissionsV2();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [timelineView, setTimelineView] = useState<'vertical' | 'week' | 'month'>('vertical');
  const [filters, setFilters] = useState({
    shifts: true,
    courses: false,
    rentals: false,
  });

  // Real data queries
  const shifts = useQuery(api.shifts.getShiftTemplates) || [];
  const createSampleShifts = useMutation(api.shifts.createSampleShifts);

  // Real data queries for assignments
  const assignmentsForDate = useQuery(api.shift_assignments.getAssignmentsForDate, { date: selectedDate }) || [];

  // Week view assignments queries (conditional to avoid unnecessary queries)
  const weekDates = getWeekDates(selectedDate);
  const weekAssignmentQueries = weekDates.map(date => {
    const shouldQuery = timelineView === 'week';
    return {
      date,
      assignments: useQuery(shouldQuery ? api.shift_assignments.getAssignmentsForDate : "skip", shouldQuery ? { date } : "skip") || []
    };
  });

  // Month view assignments queries (conditional to avoid unnecessary queries)
  const monthDates = getMonthDates(selectedDate);
  const monthAssignmentQueries = monthDates.map(date => {
    const shouldQuery = timelineView === 'month';
    return {
      date,
      assignments: useQuery(shouldQuery ? api.shift_assignments.getAssignmentsForDate : "skip", shouldQuery ? { date } : "skip") || []
    };
  });
  const pendingAssignments = useQuery(api.shift_assignments.getPendingAssignments) || [];

  // Data arrays filtered by date and filters
  const shiftsForDate = filters.shifts ? shifts : [];
  const coursesForDate: any[] = filters.courses ? [] : []; // TODO: Connect to courses query

  // Week view data preparation
  const shiftsForWeek: { [date: string]: any[] } = {};
  const coursesForWeek: { [date: string]: any[] } = {};
  const assignmentsForWeek: { [date: string]: any[] } = {};

  // For week view, organize data by date
  if (timelineView === 'week') {
    weekDates.forEach(date => {
      shiftsForWeek[date] = filters.shifts ? shifts : [];
      coursesForWeek[date] = filters.courses ? [] : []; // TODO: Connect to courses query
      // Use the queried assignments for each date
      const dayAssignments = weekAssignmentQueries.find(q => q.date === date);
      assignmentsForWeek[date] = dayAssignments ? dayAssignments.assignments : [];
    });
  }

  // Month view data preparation
  const monthData: { [date: string]: { shifts: any[]; courses: any[]; assignments: any[] } } = {};

  // For month view, organize data by date
  if (timelineView === 'month') {
    monthDates.forEach(date => {
      const dayAssignments = monthAssignmentQueries.find(q => q.date === date);
      monthData[date] = {
        shifts: filters.shifts ? shifts : [],
        courses: filters.courses ? [] : [], // TODO: Connect to courses query
        assignments: dayAssignments ? dayAssignments.assignments : []
      };
    });
  }

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

  const handleCreateSampleShifts = async () => {
    try {
      const result = await createSampleShifts({});
      console.log("Sample shifts created:", result);
    } catch (error) {
      console.error("Error creating sample shifts:", error);
    }
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
            {shifts.length === 0 && hasManagerTag && (
              <button className="btn btn-secondary" onClick={handleCreateSampleShifts}>
                🔧 Create Sample Data
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
              Daily View
            </button>
            <button
              className={`tab ${timelineView === 'week' ? 'tab-active' : ''}`}
              onClick={() => setTimelineView('week')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Week View
            </button>
            <button
              className={`tab ${timelineView === 'month' ? 'tab-active' : ''}`}
              onClick={() => setTimelineView('month')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Month View
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
            ) : timelineView === 'week' ? (
              <LUZWeekView
                weekDates={weekDates}
                shiftsForWeek={shiftsForWeek}
                coursesForWeek={coursesForWeek}
                assignmentsForWeek={assignmentsForWeek}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
              />
            ) : (
              <LUZMonthView
                selectedDate={selectedDate}
                monthData={monthData}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
                onDateClick={(date) => setSelectedDate(date)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}