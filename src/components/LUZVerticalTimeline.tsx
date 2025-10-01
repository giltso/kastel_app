import { Calendar } from "lucide-react";
import { calculateTimelinePositions } from "@/utils/timelinePositioning";

/**
 * LUZ Vertical Timeline Component
 *
 * ARCHITECTURE:
 * - Time-based vertical layout with 64px per hour grid (8 AM baseline)
 * - Individual events positioned by start/end times with pixel-perfect alignment
 * - Assignment filtering ensures workers only show in their assigned shifts
 * - Column layout separates overlapping vs non-overlapping events
 *
 * POSITIONING LOGIC:
 * - Non-overlapping events (like Evening shift 18:00-20:00 vs Daily 08:00-18:00) get full width
 * - Overlapping events share column space proportionally
 * - Each shift container filters assignments by shiftTemplateId
 *
 * SEARCH KEYWORDS: timeline, vertical, positioning, assignment filtering, overlap detection,
 * time grid, shift workers, staffing status, Evening shift, Daily Operations
 */

interface LUZVerticalTimelineProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  coursesForDate: any[];
  rentalsForDate: any[];
  selectedDate: string;
  hasManagerTag: boolean;
  getShiftStaffingStatus: (shift: any, assignedWorkers: any[]) => any;
  onShiftClick?: (shiftId: string) => void;
  onRequestJoin?: (shiftId: string, date: string) => void;
}

