import { Calendar } from "lucide-react";

interface LUZHorizontalTimelineProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  coursesForDate: any[];
  selectedDate: string;
  hasManagerTag: boolean;
}

export function LUZHorizontalTimeline({
  assignmentsForDate,
  shiftsForDate,
  coursesForDate,
  selectedDate,
  hasManagerTag
}: LUZHorizontalTimelineProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="text-lg">—</span>
        <Calendar className="w-5 h-5" />
        Schedule Timeline (Horizontal)
      </h2>

      {/* Horizontal Timeline */}
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

        {/* Timeline Grid - Dynamic height based on shifts and courses */}
        <div className="relative" style={{ minHeight: `${Math.max(400, (() => {
          const shiftsHeight = shiftsForDate?.reduce((totalHeight, shift, index) => {
            const shiftWorkers = assignmentsForDate?.filter(assignment => true) || [];
            const shiftHeight = Math.max(80, 50 + 50 + shiftWorkers.length * 28); // 50px header + 50px base + workers
            return totalHeight + shiftHeight + 20; // Add spacing between shifts
          }, 0) || 0;

          const coursesHeight = coursesForDate?.reduce((totalHeight, course, index) => {
            const courseStudents = course.enrolledStudents || [];
            const courseHeight = Math.max(80, 50 + 50 + courseStudents.length * 28); // Similar to shifts
            return totalHeight + courseHeight + 20;
          }, 0) || 0;

          return shiftsHeight + coursesHeight;
        })())}px` }}>
          {/* Hour Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="border-r border-base-300/50 last:border-r-0"></div>
            ))}
          </div>

          {/* Shift Templates with Nested Workers */}
          {shiftsForDate && shiftsForDate.map((shift, shiftIndex) => {
            // Convert time to grid position
            const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
            const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
            const startCol = Math.max(0, startHour - 8) + 1; // Grid starts at 8 AM
            const span = Math.min(12 - startCol + 1, endHour - startHour);

            // Find workers assigned to this shift
            const shiftWorkers = assignmentsForDate?.filter(assignment => {
              // For now, assume all workers belong to the shift (can be refined later)
              return true;
            }) || [];

            // Calculate cumulative top position
            let cumulativeTop = 0;
            for (let i = 0; i < shiftIndex; i++) {
              const prevShiftWorkers = assignmentsForDate?.filter(assignment => true) || [];
              cumulativeTop += Math.max(80, 50 + 50 + prevShiftWorkers.length * 28) + 20; // 50px header + 50px base + workers
            }

            const shiftHeight = Math.max(80, 50 + 50 + shiftWorkers.length * 28); // 50px header + 50px base + workers

            return (
              <div
                key={shift._id}
                className="absolute bg-primary/20 border-2 border-primary rounded"
                style={{
                  left: `${((startCol - 1) / 12) * 100}%`,
                  width: `${(span / 12) * 100}%`,
                  top: `${cumulativeTop}px`,
                  height: `${shiftHeight}px`,
                }}
              >
                {/* Shift Header - Protected area at top */}
                <div className="bg-primary/30 border-b border-primary/50 px-2 py-1 rounded-t">
                  <div className="font-medium text-sm">{shift.name}</div>
                  <div className="text-xs text-base-content/70">
                    {shift.storeHours.openTime} - {shift.storeHours.closeTime} • {shift.hourlyRequirements.reduce((sum, req) => sum + req.minWorkers, 0)} workers needed
                  </div>
                </div>

                {/* Workers Area */}
                <div className="relative px-2 py-1" style={{ height: `${shiftHeight - 50}px` }}>
                  {/* Nested Workers within Shift */}
                  {shiftWorkers.map((assignment, workerIndex) => {
                    const workerStartHour = parseInt(assignment.assignedHours[0]?.startTime.split(':')[0] || '9');
                    const workerEndHour = parseInt(assignment.assignedHours[0]?.endTime.split(':')[0] || '17');
                    const workerStartCol = Math.max(0, workerStartHour - startHour); // Relative to shift start
                    const workerSpan = workerEndHour - workerStartHour;
                    const shiftSpan = endHour - startHour;

                    return (
                      <div
                        key={assignment._id}
                        className={`absolute rounded px-2 py-1 ${
                          assignment.status === 'confirmed'
                            ? 'bg-success/30 border border-success'
                            : 'bg-warning/30 border border-warning'
                        }`}
                        style={{
                          left: `${(workerStartCol / shiftSpan) * 100}%`,
                          width: `${(workerSpan / shiftSpan) * 100}%`,
                          top: `${workerIndex * 28}px`,
                          height: '26px',
                        }}
                      >
                        <div className="text-xs font-medium truncate">
                          {assignment.worker?.name} ({assignment.assignedHours[0]?.startTime}-{assignment.assignedHours[0]?.endTime})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Course Templates with Nested Students */}
          {coursesForDate && coursesForDate.map((course, courseIndex) => {
            // Convert time to grid position
            const startHour = parseInt(course.schedule.startTime.split(':')[0]);
            const endTime = course.schedule.endTime.split(':');
            const endHour = parseInt(endTime[0]);
            const endMinutes = parseInt(endTime[1]);
            const startCol = Math.max(0, startHour - 8) + 1; // Grid starts at 8 AM
            const span = Math.min(12 - startCol + 1, endHour - startHour + (endMinutes > 0 ? 0.5 : 0));

            // Get course students
            const courseStudents = course.enrolledStudents || [];

            // Calculate cumulative top position (after all shifts)
            let cumulativeTop = 0;

            // Add shift heights
            for (let i = 0; i < (shiftsForDate?.length || 0); i++) {
              const shiftWorkers = assignmentsForDate?.filter(assignment => true) || [];
              cumulativeTop += Math.max(80, 50 + 50 + shiftWorkers.length * 28) + 20;
            }

            // Add previous course heights
            for (let i = 0; i < courseIndex; i++) {
              const prevCourseStudents = coursesForDate[i].enrolledStudents || [];
              cumulativeTop += Math.max(80, 50 + 50 + prevCourseStudents.length * 28) + 20;
            }

            const courseHeight = Math.max(80, 50 + 50 + courseStudents.length * 28);

            return (
              <div
                key={course._id}
                className="absolute bg-secondary/20 border-2 border-secondary rounded"
                style={{
                  left: `${((startCol - 1) / 12) * 100}%`,
                  width: `${(span / 12) * 100}%`,
                  top: `${cumulativeTop}px`,
                  height: `${courseHeight}px`,
                }}
              >
                {/* Course Header - Protected area at top */}
                <div className="bg-secondary/30 border-b border-secondary/50 px-2 py-1 rounded-t">
                  <div className="font-medium text-sm">{course.title}</div>
                  <div className="text-xs text-base-content/70">
                    {course.schedule.startTime} - {course.schedule.endTime} • {courseStudents.length} students • {course.instructor?.name}
                  </div>
                </div>

                {/* Students Area */}
                <div className="relative px-2 py-1" style={{ height: `${courseHeight - 50}px` }}>
                  {/* Nested Students within Course */}
                  {courseStudents.map((student, studentIndex) => {
                    return (
                      <div
                        key={student._id}
                        className="absolute rounded px-2 py-1 bg-info/30 border border-info"
                        style={{
                          left: '4px',
                          right: '4px',
                          top: `${studentIndex * 28}px`,
                          height: '26px',
                        }}
                      >
                        <div className="text-xs font-medium truncate">
                          {student.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {(!shiftsForDate || shiftsForDate.length === 0) && (!coursesForDate || coursesForDate.length === 0) && (
            <div className="flex items-center justify-center h-full text-base-content/50">
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
    </div>
  );
}