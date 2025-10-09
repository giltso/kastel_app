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

    // Last day of the month
    const lastDay = new Date(Date.UTC(year, month, 0));

    // Calculate start of calendar grid (Sunday of first week)
    const firstDayOfWeek = firstDay.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const startDate = new Date(Date.UTC(year, month - 1, 1 - firstDayOfWeek));

    // Calculate end of calendar grid (Saturday of last week)
    const lastDayOfWeek = lastDay.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const daysAfterMonth = lastDayOfWeek === 6 ? 0 : 6 - lastDayOfWeek;

    // Calculate total days needed (days before month + days in month + days after month)
    const daysBeforeMonth = firstDayOfWeek;
    const daysInMonth = lastDay.getUTCDate();
    const totalDays = daysBeforeMonth + daysInMonth + daysAfterMonth;

    // Generate only the necessary days
    const days = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < totalDays; i++) {
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

      {/* Month Calendar Grid - Mobile optimized */}
      <div className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
        {/* Header Row with Day Names - Abbreviated on mobile */}
        <div className="grid grid-cols-7 bg-base-200">
          {dayNames.map(dayName => (
            <div key={dayName} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-medium border-r border-base-300 last:border-r-0">
              <span className="hidden sm:inline">{dayName}</span>
              <span className="sm:hidden">{dayName.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid - Touch-friendly sizing */}
        <div className="grid grid-cols-7">
          {monthGrid.map(day => {
            const dayStatus = getDayStatus(day.date);

            // Day cell styling based on status and month - Mobile optimized
            const dayClasses = [
              'aspect-square border-r border-b border-base-300 last:border-r-0 p-0.5 sm:p-1 cursor-pointer transition-colors',
              'hover:bg-base-200 active:scale-95 relative text-xs min-h-[44px] sm:min-h-0', // iOS touch target
              day.isCurrentMonth ? 'bg-base-100' : 'bg-base-200/50 text-base-content/50',
              day.isToday ? 'ring-2 ring-primary ring-inset' : '',
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
                {/* Day Number - Larger on mobile for readability */}
                <div className={`font-semibold text-[11px] sm:text-xs ${day.isToday ? 'text-primary' : ''}`}>
                  {day.dayNumber}
                </div>

                {/* Simplified Event Indicators for Mobile */}
                {day.isCurrentMonth && (dayStatus.shiftsCount > 0 || dayStatus.coursesCount > 0 || dayStatus.rentalsCount > 0) && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {/* Compact shift count with status dot */}
                    {dayStatus.shiftsCount > 0 && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] sm:text-[10px] font-medium truncate">
                          <span className="hidden sm:inline">S:</span>{dayStatus.shiftsCount}
                        </span>
                        {(dayStatus.understaffedCount ?? 0) > 0 && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-error rounded-full flex-shrink-0"></div>
                        )}
                        {(dayStatus.understaffedCount ?? 0) === 0 && (dayStatus.overstaffedCount ?? 0) > 0 && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-warning rounded-full flex-shrink-0"></div>
                        )}
                        {(dayStatus.understaffedCount ?? 0) === 0 && (dayStatus.overstaffedCount ?? 0) === 0 && (dayStatus.staffedCount ?? 0) > 0 && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    )}

                    {/* Show assignment count only on larger screens */}
                    {dayStatus.assignmentsCount > 0 && (
                      <div className="hidden sm:block text-[9px] text-base-content/70 truncate">
                        {dayStatus.assignmentsCount}a
                      </div>
                    )}

                    {/* Compact indicators for courses/rentals */}
                    <div className="flex gap-1 text-[8px] sm:text-[9px]">
                      {dayStatus.coursesCount > 0 && (
                        <span className="text-secondary">C:{dayStatus.coursesCount}</span>
                      )}
                      {dayStatus.rentalsCount > 0 && (
                        <span className="text-accent">R:{dayStatus.rentalsCount}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty day indicator - smaller on mobile */}
                {day.isCurrentMonth && dayStatus.shiftsCount === 0 && dayStatus.coursesCount === 0 && dayStatus.rentalsCount === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-base-content/30">
                    <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-base-content/20 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary - Mobile responsive grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
        <div className="p-2 bg-info/10 border border-info/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(monthData).reduce((sum, day) => sum + day.shifts.length, 0)}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">Total<br className="sm:hidden" /><span className="hidden sm:inline"> </span>Shifts</div>
        </div>
        <div className="p-2 bg-success/10 border border-success/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(monthData).reduce((sum, day) =>
              sum + day.assignments.filter(a => a.status === 'confirmed').length, 0
            )}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">Confirmed</div>
        </div>
        <div className="p-2 bg-secondary/10 border border-secondary/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(monthData).reduce((sum, day) => sum + day.courses.length, 0)}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">Total<br className="sm:hidden" /><span className="hidden sm:inline"> </span>Courses</div>
        </div>
        <div className="p-2 bg-base-200 border border-base-300 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.keys(monthData).filter(date => {
              const dayData = monthData[date];
              return dayData.shifts.length > 0 || dayData.courses.length > 0;
            }).length}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">Active<br className="sm:hidden" /><span className="hidden sm:inline"> </span>Days</div>
        </div>
      </div>

      {/* Legend - Compact on mobile */}
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-success rounded-full"></div>
          <span>Staffed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-warning rounded-full"></div>
          <span>Over</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-error rounded-full"></div>
          <span>Under</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-primary rounded-full"></div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}