export function LUZVerticalTimeline({
  assignmentsForDate,
  shiftsForDate,
  coursesForDate,
  rentalsForDate,
  selectedDate,
  hasManagerTag,
  getShiftStaffingStatus,
  onShiftClick,
  onRequestJoin
}: LUZVerticalTimelineProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Daily Schedule
      </h2>

      {/* Vertical Timeline - Same data as horizontal, different layout */}
      <div className="relative">
        {/* Time Grid Background */}
        <div className="absolute left-0 top-8 w-full h-[768px]"> {/* 12 hours * 64px = 768px */}
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-16 border-b border-base-300/30"></div>
          ))}
        </div>

        {/* Time Labels Column */}
        <div className="absolute left-0 top-0 w-16 border-r border-base-300">
          <div className="text-xs font-medium text-center py-2 border-b border-base-300 bg-base-100">Time</div>
          {Array.from({ length: 12 }, (_, i) => {
            const hour = i + 8;
            return (
              <div key={hour} className="h-16 flex items-center justify-center text-xs bg-base-100">
                {hour}:00
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="ml-16 relative min-h-[800px]">
          {/* NEW POSITIONING ALGORITHM: Time-based proportional width allocation */}
          {(() => {
            // Calculate positions using the new algorithm with 5px padding
            const paddingPx = 5;
            const { events, positions } = calculateTimelinePositions(
              shiftsForDate || [],
              coursesForDate || [],
              rentalsForDate || [],
              assignmentsForDate || [],
              paddingPx
            );

            return (
              <>
                {/* Render individual shift events using new positioning */}
                {shiftsForDate?.map((shift, shiftIndex) => {
                  const position = positions.get(shift._id);
                  if (!position) return null;
                      const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                      const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                      const startRow = Math.max(0, startHour - 8);
                      const duration = endHour - startHour;
                      const topPos = 32 + (startRow * 64); // Align with timeline grid
                      const height = duration * 64; // Exact duration height

                      // CRITICAL: Filter assignments by shiftTemplateId to prevent data leakage between shifts
                      const shiftWorkers = assignmentsForDate?.filter(assignment => assignment.shiftTemplateId === shift._id) || [];
                      const staffingStatus = getShiftStaffingStatus(shift, shiftWorkers);

                      const shiftColorClasses = {
                        understaffed: 'bg-error/20 border-2 border-error',
                        staffed: 'bg-success/20 border-2 border-success',
                        overstaffed: 'bg-warning/20 border-2 border-warning'
                      }[staffingStatus.status];

                      const headerColorClasses = {
                        understaffed: 'bg-error/30 border-b border-error/50',
                        staffed: 'bg-success/30 border-b border-success/50',
                        overstaffed: 'bg-warning/30 border-b border-warning/50'
                      }[staffingStatus.status];

                      return (
                        <div
                          key={shift._id}
                          className="absolute cursor-pointer"
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${topPos}px`,
                            height: `${height}px`,
                            padding: '5px'
                          }}
                          onClick={() => onShiftClick?.(shift._id)}
                        >
                          {/* Header - Connected to shift body */}
                          <div
                            className={`absolute ${headerColorClasses} px-2 py-1 rounded-t`}
                            style={{
                              top: '-35px', // Connected to shift body
                              left: '5px',
                              right: '5px',
                              height: '35px',
                              zIndex: 10
                            }}
                          >
                            <div className="flex justify-between items-center h-full">
                              <div>
                                <div className="font-medium text-xs text-base-content">{shift.name}</div>
                                <div className="text-xs text-base-content/80">
                                  {shift.storeHours.openTime} - {shift.storeHours.closeTime}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-base-content">
                                  {staffingStatus.currentWorkers}/{staffingStatus.minWorkers}
                                </div>
                                <div className={`badge badge-xs text-base-content ${
                                  staffingStatus.status === 'understaffed' ? 'badge-error' :
                                  staffingStatus.status === 'staffed' ? 'badge-success' : 'badge-warning'
                                }`}>
                                  {staffingStatus.status}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Main shift body - Time-constrained area */}
                          <div
                            className={`absolute ${shiftColorClasses} rounded-b`}
                            style={{
                              top: '0px', // Aligned with timeline grid
                              left: '5px',
                              right: '5px',
                              height: `${duration * 64}px`, // Exact time span
                            }}
                          >
                            {/* Worker assignments within shift body */}
                            <div className="relative w-full h-full px-3 py-2 pr-12">
                              {/* WORKER RENDERING: Only show workers assigned to THIS specific shift */}
                              {assignmentsForDate?.filter(assignment => assignment.shiftTemplateId === shift._id).map((assignment, workerIndex) => {
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
                                      className={`absolute rounded px-2 py-1 ${
                                        assignment.status === 'confirmed'
                                          ? 'bg-success/30 border border-success'
                                          : 'bg-warning/30 border border-warning'
                                      }`}
                                      style={{
                                        top: `${relativeStart}%`,
                                        height: `${relativeHeight}%`,
                                        left: `${(workerIndex * 25) + (slotIndex * 2)}%`, // Slight offset for multiple slots
                                        width: '20%',
                                      }}
                                    >
                                      <div className="text-xs font-medium text-base-content">{assignment.worker?.name}</div>
                                      <div className="text-xs text-base-content">{timeSlot.startTime} - {timeSlot.endTime}</div>
                                    </div>
                                  );
                                });
                              }).flat()}
                            </div>

                            {/* Capacity indicators - Right side, relative to shift time */}
                            <div className="absolute right-2 top-0 w-10 h-full">
                              {(() => {
                                // Generate indicators for each hour in the shift
                                const indicators = [];
                                for (let hourInt = startHour; hourInt < endHour; hourInt++) {
                                  // Find the requirement range that contains this hour
                                  const applicableReq = shift.hourlyRequirements?.find(req => {
                                    const reqStart = parseInt(req.startTime.split(':')[0]);
                                    const reqEnd = parseInt(req.endTime.split(':')[0]);
                                    return hourInt >= reqStart && hourInt < reqEnd;
                                  });

                                  if (!applicableReq) continue; // Skip hours without requirements

                                  // Position relative to shift duration with +5% offset for better alignment
                                  const relativePosition = ((hourInt - startHour) / duration) * 100 + 5;

                                  const currentWorkers = shiftWorkers.filter(assignment => {
                                    return assignment.status === 'confirmed' && assignment.assignedHours?.some(timeSlot => {
                                      const assignStart = parseInt(timeSlot.startTime.split(':')[0]);
                                      const assignEnd = parseInt(timeSlot.endTime.split(':')[0]);
                                      return hourInt >= assignStart && hourInt < assignEnd;
                                    });
                                  }).length || 0;

                                  const hourStatus = currentWorkers < applicableReq.minWorkers ? 'understaffed' :
                                                   currentWorkers === applicableReq.minWorkers ? 'staffed' : 'overstaffed';

                                  const hourColor = {
                                    understaffed: 'bg-error/60 text-white',
                                    staffed: 'bg-success/60 text-white',
                                    overstaffed: 'bg-warning/60 text-black'
                                  }[hourStatus];

                                  indicators.push(
                                    <div
                                      key={`${hourInt}:00`}
                                      className={`absolute ${hourColor} rounded text-center`}
                                      style={{
                                        top: `${relativePosition}%`,
                                        left: '0px',
                                        right: '0px',
                                        height: '18px',
                                        fontSize: '9px',
                                        lineHeight: '18px',
                                        transform: 'translateY(-50%)'
                                      }}
                                    >
                                      {currentWorkers}/{applicableReq.minWorkers}
                                    </div>
                                  );
                                }
                                return indicators;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                {/* Render individual course events using new positioning */}
                {coursesForDate?.map((course, courseIndex) => {
                  const position = positions.get(course._id);
                  if (!position) return null;
                      const startHour = parseInt(course.schedule.startTime.split(':')[0]);
                      const endTime = course.schedule.endTime.split(':');
                      const endHour = parseInt(endTime[0]);
                      const endMinutes = parseInt(endTime[1]);
                      const startRow = Math.max(0, startHour - 8);
                      const duration = endHour - startHour + (endMinutes > 0 ? 0.5 : 0); // Account for partial hours
                      const topPos = 32 + (startRow * 64);
                      const height = duration * 64 + 50;

                      return (
                        <div
                          key={course._id}
                          className="absolute bg-secondary/20 border-2 border-secondary rounded"
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${topPos}px`,
                            height: `${height}px`,
                            padding: '5px'
                          }}
                        >
                          {/* Tab-style Header - Protected area at top */}
                          <div className="bg-secondary/30 border-b border-secondary/50 px-2 py-1 rounded-t">
                            <div className="font-medium text-sm text-base-content">{course.title}</div>
                            <div className="text-xs text-base-content/80">
                              {course.schedule.startTime} - {course.schedule.endTime} • {course.enrolledStudents?.length || 0} students • {course.instructor?.name}
                            </div>
                          </div>

                          {/* Students area below header */}
                          <div className="relative px-3 py-2" style={{ height: `${duration * 64}px` }}>
                            {course.enrolledStudents?.map((student, studentIndex) => (
                              <div
                                key={student._id}
                                className="absolute bg-info/30 border border-info rounded px-2 py-1"
                                style={{
                                  top: `${studentIndex * 25}px`,
                                  left: '4px',
                                  right: '4px',
                                  height: '22px',
                                }}
                              >
                                <div className="text-xs font-medium truncate text-base-content">
                                  {student.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                {/* Render individual rental events using new positioning */}
                {rentalsForDate?.map((rental) => {
                  const position = positions.get(rental._id);
                  if (!position) return null;
                  const startHour = 8; // Rentals span entire business day
                  const endHour = 20;
                  const startRow = Math.max(0, startHour - 8);
                  const duration = endHour - startHour;
                  const topPos = 32 + (startRow * 64);
                  const height = duration * 64;

                  return (
                    <div
                      key={rental._id}
                      className="absolute bg-accent/20 border-2 border-accent rounded"
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `${topPos}px`,
                        height: `${height}px`,
                        padding: '5px'
                      }}
                    >
                      {/* Tab-style Header */}
                      <div className="bg-accent/30 border-b border-accent/50 px-2 py-1 rounded-t">
                        <div className="font-medium text-sm text-base-content">{rental.tool?.name || 'Tool Rental'}</div>
                        <div className="text-xs text-base-content/80">
                          {rental.rentalStartDate} - {rental.rentalEndDate} • {rental.renterUser?.name} • ${rental.totalCost}
                        </div>
                      </div>

                      {/* Rental details area */}
                      <div className="relative px-3 py-2">
                        <div className="text-xs">
                          <div className="mb-1"><strong>Status:</strong> {rental.status}</div>
                          {rental.notes && <div className="text-xs text-base-content/70 mt-2">{rental.notes}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

        </div>

        {/* Empty State */}
        {(!shiftsForDate || shiftsForDate.length === 0) && (!coursesForDate || coursesForDate.length === 0) && (
          <div className="flex items-center justify-center h-full text-base-content/50 absolute inset-0">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No events scheduled for {selectedDate}</p>
              {hasManagerTag && (
                <button className="btn btn-sm btn-primary mt-2">
                  Create First Event
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}