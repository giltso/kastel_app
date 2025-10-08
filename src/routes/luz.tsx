import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { EnsureUserV2 } from "@/components/EnsureUserV2";
import { LUZOverview } from "@/components/LUZOverview";
import { LUZVerticalTimeline } from "@/components/LUZVerticalTimeline";
import { LUZWeekView } from "@/components/LUZWeekView";
import { LUZMonthView } from "@/components/LUZMonthView";
import { ShiftDetailsModal } from "@/components/modals/ShiftDetailsModal";
import { CreateEditShiftModal } from "@/components/modals/CreateEditShiftModal";
import { RequestJoinShiftModal } from "@/components/modals/RequestJoinShiftModal";
import { AssignWorkerModal } from "@/components/modals/AssignWorkerModal";
import { EditAssignmentModal } from "@/components/modals/EditAssignmentModal";
import { ReviewRequestModal } from "@/components/modals/ReviewRequestModal";
import { ApproveAssignmentModal } from "@/components/modals/ApproveAssignmentModal";
import { Calendar, Filter, Plus, Nut, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/luz")({
  component: LUZPage,
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Generate week dates (Monday to Sunday) for a given date
const getWeekDates = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const monday = new Date(date);

  // Calculate days to subtract to get to Monday (1)
  // If it's Sunday (0), we need to go back 6 days, otherwise go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(date.getDate() - daysToSubtract);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    weekDates.push(currentDate.toISOString().split('T')[0]);
  }

  return weekDates;
};

// Generate month dates for calendar grid (42 days including surrounding weeks)
const getMonthDates = (dateString: string) => {
  // Parse date components to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);

  // First day of the month in UTC
  const firstDay = new Date(Date.UTC(year, month - 1, 1));

  // Calculate start of calendar grid (Sunday of first week)
  const dayOfWeek = firstDay.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const startDate = new Date(Date.UTC(year, month - 1, 1 - dayOfWeek));

  // Generate 42 days (6 weeks) to cover the entire month view
  const monthDates = [];
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + i);
    monthDates.push(currentDate.toISOString().split('T')[0]);
  }

  return monthDates;
};

// Calculate staffing status for a shift
const getShiftStaffingStatus = (shift: any, assignedWorkers: any[]) => {
  // Expand range-based requirements into individual hours for status calculation
  const hourlyStatuses: any[] = [];

  shift.hourlyRequirements.forEach((req: any) => {
    const reqStart = parseInt(req.startTime.split(':')[0]);
    const reqEnd = parseInt(req.endTime.split(':')[0]);

    // Generate status for each hour in the range
    for (let hourNum = reqStart; hourNum < reqEnd; hourNum++) {
      const requiredHour = `${hourNum.toString().padStart(2, '0')}:00`;
      const minWorkers = req.minWorkers;
      const optimalWorkers = req.optimalWorkers;

      // Count time slots that cover this specific hour from confirmed assignments
      // Each time slot that covers this hour contributes 1 unit of capacity
      const workersAtHour = assignedWorkers
        .filter(worker => worker.status === 'confirmed')
        .reduce((totalCapacity, worker) => {
          // Count how many of this worker's time slots cover this hour
          const slotsForThisHour = worker.assignedHours?.filter((timeSlot: any) => {
            const slotStart = timeSlot.startTime; // e.g., "09:00"
            const slotEnd = timeSlot.endTime; // e.g., "17:00"

            // Parse hours for comparison
            const startHourNum = parseInt(slotStart.split(':')[0]);
            const endHourNum = parseInt(slotEnd.split(':')[0]);

            // Time slot contributes if the required hour is within this time slot
            return hourNum >= startHourNum && hourNum < endHourNum;
          }) || [];

          // Each time slot that covers this hour adds to capacity
          return totalCapacity + slotsForThisHour.length;
        }, 0);

      // Determine status for this hour
      if (workersAtHour < minWorkers) {
        hourlyStatuses.push({ hour: requiredHour, status: 'understaffed', workers: workersAtHour, min: minWorkers, optimal: optimalWorkers });
      } else if (workersAtHour <= optimalWorkers) {
        hourlyStatuses.push({ hour: requiredHour, status: 'staffed', workers: workersAtHour, min: minWorkers, optimal: optimalWorkers });
      } else {
        hourlyStatuses.push({ hour: requiredHour, status: 'overstaffed', workers: workersAtHour, min: minWorkers, optimal: optimalWorkers });
      }
    }
  });

  // Apply pessimistic logic: worst status across all hours
  const hasUnderstaffed = hourlyStatuses.some(h => h.status === 'understaffed');
  const hasOverstaffed = hourlyStatuses.some(h => h.status === 'overstaffed');

  let overallStatus: string;
  if (hasUnderstaffed) {
    overallStatus = 'understaffed';
  } else if (hasOverstaffed) {
    overallStatus = 'overstaffed';
  } else {
    overallStatus = 'staffed';
  }

  // Return summary with total workers and min workers for display
  const totalCurrentWorkers = assignedWorkers.filter(w => w.status === 'confirmed').length;
  const totalMinWorkers = Math.max(...shift.hourlyRequirements.map((req: any) => req.minWorkers));

  return {
    status: overallStatus,
    currentWorkers: totalCurrentWorkers,
    minWorkers: totalMinWorkers,
    severity: overallStatus === 'understaffed' ? 'error' : overallStatus === 'overstaffed' ? 'warning' : 'success',
    hourlyBreakdown: hourlyStatuses
  };
};

