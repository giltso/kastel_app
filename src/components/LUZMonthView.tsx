import { Calendar } from "lucide-react";

/**
 * LUZ Month View Component
 *
 * ARCHITECTURE:
 * - Calendar-style monthly grid layout (6 weeks x 7 days = 42 day cells)
 * - Event summary indicators rather than detailed event positioning
 * - Color-coded day cells based on staffing status and event density
 * - Click navigation to individual days for detailed view
 *
 * POSITIONING LOGIC:
 * - Day cells: Fixed grid positions (6 rows x 7 columns)
 * - Event indicators: Summary counts and status badges per day
 * - Staffing visualization: Color coding for understaffed/staffed/overstaffed days
 * - Compact design: Focus on overview rather than detail
 *
 * SEARCH KEYWORDS: month view, monthly calendar, calendar grid, event summary,
 * staffing overview, day navigation, monthly timeline, summary indicators
 */

interface LUZMonthViewProps {
  selectedDate: string; // YYYY-MM-DD format
  monthData: { [date: string]: {
    shifts: any[];
    courses: any[];
    rentals: any[];
    assignments: any[];
  } };
  hasManagerTag: boolean;
  getShiftStaffingStatus: (shift: any, assignedWorkers: any[]) => any;
  onDateClick?: (date: string) => void;
}

