import { Calendar } from "lucide-react";
import { calculateTimelinePositions } from "@/utils/timelinePositioning";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * LUZ Week View Component
 *
 * ARCHITECTURE:
 * - 7-day horizontal grid layout (Monday to Sunday)
 * - Each day uses the same time-based proportional width allocation as daily views
 * - Time axis runs horizontally (8 AM to 8 PM) across all days
 * - Events positioned by day and hour with proportional width factors
 *
 * POSITIONING LOGIC:
 * - Day columns: 7 equal-width columns for each weekday
 * - Time positioning: Same 12-hour grid system (8 AM baseline)
 * - Width algorithm: Events within each day get proportional space
 * - Height: Fixed height per time slot for compact weekly overview
 *
 * SEARCH KEYWORDS: week view, weekly calendar, 7-day layout, multi-day timeline,
 * proportional width, day columns, time grid, weekly schedule
 */

interface LUZWeekViewProps {
  weekDates: string[]; // Array of 7 date strings (YYYY-MM-DD format)
  shiftsForWeek: { [date: string]: any[] }; // Shifts grouped by date
  coursesForWeek: { [date: string]: any[] }; // Courses grouped by date
  rentalsForWeek: { [date: string]: any[] }; // Rentals grouped by date
  assignmentsForWeek: { [date: string]: any[] }; // Assignments grouped by date
  hasManagerTag: boolean;
  getShiftStaffingStatus: (shift: any, assignedWorkers: any[]) => any;
  onShiftClick?: (shiftId: string, date?: string) => void;
  onRequestJoin?: (shiftId: string, date: string) => void;
  onCreateShift?: () => void;
}

