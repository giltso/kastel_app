import { Calendar } from "lucide-react";

interface LUZVerticalTimelineProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  selectedDate: string;
  hasManagerTag: boolean;
}

export function LUZVerticalTimeline({
  assignmentsForDate,
  shiftsForDate,
  selectedDate,
  hasManagerTag
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
          {/* Shift Templates */}
          {shiftsForDate && shiftsForDate.map((shift, shiftIndex) => {
            const startHour = parseInt(shift.storeHours.openTime.split(':')[0]);
            const endHour = parseInt(shift.storeHours.closeTime.split(':')[0]);
            const startRow = Math.max(0, startHour - 8);
            const duration = endHour - startHour;
            const topPos = 32 + (startRow * 64); // 32px for header + row height
            const height = duration * 64 + 50; // Add 50px for protected header space

            return (
              <div
                key={shift._id}
                className="absolute bg-primary/20 border-2 border-primary rounded left-2 right-2"
                style={{
                  top: `${topPos}px`,
                  height: `${height}px`,
                }}
              >
                {/* Tab-style Header - Protected area at top */}
                <div className="bg-primary/30 border-b border-primary/50 px-2 py-1 rounded-t">
                  <div className="font-medium text-sm">{shift.name}</div>
                  <div className="text-xs text-base-content/70">
                    {shift.storeHours.openTime} - {shift.storeHours.closeTime} • {shift.hourlyRequirements.reduce((sum, req) => sum + req.minWorkers, 0)} workers needed
                  </div>
                </div>

                {/* Workers area below header */}
                <div className="relative" style={{ height: `${duration * 64}px`, top: '0px' }}>
                  {/* Worker content will be positioned in this area */}
                </div>
              </div>
            );
          })}

          {/* Worker Assignments */}
          {assignmentsForDate && assignmentsForDate.map((assignment, assignmentIndex) => {
            const startHour = parseInt(assignment.assignedHours[0]?.startTime.split(':')[0] || '9');
            const endHour = parseInt(assignment.assignedHours[0]?.endTime.split(':')[0] || '17');
            const startRow = Math.max(0, startHour - 8);
            const duration = endHour - startHour;
            const topPos = 32 + (startRow * 64) + 50 + 8; // Account for protected header area (50px) + offset
            const height = duration * 64 - 16; // Smaller than shift blocks
            const leftOffset = 120 + (assignmentIndex * 140); // Space them horizontally

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
                  left: `${leftOffset}px`,
                  width: '120px',
                }}
              >
                <div className="text-xs font-medium">{assignment.worker?.name}</div>
                <div className="text-xs">{assignment.assignedHours[0]?.startTime} - {assignment.assignedHours[0]?.endTime}</div>
                <div className={`text-xs mt-1 px-1 rounded ${
                  assignment.status === 'confirmed' ? 'bg-success/50' : 'bg-warning/50'
                }`}>
                  {assignment.status}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {(!shiftsForDate || shiftsForDate.length === 0) && (
          <div className="flex items-center justify-center h-full text-base-content/50 absolute inset-0">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No shifts scheduled for {selectedDate}</p>
              {hasManagerTag && (
                <button className="btn btn-sm btn-primary mt-2">
                  Create First Shift
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}