export function LUZMonthView({
  selectedDate,
  monthData,
  hasManagerTag,
  getShiftStaffingStatus,
  onDateClick
}: LUZMonthViewProps) {
  // Generate calendar grid for the month
  const generateMonthGrid = (dateString: string) => {
    // Parse date components to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);

    // First day of the month in UTC
    const firstDay = new Date(Date.UTC(year, month - 1, 1));

    // Calculate start of calendar grid (Sunday of first week)
    const dayOfWeek = firstDay.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const startDate = new Date(Date.UTC(year, month - 1, 1 - dayOfWeek));

    // Generate 42 days (6 weeks)
    const days = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + i);
      const currentDateString = currentDate.toISOString().split('T')[0];
      const isCurrentMonth = currentDate.getUTCMonth() === month - 1;
      const isToday = currentDateString === today;
      const isSelected = currentDateString === selectedDate;

      days.push({
        date: currentDateString,
        dayNumber: currentDate.getUTCDate(),
        isCurrentMonth,
        isToday,
        isSelected
      });
    }

    return days;
  };

  const monthGrid = generateMonthGrid(selectedDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get month name for header
  const monthName = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Calculate day status and metrics
  const getDayStatus = (date: string) => {
    const dayData = monthData[date];
    if (!dayData) return { status: 'no-data', shiftsCount: 0, coursesCount: 0, rentalsCount: 0, assignmentsCount: 0 };

    const { shifts, courses, rentals, assignments } = dayData;

    // Calculate staffing status for the day
    let understaffedCount = 0;
    let staffedCount = 0;
    let overstaffedCount = 0;

    shifts.forEach(shift => {
      const shiftWorkers = assignments.filter(assignment =>
        assignment.shiftTemplateId === shift._id
      );
      const staffingStatus = getShiftStaffingStatus(shift, shiftWorkers);

      if (staffingStatus.status === 'understaffed') understaffedCount++;
      else if (staffingStatus.status === 'staffed') staffedCount++;
      else if (staffingStatus.status === 'overstaffed') overstaffedCount++;
    });

    // Determine overall day status
    let status = 'no-events';
    if (shifts.length > 0) {
      if (understaffedCount > 0) status = 'understaffed';
      else if (overstaffedCount > 0) status = 'overstaffed';
      else status = 'staffed';
    }

    return {
      status,
      shiftsCount: shifts.length,
      coursesCount: courses.length,
      rentalsCount: rentals.length,
      assignmentsCount: assignments.filter(a => a.status === 'confirmed').length,
      understaffedCount,
      staffedCount,
      overstaffedCount
    };
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        {monthName}
      </h2>

      {/* Month Calendar Grid */}
      <div className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
        {/* Header Row with Day Names */}
        <div className="grid grid-cols-7 bg-base-200">
          {dayNames.map(dayName => (
            <div key={dayName} className="p-2 text-center text-xs font-medium border-r border-base-300 last:border-r-0">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {monthGrid.map(day => {
            const dayStatus = getDayStatus(day.date);

            // Day cell styling based on status and month
            const dayClasses = [
              'aspect-square border-r border-b border-base-300 last:border-r-0 p-1 cursor-pointer transition-colors',
              'hover:bg-base-200 relative text-xs',
              day.isCurrentMonth ? 'bg-base-100' : 'bg-base-200/50 text-base-content/50',
              day.isToday ? 'ring-2 ring-primary' : '',
              day.isSelected ? 'bg-primary/20' : '',
              dayStatus.status === 'understaffed' ? 'bg-error/10' :
              dayStatus.status === 'overstaffed' ? 'bg-warning/10' :
              dayStatus.status === 'staffed' ? 'bg-success/10' : ''
            ].join(' ');

            return (
              <div
                key={day.date}
                className={dayClasses}
                onClick={() => onDateClick?.(day.date)}
              >
                {/* Day Number */}
                <div className={`font-medium ${day.isToday ? 'text-primary' : ''}`}>
                  {day.dayNumber}
                </div>

                {/* Event Indicators */}
                {day.isCurrentMonth && dayStatus.shiftsCount > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 space-y-1">
                    {/* Shifts indicator */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        {dayStatus.shiftsCount} shifts
                      </div>
                      {dayStatus.understaffedCount > 0 && (
                        <div className="w-2 h-2 bg-error rounded-full"></div>
                      )}
                      {dayStatus.understaffedCount === 0 && dayStatus.overstaffedCount > 0 && (
                        <div className="w-2 h-2 bg-warning rounded-full"></div>
                      )}
                      {dayStatus.understaffedCount === 0 && dayStatus.overstaffedCount === 0 && dayStatus.staffedCount > 0 && (
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                      )}
                    </div>

                    {/* Assignments indicator */}
                    {dayStatus.assignmentsCount > 0 && (
                      <div className="text-xs text-base-content/70">
                        {dayStatus.assignmentsCount} assigned
                      </div>
                    )}

                    {/* Courses indicator */}
                    {dayStatus.coursesCount > 0 && (
                      <div className="text-xs text-secondary">
                        {dayStatus.coursesCount} courses
                      </div>
                    )}

                    {/* Rentals indicator */}
                    {dayStatus.rentalsCount > 0 && (
                      <div className="text-xs text-accent">
                        {dayStatus.rentalsCount} rentals
                      </div>
                    )}
                  </div>
                )}

                {/* Empty day indicator */}
                {day.isCurrentMonth && dayStatus.shiftsCount === 0 && dayStatus.coursesCount === 0 && dayStatus.rentalsCount === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/30">
                    <div className="w-1 h-1 bg-base-content/20 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
        <div className="p-2 bg-info/10 border border-info/20 rounded">
          <div className="font-bold">
            {Object.values(monthData).reduce((sum, day) => sum + day.shifts.length, 0)}
          </div>
          <div className="text-xs">Total Shifts</div>
        </div>
        <div className="p-2 bg-success/10 border border-success/20 rounded">
          <div className="font-bold">
            {Object.values(monthData).reduce((sum, day) =>
              sum + day.assignments.filter(a => a.status === 'confirmed').length, 0
            )}
          </div>
          <div className="text-xs">Confirmed</div>
        </div>
        <div className="p-2 bg-secondary/10 border border-secondary/20 rounded">
          <div className="font-bold">
            {Object.values(monthData).reduce((sum, day) => sum + day.courses.length, 0)}
          </div>
          <div className="text-xs">Total Courses</div>
        </div>
        <div className="p-2 bg-base-200 border border-base-300 rounded">
          <div className="font-bold">
            {Object.keys(monthData).filter(date => {
              const dayData = monthData[date];
              return dayData.shifts.length > 0 || dayData.courses.length > 0;
            }).length}
          </div>
          <div className="text-xs">Active Days</div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-success rounded-full"></div>
          <span>Fully Staffed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-warning rounded-full"></div>
          <span>Overstaffed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-error rounded-full"></div>
          <span>Understaffed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-primary rounded-full"></div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}