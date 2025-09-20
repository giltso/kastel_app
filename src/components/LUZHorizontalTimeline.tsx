import { Calendar } from "lucide-react";

interface LUZHorizontalTimelineProps {
  assignmentsForDate: any[];
  shiftsForDate: any[];
  selectedDate: string;
  hasManagerTag: boolean;
}

export function LUZHorizontalTimeline({
  assignmentsForDate,
  shiftsForDate,
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

        {/* Timeline Grid */}
        <div className="relative min-h-[400px]">
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

            return (
              <div
                key={shift._id}
                className="absolute bg-primary/20 border-2 border-primary rounded p-2"
                style={{
                  left: `${((startCol - 1) / 12) * 100}%`,
                  width: `${(span / 12) * 100}%`,
                  top: `${shiftIndex * 120}px`,
                  height: `${Math.max(60, 30 + shiftWorkers.length * 25)}px`, // Dynamic height based on workers
                }}
              >
                {/* Shift Header */}
                <div className="font-medium text-sm">{shift.name}</div>
                <div className="text-xs text-base-content/70 mb-2">
                  {shift.storeHours.openTime} - {shift.storeHours.closeTime} • {shift.hourlyRequirements.reduce((sum, req) => sum + req.minWorkers, 0)} workers needed
                </div>

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
                          ? 'bg-success/40 border border-success text-success-content'
                          : 'bg-warning/40 border border-warning text-warning-content'
                      }`}
                      style={{
                        left: `${(workerStartCol / shiftSpan) * 100}%`,
                        width: `${(workerSpan / shiftSpan) * 100}%`,
                        top: `${30 + workerIndex * 25}px`,
                        height: '22px',
                      }}
                    >
                      <div className="text-xs font-medium truncate">
                        {assignment.worker?.name} ({assignment.assignedHours[0]?.startTime}-{assignment.assignedHours[0]?.endTime})
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Empty State */}
          {(!shiftsForDate || shiftsForDate.length === 0) && (
            <div className="flex items-center justify-center h-full text-base-content/50">
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
    </div>
  );
}