function LUZPage() {
  const { user, isLoading, isAuthenticated, isStaff, hasWorkerTag, hasManagerTag } = usePermissionsV2();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [timelineView, setTimelineView] = useState<'vertical' | 'week' | 'month'>('vertical');
  const [filters, setFilters] = useState({
    shifts: true,
    courses: false,
    rentals: false,
  });

  // Modal state management
  const [modals, setModals] = useState({
    shiftDetails: { isOpen: false, shiftId: null as Id<"shifts"> | null },
    createEditShift: { isOpen: false, shiftId: null as Id<"shifts"> | null },
    requestJoin: { isOpen: false, shiftId: null as Id<"shifts"> | null, date: "" },
    assignWorker: { isOpen: false, shiftId: null as Id<"shifts"> | null, date: "" },
    editAssignment: { isOpen: false, assignmentId: null as Id<"shift_assignments"> | null },
    reviewRequests: { isOpen: false, shiftId: null as Id<"shifts"> | null },
    approveAssignment: { isOpen: false, assignmentId: null as Id<"shift_assignments"> | null },
    datePicker: { isOpen: false },
  });

  // Real data queries
  const shiftsForDate = useQuery(
    (filters.shifts ? api.shifts.getShiftsForDate : "skip") as any,
    filters.shifts ? { date: selectedDate } : "skip"
  ) || [];

  // Real data queries for assignments
  const assignmentsForDate = useQuery(api.shift_assignments.getAssignmentsForDate, { date: selectedDate }) || [];

  // Direct assignment approval/rejection mutations
  const approveAssignment = useMutation(api.shift_assignments.approveAssignment);
  const rejectAssignment = useMutation(api.shift_assignments.rejectAssignment);

  // Week view queries (conditional to avoid unnecessary queries)
  const weekDates = getWeekDates(selectedDate);
  const weekAssignmentQueries = weekDates.map(date => {
    const shouldQuery = timelineView === 'week';
    return {
      date,
      assignments: useQuery((shouldQuery ? api.shift_assignments.getAssignmentsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const weekShiftQueries = weekDates.map(date => {
    const shouldQuery = timelineView === 'week' && filters.shifts;
    return {
      date,
      shifts: useQuery((shouldQuery ? api.shifts.getShiftsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const weekCourseQueries = weekDates.map(date => {
    const shouldQuery = timelineView === 'week' && filters.courses;
    return {
      date,
      courses: useQuery((shouldQuery ? api.courses_v2.getCoursesForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const weekRentalQueries = weekDates.map(date => {
    const shouldQuery = timelineView === 'week' && filters.rentals;
    return {
      date,
      rentals: useQuery((shouldQuery ? api.tools.getToolRentalsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });

  // Month view queries (conditional to avoid unnecessary queries)
  const monthDates = getMonthDates(selectedDate);
  const monthAssignmentQueries = monthDates.map(date => {
    const shouldQuery = timelineView === 'month';
    return {
      date,
      assignments: useQuery((shouldQuery ? api.shift_assignments.getAssignmentsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const monthShiftQueries = monthDates.map(date => {
    const shouldQuery = timelineView === 'month' && filters.shifts;
    return {
      date,
      shifts: useQuery((shouldQuery ? api.shifts.getShiftsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const monthCourseQueries = monthDates.map(date => {
    const shouldQuery = timelineView === 'month' && filters.courses;
    return {
      date,
      courses: useQuery((shouldQuery ? api.courses_v2.getCoursesForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const monthRentalQueries = monthDates.map(date => {
    const shouldQuery = timelineView === 'month' && filters.rentals;
    return {
      date,
      rentals: useQuery((shouldQuery ? api.tools.getToolRentalsForDate : "skip") as any, shouldQuery ? { date } : "skip") || []
    };
  });
  const pendingAssignments = useQuery(api.shift_assignments.getPendingAssignments) || [];

  // Day view course query
  const coursesForDate: any[] = useQuery((filters.courses ? api.courses_v2.getCoursesForDate : "skip") as any, filters.courses ? { date: selectedDate } : "skip") || [];

  // Day view rental query
  const rentalsForDate: any[] = useQuery((filters.rentals ? api.tools.getToolRentalsForDate : "skip") as any, filters.rentals ? { date: selectedDate } : "skip") || [];

  // Week view data preparation
  const shiftsForWeek: { [date: string]: any[] } = {};
  const coursesForWeek: { [date: string]: any[] } = {};
  const rentalsForWeek: { [date: string]: any[] } = {};
  const assignmentsForWeek: { [date: string]: any[] } = {};

  // For week view, organize data by date
  if (timelineView === 'week') {
    weekDates.forEach(date => {
      // Use the queried shifts for each date
      const dayShifts = weekShiftQueries.find(q => q.date === date);
      shiftsForWeek[date] = dayShifts ? dayShifts.shifts : [];
      // Use the queried courses for each date
      const dayCourses = weekCourseQueries.find(q => q.date === date);
      coursesForWeek[date] = dayCourses ? dayCourses.courses : [];
      // Use the queried rentals for each date
      const dayRentals = weekRentalQueries.find(q => q.date === date);
      rentalsForWeek[date] = dayRentals ? dayRentals.rentals : [];
      // Use the queried assignments for each date
      const dayAssignments = weekAssignmentQueries.find(q => q.date === date);
      assignmentsForWeek[date] = dayAssignments ? dayAssignments.assignments : [];
    });
  }

  // Month view data preparation
  const monthData: { [date: string]: { shifts: any[]; courses: any[]; rentals: any[]; assignments: any[] } } = {};

  // For month view, organize data by date
  if (timelineView === 'month') {
    monthDates.forEach(date => {
      const dayShifts = monthShiftQueries.find(q => q.date === date);
      const dayCourses = monthCourseQueries.find(q => q.date === date);
      const dayRentals = monthRentalQueries.find(q => q.date === date);
      const dayAssignments = monthAssignmentQueries.find(q => q.date === date);
      monthData[date] = {
        shifts: dayShifts ? dayShifts.shifts : [],
        courses: dayCourses ? dayCourses.courses : [],
        rentals: dayRentals ? dayRentals.rentals : [],
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

  if (!isStaff) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Staff Access Required</h1>
        <p>The LUZ system is only accessible to staff members.</p>
      </div>
    );
  }

  const toggleFilter = (filterName: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  // Date navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    // Parse date in UTC to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(Date.UTC(year, month - 1, day));

    if (timelineView === 'vertical') {
      // Daily view: navigate by 1 day
      currentDate.setUTCDate(currentDate.getUTCDate() + (direction === 'next' ? 1 : -1));
    } else if (timelineView === 'week') {
      // Week view: navigate by 7 days
      currentDate.setUTCDate(currentDate.getUTCDate() + (direction === 'next' ? 7 : -7));
    } else {
      // Month view: navigate by 1 month
      currentDate.setUTCMonth(currentDate.getUTCMonth() + (direction === 'next' ? 1 : -1));
    }

    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  // Modal handlers
  const openModal = (modalName: keyof typeof modals, data: any = {}) => {
    setModals(prev => ({
      ...prev,
      [modalName]: { ...prev[modalName], isOpen: true, ...data }
    }));
  };

  const closeModal = (modalName: keyof typeof modals) => {
    setModals(prev => ({
      ...prev,
      [modalName]: { ...prev[modalName], isOpen: false }
    }));
  };

  const handleModalSuccess = () => {
    // Refresh data or perform any needed actions after successful modal operations
    console.log("Modal operation successful");
  };

  // Direct assignment handlers for overview
  const handleDirectApprove = async (assignmentId: Id<"shift_assignments">) => {
    try {
      await approveAssignment({ assignmentId });
      console.log("Assignment approved successfully");
    } catch (error) {
      console.error("Failed to approve assignment:", error);
    }
  };

  const handleDirectReject = async (assignmentId: Id<"shift_assignments">) => {
    try {
      await rejectAssignment({ assignmentId });
      console.log("Assignment rejected successfully");
    } catch (error) {
      console.error("Failed to reject assignment:", error);
    }
  };

  // Shift click handler - opens shift details modal
  const handleShiftClick = (shiftId: string, date?: string) => {
    console.log("Shift clicked:", shiftId, "for date:", date || selectedDate);
    // If a specific date is provided (e.g., from week/month view), update selectedDate
    if (date && date !== selectedDate) {
      setSelectedDate(date);
    }
    openModal('shiftDetails', { shiftId });
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
            {hasManagerTag && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openModal('createEditShift')}
              >
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
        <div className="mb-6 flex items-center justify-between">
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

          {/* Date Navigation */}
          <div className="join">
            <button
              className="btn btn-sm join-item"
              onClick={() => navigateDate('prev')}
              title={timelineView === 'vertical' ? 'Previous Day' : timelineView === 'week' ? 'Previous Week' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={() => {
                // If current date is today, open date picker; otherwise, jump to today
                if (selectedDate === getTodayString()) {
                  openModal('datePicker', {});
                } else {
                  setSelectedDate(getTodayString());
                }
              }}
              title={selectedDate === getTodayString() ? "Pick a date" : "Jump to Today"}
            >
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={() => navigateDate('next')}
              title={timelineView === 'vertical' ? 'Next Day' : timelineView === 'week' ? 'Next Week' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
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
              onReviewRequests={() => openModal('reviewRequests')}
              onApproveAssignment={handleDirectApprove as any}
              onRejectAssignment={handleDirectReject as any}
              onRequestJoin={(shiftId, date) => openModal('requestJoin', { shiftId, date })}
              onAssignWorker={(shiftId, date) => openModal('assignWorker', { shiftId, date })}
              onEditAssignment={(assignmentId) => openModal('editAssignment', { assignmentId })}
            />
          </div>

          {/* Timeline Section (70%) - Changes based on tab */}
          <div className="lg:col-span-7">
            {timelineView === 'vertical' ? (
              <LUZVerticalTimeline
                assignmentsForDate={assignmentsForDate}
                shiftsForDate={shiftsForDate}
                coursesForDate={coursesForDate}
                rentalsForDate={rentalsForDate}
                selectedDate={selectedDate}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
                onShiftClick={handleShiftClick}
                onRequestJoin={(shiftId, date) => openModal('requestJoin', { shiftId, date })}
              />
            ) : timelineView === 'week' ? (
              <LUZWeekView
                weekDates={weekDates}
                shiftsForWeek={shiftsForWeek}
                coursesForWeek={coursesForWeek}
                rentalsForWeek={rentalsForWeek}
                assignmentsForWeek={assignmentsForWeek}
                hasManagerTag={hasManagerTag}
                getShiftStaffingStatus={getShiftStaffingStatus}
                onShiftClick={handleShiftClick}
                onRequestJoin={(shiftId, date) => openModal('requestJoin', { shiftId, date })}
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

      {/* Modal Components */}
      <ShiftDetailsModal
        shiftId={modals.shiftDetails.shiftId}
        selectedDate={selectedDate}
        isOpen={modals.shiftDetails.isOpen}
        onClose={() => closeModal('shiftDetails')}
        onEditShift={(shiftId) => {
          closeModal('shiftDetails');
          openModal('createEditShift', { shiftId });
        }}
        onAssignWorker={(shiftId, date) => {
          closeModal('shiftDetails');
          openModal('assignWorker', { shiftId, date });
        }}
        onRequestJoin={(shiftId, date) => {
          closeModal('shiftDetails');
          openModal('requestJoin', { shiftId, date });
        }}
        onEditAssignment={(assignmentId) => {
          closeModal('shiftDetails');
          openModal('editAssignment', { assignmentId });
        }}
        onApproveAssignment={(assignmentId) => {
          closeModal('shiftDetails');
          openModal('approveAssignment', { assignmentId });
        }}
        onReviewRequests={(shiftId) => {
          closeModal('shiftDetails');
          openModal('reviewRequests', { shiftId });
        }}
      />

      <CreateEditShiftModal
        shiftId={modals.createEditShift.shiftId}
        isOpen={modals.createEditShift.isOpen}
        onClose={() => closeModal('createEditShift')}
        onSuccess={handleModalSuccess}
      />

      <RequestJoinShiftModal
        shiftId={modals.requestJoin.shiftId}
        selectedDate={modals.requestJoin.date || selectedDate}
        isOpen={modals.requestJoin.isOpen}
        onClose={() => closeModal('requestJoin')}
        onSuccess={handleModalSuccess}
      />

      <AssignWorkerModal
        shiftId={modals.assignWorker.shiftId}
        selectedDate={modals.assignWorker.date || selectedDate}
        isOpen={modals.assignWorker.isOpen}
        onClose={() => closeModal('assignWorker')}
        onSuccess={handleModalSuccess}
      />

      <EditAssignmentModal
        assignmentId={modals.editAssignment.assignmentId}
        isOpen={modals.editAssignment.isOpen}
        onClose={() => closeModal('editAssignment')}
        onSuccess={handleModalSuccess}
      />

      <ReviewRequestModal
        shiftId={modals.reviewRequests.shiftId}
        isOpen={modals.reviewRequests.isOpen}
        onClose={() => closeModal('reviewRequests')}
        onSuccess={handleModalSuccess}
      />

      <ApproveAssignmentModal
        assignmentId={modals.approveAssignment.assignmentId}
        isOpen={modals.approveAssignment.isOpen}
        onClose={() => closeModal('approveAssignment')}
        onSuccess={handleModalSuccess}
      />

      {/* Date Picker Modal */}
      {modals.datePicker.isOpen && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Select Date</h3>
            <input
              type="date"
              className="input input-bordered w-full"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                closeModal('datePicker');
              }}
              autoFocus
            />
            <div className="modal-action">
              <button className="btn" onClick={() => closeModal('datePicker')}>Cancel</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => closeModal('datePicker')}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}