export function LUZWeekView({
  weekDates,
  shiftsForWeek,
  coursesForWeek,
  rentalsForWeek,
  assignmentsForWeek,
  hasManagerTag,
  getShiftStaffingStatus,
  onShiftClick,
  onRequestJoin,
  onCreateShift
}: LUZWeekViewProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        {t("shifts:luz.weeklySchedule")}
      </h2>

      {/* Week Grid Container - Enhanced for mobile scrolling */}
      <div className="relative overflow-x-auto overflow-y-hidden scroll-smooth">
        {/* Scroll shadow indicators for mobile */}
        <div className="absolute left-12 sm:left-16 top-0 bottom-0 w-6 bg-gradient-to-r from-base-100 via-base-100/50 to-transparent pointer-events-none z-20 md:hidden"></div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-base-100 via-base-100/50 to-transparent pointer-events-none z-20 md:hidden"></div>

        {/* Mobile scroll hint - shown initially, fades on scroll */}
        <div className="md:hidden absolute left-1/2 -translate-x-1/2 bottom-4 z-30 pointer-events-none">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-base-200/90 backdrop-blur-sm rounded-full text-xs text-base-content/70 shadow-lg border border-base-300">
            <span className="animate-pulse">←</span>
            <span>{t("common:actions.swipe")}</span>
            <span className="animate-pulse">→</span>
          </div>
        </div>

        {/* Combined Header and Content Structure */}
        <div className="relative" style={{ minHeight: '600px', minWidth: '768px' }}> {/* Ensure minimum width for 7 columns */}
          {/* Time Labels Column */}
          <div className="absolute left-0 top-0 w-12 sm:w-16 z-10 bg-base-100">
            {/* Time header */}
            <div className="h-12 flex items-center justify-center text-[10px] sm:text-xs font-medium bg-base-200 border-b border-base-300/30 rounded-tl">
              <span className="hidden sm:inline">{t("common:time.time")}</span>
              <span className="sm:hidden">{t("common:time.timeLabel")}</span>
            </div>
            {/* Time labels - Abbreviated on mobile */}
            {Array.from({ length: 12 }, (_, i) => {
              const hour = i + 8;
              return (
                <div key={hour} className="h-12 flex items-center justify-center text-[10px] sm:text-xs bg-base-100 border-b border-base-300/30">
                  <span className="hidden sm:inline">{hour}:00</span>
                  <span className="sm:hidden">{hour}</span>
                </div>
              );
            })}
          </div>

          {/* Day Headers and Content */}
          <div className="ml-12 sm:ml-16 grid grid-cols-7 gap-1 sm:gap-2">
            {weekDates.map((date, dayIndex) => {
              const dateObj = new Date(date + 'T00:00:00');
              // Use actual date calculation instead of array index
              const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
              const dayNumber = dateObj.getDate();
              const shiftsForDate = shiftsForWeek[date] || [];
              const coursesForDate = coursesForWeek[date] || [];
              const assignmentsForDate = assignmentsForWeek[date] || [];

              // Calculate positions for this day
              const paddingPx = 2; // Smaller padding for week view
              const rentalsForDate = rentalsForWeek[date] || [];
              const { events, positions } = calculateTimelinePositions(
                shiftsForDate,
                coursesForDate,
                rentalsForDate,
                assignmentsForDate,
                paddingPx
              );

              return (
                <div key={date} className="relative">
                  {/* Day Header - Optimized for mobile */}
                  <div className="h-12 sm:h-14 p-1 sm:p-2 text-center bg-base-200 rounded-tr text-xs sm:text-sm font-semibold border-b border-base-300/30 mb-1 sm:mb-2">
                    <div className="text-[11px] sm:text-sm">{dayName}</div>
                    <div className="text-[10px] sm:text-xs text-base-content/70 font-normal">{dayNumber}</div>
                  </div>

                  {/* Day Content Area - Minimum touch-friendly height */}
                  <div className="relative" style={{ minHeight: '576px' }}> {/* 12 hours * 48px = 576px */}
                    {/* Time Grid Background */}
                    <div className="absolute inset-0">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="h-12 border-b border-base-300/20"></div>
                      ))}
                    </div>

                  {/* Render Shifts for this day */}
                  {shiftsForDate.map((shift) => {
                    const position = positions.get(shift._id);
                    if (!position) return null;

                    const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                    const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                    const startRow = Math.max(0, startHour - 8);
                    const duration = endHour - startHour;
                    const topPos = startRow * 48; // 48px per hour for compact view
                    const height = duration * 48;

                    // Get assignments for this shift
                    const shiftWorkers = assignmentsForDate.filter(assignment =>
                      assignment.shiftTemplateId === shift._id
                    ) || [];
                    const staffingStatus = getShiftStaffingStatus(shift, shiftWorkers);

                    const shiftColorClasses = {
                      understaffed: 'bg-error/20 border border-error',
                      staffed: 'bg-success/20 border border-success',
                      overstaffed: 'bg-warning/20 border border-warning'
                    }[staffingStatus.status as "understaffed" | "staffed" | "overstaffed"];

                    return (
                      <div
                        key={shift._id}
                        className={`absolute ${shiftColorClasses} rounded text-xs overflow-hidden cursor-pointer hover:shadow-lg transition-shadow active:scale-95`}
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${topPos}px`,
                          height: `${Math.max(height, 44)}px`, // Minimum 44px touch target height
                          padding: '4px',
                          minHeight: '44px' // iOS touch target guideline
                        }}
                        onClick={() => onShiftClick?.(shift._id, date)}
                      >
                        <div className="font-medium truncate text-[10px] sm:text-xs leading-tight" style={{ pointerEvents: 'none' }}>{shift.name}</div>
                        <div className="text-[9px] sm:text-xs text-base-content/70 truncate leading-tight" style={{ pointerEvents: 'none' }}>
                          {shift.storeHours.openTime.slice(0,5)}-{shift.storeHours.closeTime.slice(0,5)}
                        </div>
                        <div className="text-[9px] sm:text-xs mb-1 leading-tight" style={{ pointerEvents: 'none' }}>
                          {staffingStatus.currentWorkers}/{staffingStatus.minWorkers}
                        </div>

                        {/* Worker assignments within shift body - IMPROVED VISIBILITY */}
                        <div className="relative flex-1 overflow-hidden" style={{ pointerEvents: 'none' }}>
                          {shiftWorkers.map((assignment, workerIndex) => {
                            // Handle multiple time slots for each assignment
                            if (!assignment.assignedHours || assignment.assignedHours.length === 0) {
                              return null;
                            }

                            return assignment.assignedHours.map((timeSlot: any, slotIndex: number) => {
                              const workerStartHour = parseInt(timeSlot.startTime.split(':')[0]);
                              const workerEndHour = parseInt(timeSlot.endTime.split(':')[0]);

                              // Position relative to shift duration
                              const relativeStart = ((workerStartHour - startHour) / duration) * 100;
                              const relativeHeight = ((workerEndHour - workerStartHour) / duration) * 100;

                              return (
                                <div
                                  key={`${assignment._id}-${slotIndex}`}
                                  className={`absolute rounded px-1 py-0.5 text-xs font-medium ${
                                    assignment.status === 'confirmed'
                                      ? 'bg-success/60 border border-success text-white'
                                      : 'bg-warning/60 border border-warning text-black'
                                  }`}
                                  style={{
                                    top: `${25 + relativeStart * 0.8}px`, // Start below header text with better positioning
                                    height: `${Math.max(20, relativeHeight * 0.8)}px`, // Larger minimum height for visibility
                                    left: `${4 + (workerIndex * 25) + (slotIndex * 3)}px`, // Better spacing for workers and slots
                                    width: '22px', // Larger width for better visibility
                                  }}
                                  title={`${assignment.worker?.name} (${timeSlot.startTime} - ${timeSlot.endTime})`}
                                >
                                  <div className="truncate text-xs leading-none">{assignment.worker?.name?.charAt(0)}</div>
                                </div>
                              );
                            });
                          }).flat()}
                        </div>
                      </div>
                    );
                  })}

                  {/* Render Courses for this day */}
                  {coursesForDate.map((course) => {
                    const position = positions.get(course._id);
                    if (!position) return null;

                    const startHour = parseInt(course.schedule.startTime.split(':')[0]);
                    const endTime = course.schedule.endTime.split(':');
                    const endHour = parseInt(endTime[0]);
                    const endMinutes = parseInt(endTime[1]);
                    const startRow = Math.max(0, startHour - 8);
                    const duration = endHour - startHour + (endMinutes > 0 ? 0.5 : 0);
                    const topPos = startRow * 48;
                    const height = duration * 48;

                    return (
                      <div
                        key={course._id}
                        className="absolute bg-secondary/20 border border-secondary rounded text-xs overflow-hidden"
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${topPos}px`,
                          height: `${height}px`,
                          padding: '2px'
                        }}
                      >
                        <div className="font-medium truncate">{course.title}</div>
                        <div className="text-xs text-base-content/70 truncate">
                          {course.schedule.startTime}-{course.schedule.endTime}
                        </div>
                        <div className="text-xs">
                          {course.enrolledStudents?.length || 0} {t("shifts:staffing.students")}
                        </div>
                      </div>
                    );
                  })}

                  {/* Render Rentals for this day */}
                  {rentalsForDate.map((rental) => {
                    const position = positions.get(rental._id);
                    if (!position) return null;

                    const startHour = 8;
                    const endHour = 20;
                    const startRow = 0;
                    const duration = endHour - startHour;
                    const topPos = startRow * 48;
                    const height = duration * 48;

                    return (
                      <div
                        key={rental._id}
                        className="absolute bg-accent/20 border border-accent rounded text-xs overflow-hidden"
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${topPos}px`,
                          height: `${height}px`,
                          padding: '2px'
                        }}
                      >
                        <div className="font-medium truncate">{rental.tool?.name || t("shifts:luz.rental")}</div>
                        <div className="text-xs text-base-content/70 truncate">
                          {rental.renterUser?.name}
                        </div>
                        <div className="text-xs">
                          ${rental.totalCost}
                        </div>
                      </div>
                    );
                  })}

                    {/* Empty state for days with no events - Clickable to create shift */}
                    {shiftsForDate.length === 0 && coursesForDate.length === 0 && rentalsForDate.length === 0 && (
                      <div
                        className={`absolute inset-0 flex items-center justify-center text-base-content/30 ${hasManagerTag && onCreateShift ? 'cursor-pointer hover:bg-base-200/30 transition-colors' : ''}`}
                        onClick={hasManagerTag && onCreateShift ? () => onCreateShift() : undefined}
                        title={hasManagerTag ? "Click to create a new shift" : undefined}
                      >
                        <div className="text-center pointer-events-none">
                          <div className="text-xs">{t("shifts:luz.noEvents")}</div>
                          {hasManagerTag && onCreateShift && (
                            <div className="text-2xl mt-1">+</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Week Summary - Responsive sizing */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div className="p-2 sm:p-3 bg-success/10 border border-success/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(assignmentsForWeek).flat().filter(a => a.status === 'confirmed').length}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">{t("shifts:luz.totalAssignments")}</div>
        </div>
        <div className="p-2 sm:p-3 bg-info/10 border border-info/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(shiftsForWeek).flat().length}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">{t("shifts:luz.totalShifts")}</div>
        </div>
        <div className="p-2 sm:p-3 bg-secondary/10 border border-secondary/20 rounded">
          <div className="text-lg sm:text-xl font-bold">
            {Object.values(coursesForWeek).flat().length}
          </div>
          <div className="text-[10px] sm:text-xs leading-tight">{t("shifts:luz.totalCourses")}</div>
        </div>
      </div>
    </div>
  );
}