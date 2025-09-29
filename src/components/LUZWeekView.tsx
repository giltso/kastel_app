import { Calendar } from "lucide-react";
import { calculateTimelinePositions } from "@/utils/timelinePositioning";

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
  assignmentsForWeek: { [date: string]: any[] }; // Assignments grouped by date
  hasManagerTag: boolean;
  getShiftStaffingStatus: (shift: any, assignedWorkers: any[]) => any;
}

export function LUZWeekView({
  weekDates,
  shiftsForWeek,
  coursesForWeek,
  assignmentsForWeek,
  hasManagerTag,
  getShiftStaffingStatus
}: LUZWeekViewProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Weekly Schedule
      </h2>

      {/* Week Grid Container */}
      <div className="relative overflow-x-auto">
        {/* Combined Header and Content Structure */}
        <div className="relative" style={{ minHeight: '600px' }}>
          {/* Time Labels Column */}
          <div className="absolute left-0 top-0 w-16 z-10 bg-base-100">
            {/* Time header */}
            <div className="h-12 flex items-center justify-center text-xs font-medium bg-base-200 border-b border-base-300/30 rounded-tl">
              Time
            </div>
            {/* Time labels */}
            {Array.from({ length: 12 }, (_, i) => {
              const hour = i + 8;
              return (
                <div key={hour} className="h-12 flex items-center justify-center text-xs bg-base-100 border-b border-base-300/30">
                  {hour}:00
                </div>
              );
            })}
          </div>

          {/* Day Headers and Content */}
          <div className="ml-16 grid grid-cols-7 gap-1">
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
              const { events, positions } = calculateTimelinePositions(
                shiftsForDate,
                coursesForDate,
                assignmentsForDate,
                paddingPx
              );

              return (
                <div key={date} className="relative">
                  {/* Day Header */}
                  <div className="h-12 p-2 text-center bg-base-200 rounded-tr text-xs font-medium border-b border-base-300/30 mb-1">
                    <div>{dayName}</div>
                    <div className="text-xs text-base-content/70">{dayNumber}</div>
                  </div>

                  {/* Day Content Area */}
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
                    }[staffingStatus.status];

                    return (
                      <div
                        key={shift._id}
                        className={`absolute ${shiftColorClasses} rounded text-xs overflow-hidden`}
                        style={{
                          left: position.left,
                          width: position.width,
                          top: `${topPos}px`,
                          height: `${height}px`,
                          padding: '2px'
                        }}
                      >
                        <div className="font-medium truncate">{shift.name}</div>
                        <div className="text-xs text-base-content/70 truncate">
                          {shift.storeHours.openTime}-{shift.storeHours.closeTime}
                        </div>
                        <div className="text-xs mb-1">
                          {staffingStatus.currentWorkers}/{staffingStatus.minWorkers} workers
                        </div>

                        {/* Worker assignments within shift body - IMPROVED VISIBILITY */}
                        <div className="relative flex-1 overflow-hidden">
                          {shiftWorkers.map((assignment, workerIndex) => {
                            // Handle multiple time slots for each assignment
                            if (!assignment.assignedHours || assignment.assignedHours.length === 0) {
                              return null;
                            }

                            return assignment.assignedHours.map((timeSlot, slotIndex) => {
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
                          {course.enrolledStudents?.length || 0} students
                        </div>
                      </div>
                    );
                  })}

                    {/* Empty state for days with no events */}
                    {shiftsForDate.length === 0 && coursesForDate.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-base-content/30">
                        <div className="text-center">
                          <div className="text-xs">No events</div>
                          {hasManagerTag && (
                            <button className="btn btn-xs btn-ghost mt-1">+</button>
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

      {/* Week Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-2 bg-success/10 border border-success/20 rounded">
          <div className="font-bold">
            {Object.values(assignmentsForWeek).flat().filter(a => a.status === 'confirmed').length}
          </div>
          <div className="text-xs">Total Assignments</div>
        </div>
        <div className="p-2 bg-info/10 border border-info/20 rounded">
          <div className="font-bold">
            {Object.values(shiftsForWeek).flat().length}
          </div>
          <div className="text-xs">Total Shifts</div>
        </div>
        <div className="p-2 bg-secondary/10 border border-secondary/20 rounded">
          <div className="font-bold">
            {Object.values(coursesForWeek).flat().length}
          </div>
          <div className="text-xs">Total Courses</div>
        </div>
      </div>
    </div>
  );
}