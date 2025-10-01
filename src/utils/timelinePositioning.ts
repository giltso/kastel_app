/**
 * Timeline Positioning Utilities
 *
 * ALGORITHM: Time-based proportional width allocation
 * - Groups events by hourly time slots to detect concurrency
 * - Calculates dynamic width factors for each top-level event
 * - Allocates space proportionally based on width vs total concurrent width
 * - Events alone in a time slot get 100% width
 *
 * SEARCH KEYWORDS: proportional width, concurrent events, time slots,
 * width factors, top level events, positioning algorithm
 */

export interface TopLevelEvent {
  id: string;
  type: 'shift' | 'course' | 'rental';
  startHour: number;
  endHour: number;
  widthFactor: number;
  data: any;
}

export interface EventPosition {
  left: string;  // CSS percentage (e.g., "0%")
  width: string; // CSS percentage (e.g., "50%")
}

/**
 * Calculate width factor for different event types
 */
export function calculateWidthFactor(eventType: string, eventData: any, assignmentsForDate?: any[]): number {
  const BASE_FACTOR = 2; // Base width for all events

  switch (eventType) {
    case 'shift': {
      // Dynamic factor = number of workers assigned to this shift
      const workerCount = assignmentsForDate?.filter(
        assignment => assignment.shiftTemplateId === eventData._id
      ).length || 0;
      return BASE_FACTOR + workerCount;
    }
    case 'course': {
      // Courses use only base factor - students don't affect importance
      return BASE_FACTOR;
    }
    case 'rental': {
      // Rentals use only base factor - no dynamic modifier needed
      return BASE_FACTOR;
    }
    default:
      return BASE_FACTOR;
  }
}

/**
 * Convert shifts, courses, and rentals to top-level events with width factors
 */
export function createTopLevelEvents(
  shiftsForDate: any[],
  coursesForDate: any[],
  rentalsForDate: any[],
  assignmentsForDate: any[]
): TopLevelEvent[] {
  const events: TopLevelEvent[] = [];

  // Add shifts as top-level events
  if (shiftsForDate) {
    shiftsForDate.forEach(shift => {
      events.push({
        id: shift._id,
        type: 'shift',
        startHour: parseInt(shift.storeHours.openTime.split(':')[0]),
        endHour: parseInt(shift.storeHours.closeTime.split(':')[0]),
        widthFactor: calculateWidthFactor('shift', shift, assignmentsForDate),
        data: shift
      });
    });
  }

  // Add courses as top-level events
  if (coursesForDate) {
    coursesForDate.forEach(course => {
      const endTime = course.schedule.endTime.split(':');
      const endHour = parseInt(endTime[0]);
      const endMinutes = parseInt(endTime[1]);

      events.push({
        id: course._id,
        type: 'course',
        startHour: parseInt(course.schedule.startTime.split(':')[0]),
        endHour: endHour + (endMinutes > 0 ? 1 : 0), // Round up if there are minutes
        widthFactor: calculateWidthFactor('course', course),
        data: course
      });
    });
  }

  // Add rentals as top-level events (span entire day)
  if (rentalsForDate) {
    rentalsForDate.forEach(rental => {
      events.push({
        id: rental._id,
        type: 'rental',
        startHour: 8, // Start of business day
        endHour: 20, // End of business day
        widthFactor: calculateWidthFactor('rental', rental),
        data: rental
      });
    });
  }

  return events;
}

/**
 * Group events by hourly time slots to detect concurrency
 * Returns Map<hour, events[]> for each hour that has events
 */
export function groupEventsByHour(events: TopLevelEvent[]): Map<number, TopLevelEvent[]> {
  const hourlyEvents = new Map<number, TopLevelEvent[]>();

  events.forEach(event => {
    // For each hour this event spans, add it to that hour's group
    for (let hour = event.startHour; hour < event.endHour; hour++) {
      if (!hourlyEvents.has(hour)) {
        hourlyEvents.set(hour, []);
      }
      hourlyEvents.get(hour)!.push(event);
    }
  });

  return hourlyEvents;
}

/**
 * Calculate positions for events using time-based proportional width allocation
 *
 * ALGORITHM:
 * 1. Group events by hourly time slots
 * 2. For each time slot, calculate total width factor
 * 3. Assign proportional space based on individual vs total width
 * 4. Events spanning multiple hours maintain consistent positioning
 * 5. Account for padding in positioning calculations
 */
export function calculateEventPositions(events: TopLevelEvent[], paddingPx: number = 5): Map<string, EventPosition> {
  const positions = new Map<string, EventPosition>();
  const hourlyEvents = groupEventsByHour(events);

  // Process each unique event to determine its position
  events.forEach(event => {
    // Find the time period where this event has the most concurrent events
    // This determines the narrowest space allocation this event will have
    let maxConcurrentWidth = 0;
    let eventWidthPercentage = 100; // Default to full width if no concurrency
    let eventLeftPercentage = 0;

    for (let hour = event.startHour; hour < event.endHour; hour++) {
      const concurrentEvents = hourlyEvents.get(hour) || [];
      const totalWidthFactor = concurrentEvents.reduce((sum, e) => sum + e.widthFactor, 0);

      if (totalWidthFactor > maxConcurrentWidth) {
        maxConcurrentWidth = totalWidthFactor;

        // Calculate this event's position within the concurrent group
        const sortedEvents = concurrentEvents.sort((a, b) => a.startHour - b.startHour || a.id.localeCompare(b.id));
        const eventIndex = sortedEvents.findIndex(e => e.id === event.id);

        // Calculate available space after accounting for padding between events
        const totalPaddingSpace = (concurrentEvents.length - 1) * (paddingPx * 2); // Each event has padding on both sides
        const availableSpacePercentage = 100 - (totalPaddingSpace / 10); // Approximate conversion to percentage

        // Calculate left position: sum of widths of events before this one + padding
        const widthsBeforeEvent = sortedEvents.slice(0, eventIndex).reduce((sum, e) => sum + e.widthFactor, 0);
        const paddingBeforeEvent = eventIndex * (paddingPx * 2); // Padding for each previous event
        eventLeftPercentage = (widthsBeforeEvent / totalWidthFactor) * availableSpacePercentage + (paddingBeforeEvent / 10);

        // Calculate width: this event's proportion of available space
        eventWidthPercentage = (event.widthFactor / totalWidthFactor) * availableSpacePercentage;
      }
    }

    positions.set(event.id, {
      left: `${eventLeftPercentage}%`,
      width: `${eventWidthPercentage}%`
    });
  });

  return positions;
}

/**
 * Main function to calculate all event positions
 */
export function calculateTimelinePositions(
  shiftsForDate: any[],
  coursesForDate: any[],
  rentalsForDate: any[],
  assignmentsForDate: any[],
  paddingPx: number = 5
): {
  events: TopLevelEvent[];
  positions: Map<string, EventPosition>;
} {
  const events = createTopLevelEvents(shiftsForDate, coursesForDate, rentalsForDate, assignmentsForDate);
  const positions = calculateEventPositions(events, paddingPx);

  return { events, positions };
}