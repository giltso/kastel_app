import { Calendar } from "lucide-react";

interface LUZVerticalTimelineProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  coursesForDate: any[];
  selectedDate: string;
  hasManagerTag: boolean;
  getShiftStaffingStatus: (shift: any, assignedWorkers: any[]) => any;
}

export function LUZVerticalTimeline({
  assignmentsForDate,
  shiftsForDate,
  coursesForDate,
  selectedDate,
  hasManagerTag,
  getShiftStaffingStatus
}: LUZVerticalTimelineProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="text-lg">|</span>
        <Calendar className="w-5 h-5" />
        Schedule Timeline (Vertical)
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
          {/* Calculate proper column layout for overlapping events */}
          {(() => {
            const hasShifts = shiftsForDate && shiftsForDate.length > 0;
            const hasCourses = coursesForDate && coursesForDate.length > 0;

            // Use a more flexible column system
            const totalColumns = hasShifts && hasCourses ? 3 : 1; // 3 columns when both present, 1 when only one type
            const shiftColumns = hasShifts ? (hasCourses ? 2 : 1) : 0; // Shifts get 2/3 width when courses present
            const courseColumns = hasCourses ? 1 : 0; // Courses get 1/3 width when shifts present

            const columnWidth = 100 / totalColumns;
            const shiftWidth = hasShifts ? `${shiftColumns * columnWidth}%` : '0%';
            const courseWidth = hasCourses ? `${courseColumns * columnWidth}%` : '0%';
            const courseLeft = hasShifts ? `${shiftColumns * columnWidth}%` : '0%';

            return (
              <>
                {/* Shift Templates */}
                {hasShifts && (
                  <div className="absolute left-0" style={{ width: shiftWidth }}>
                    {shiftsForDate.map((shift, shiftIndex) => {
                      const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
                      const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
                      const startRow = Math.max(0, startHour - 8);
                      const duration = endHour - startHour;
                      const topPos = 32 + (startRow * 64); // 32px for header + row height
                      const height = duration * 64 + 50; // Add 50px for protected header space

                      // Calculate staffing status for color determination
                      const shiftWorkers = assignmentsForDate?.filter(assignment => true) || [];
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
                          className={`absolute ${shiftColorClasses} rounded left-2 right-2`}
                          style={{
                            top: `${topPos}px`,
                            height: `${height}px`,
                          }}
                        >
                          {/* Tab-style Header - Protected area at top */}
                          <div className={`${headerColorClasses} px-2 py-1 rounded-t`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-sm text-base-content">{shift.name}</div>
                                <div className="text-xs text-base-content/80">
                                  {shift.storeHours.openTime} - {shift.storeHours.closeTime}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-base-content">
                                  {staffingStatus.currentWorkers}/{staffingStatus.minWorkers} workers
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

                          {/* Main shift content area - leave space for capacity bar at bottom */}
                          <div className="relative px-2 py-1 pb-8" style={{ height: `${duration * 64 - 32}px` }}>
                            {/* Shift content can go here */}
                          </div>

                          {/* Capacity Management Bar - Bottom */}
                          <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-base-300/50 bg-base-50/30">
                            <div className="flex items-center justify-between h-full px-2">
                              <div className="text-xs font-medium text-base-content">Capacity:</div>
                              <div className="flex gap-1 flex-wrap">
                                {shift.hourlyRequirements?.map((hourReq, hourIndex) => {
                                  const hourInt = parseInt(hourReq.hour.split(':')[0]);
                                  const currentWorkers = assignmentsForDate?.filter(assignment => {
                                    const assignStart = parseInt(assignment.assignedHours[0]?.startTime.split(':')[0] || '0');
                                    const assignEnd = parseInt(assignment.assignedHours[0]?.endTime.split(':')[0] || '0');
                                    return hourInt >= assignStart && hourInt < assignEnd && assignment.status === 'confirmed';
                                  }).length || 0;

                                  const hourStatus = currentWorkers < hourReq.minWorkers ? 'understaffed' :
                                                   currentWorkers === hourReq.minWorkers ? 'staffed' : 'overstaffed';

                                  const hourColor = {
                                    understaffed: 'bg-error/40 text-base-content',
                                    staffed: 'bg-success/40 text-base-content',
                                    overstaffed: 'bg-warning/40 text-base-content'
                                  }[hourStatus];

                                  return (
                                    <div
                                      key={hourReq.hour}
                                      className={`${hourColor} rounded px-1 text-center`}
                                      style={{
                                        fontSize: '9px',
                                        lineHeight: '16px',
                                        minWidth: '32px'
                                      }}
                                    >
                                      {hourInt}h:{currentWorkers}/{hourReq.minWorkers}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Course Templates */}
                {hasCourses && (
                  <div className="absolute" style={{ left: courseLeft, width: courseWidth }}>
                    {coursesForDate.map((course, courseIndex) => {
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
                          className="absolute bg-secondary/20 border-2 border-secondary rounded left-2 right-2"
                          style={{
                            top: `${topPos}px`,
                            height: `${height}px`,
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
                          <div className="relative px-2 py-1" style={{ height: `${duration * 64}px` }}>
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
                  </div>
                )}
              </>
            );
          })()}

          {/* Worker Assignments */}
          {assignmentsForDate && assignmentsForDate.map((assignment, assignmentIndex) => {
            const startHour = parseInt(assignment.assignedHours[0]?.startTime.split(':')[0] || '9');
            const endHour = parseInt(assignment.assignedHours[0]?.endTime.split(':')[0] || '17');
            const startRow = Math.max(0, startHour - 8);
            const duration = endHour - startHour;
            const topPos = 32 + (startRow * 64) + 50 + 8; // Account for protected header area (50px) + offset
            const height = duration * 64 - 16 - 32; // Smaller than shift blocks, leave space for capacity bar

            // Calculate dynamic positioning within shift area - match the column system above
            const hasShifts = shiftsForDate && shiftsForDate.length > 0;
            const hasCourses = coursesForDate && coursesForDate.length > 0;
            const totalColumns = hasShifts && hasCourses ? 3 : 1;
            const shiftColumns = hasShifts ? (hasCourses ? 2 : 1) : 0;
            const shiftAreaWidthPercent = hasShifts ? (shiftColumns / totalColumns) * 100 : 0;

            // Distribute workers evenly within the shift area with proper padding
            const totalWorkers = assignmentsForDate.length;
            const workerWidthPercent = Math.min((shiftAreaWidthPercent - 4) / totalWorkers, 20); // Max 20% width per worker, -4% for padding
            const leftOffsetPercent = 2 + (assignmentIndex * ((shiftAreaWidthPercent - 4) / totalWorkers)); // Start with 2% padding

            return (
              <div
                key={assignment._id}
                className={`absolute rounded p-2 ${
                  assignment.status === 'confirmed'
                    ? 'bg-success/30 border border-success'
                    : 'bg-warning/30 border border-warning'
                }`}
                style={{
                  top: `${topPos}px`,
                  height: `${height}px`,
                  left: `${leftOffsetPercent}%`,
                  width: `${workerWidthPercent}%`,
                }}
              >
                <div className="text-xs font-medium text-base-content">{assignment.worker?.name}</div>
                <div className="text-xs text-base-content">{assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}</div>
                <div className={`text-xs mt-1 px-1 rounded text-base-content ${
                  assignment.status === 'confirmed' ? 'bg-success/50' : 'bg-warning/50'
                }`}>
                  {assignment.status}
                </div>
              </div>
            );
          })}
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