import { describe, it, expect } from 'vitest';
import {
  calculateWidthFactor,
  createTopLevelEvents,
  groupEventsByHour,
  calculateEventPositions,
  calculateTimelinePositions,
  type TopLevelEvent,
} from './timelinePositioning';

describe('timelinePositioning', () => {
  describe('calculateWidthFactor', () => {
    it('should return base factor + worker count for shifts', () => {
      const shift = { _id: 'shift1', name: 'Morning Shift' };
      const assignments = [
        { shiftTemplateId: 'shift1', workerId: 'worker1' },
        { shiftTemplateId: 'shift1', workerId: 'worker2' },
        { shiftTemplateId: 'shift2', workerId: 'worker3' },
      ];

      const result = calculateWidthFactor('shift', shift, assignments);
      expect(result).toBe(4); // BASE_FACTOR (2) + 2 workers
    });

    it('should return base factor for shifts with no assignments', () => {
      const shift = { _id: 'shift1', name: 'Morning Shift' };
      const result = calculateWidthFactor('shift', shift, []);
      expect(result).toBe(2); // BASE_FACTOR only
    });

    it('should return base factor for courses', () => {
      const course = { _id: 'course1', name: 'Woodworking 101' };
      const result = calculateWidthFactor('course', course);
      expect(result).toBe(2); // BASE_FACTOR only
    });

    it('should return base factor for rentals', () => {
      const rental = { _id: 'rental1', toolId: 'tool1' };
      const result = calculateWidthFactor('rental', rental);
      expect(result).toBe(2); // BASE_FACTOR only
    });

    it('should return base factor for unknown event types', () => {
      const event = { _id: 'event1' };
      const result = calculateWidthFactor('unknown', event);
      expect(result).toBe(2); // BASE_FACTOR only
    });
  });

  describe('createTopLevelEvents', () => {
    it('should create shift events with correct time parsing', () => {
      const shifts = [
        {
          _id: 'shift1',
          name: 'Morning',
          storeHours: { openTime: '09:00', closeTime: '13:00' },
        },
      ];

      const result = createTopLevelEvents(shifts, [], [], []);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'shift1',
        type: 'shift',
        startHour: 9,
        endHour: 13,
        widthFactor: 2,
      });
    });

    it('should create course events with end time rounding', () => {
      const courses = [
        {
          _id: 'course1',
          schedule: { startTime: '10:00', endTime: '12:30' },
        },
      ];

      const result = createTopLevelEvents([], courses, [], []);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'course1',
        type: 'course',
        startHour: 10,
        endHour: 13, // 12:30 rounds up to 13
      });
    });

    it('should not round up course end time when minutes are 0', () => {
      const courses = [
        {
          _id: 'course1',
          schedule: { startTime: '10:00', endTime: '12:00' },
        },
      ];

      const result = createTopLevelEvents([], courses, [], []);

      expect(result[0].endHour).toBe(12); // No rounding
    });

    it('should create rental events spanning full business day', () => {
      const rentals = [{ _id: 'rental1', toolId: 'tool1' }];

      const result = createTopLevelEvents([], [], rentals, []);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'rental1',
        type: 'rental',
        startHour: 8,
        endHour: 20,
      });
    });

    it('should handle multiple events of different types', () => {
      const shifts = [
        { _id: 'shift1', name: 'Morning', storeHours: { openTime: '09:00', closeTime: '13:00' } },
      ];
      const courses = [
        { _id: 'course1', schedule: { startTime: '10:00', endTime: '12:00' } },
      ];
      const rentals = [{ _id: 'rental1', toolId: 'tool1' }];

      const result = createTopLevelEvents(shifts, courses, rentals, []);

      expect(result).toHaveLength(3);
      expect(result.map(e => e.type)).toEqual(['shift', 'course', 'rental']);
    });

    it('should handle null/undefined arrays gracefully', () => {
      const result = createTopLevelEvents([], [], [], []);
      expect(result).toEqual([]);
    });
  });

  describe('groupEventsByHour', () => {
    it('should group single event by its hours', () => {
      const events: TopLevelEvent[] = [
        {
          id: 'event1',
          type: 'shift',
          startHour: 9,
          endHour: 12,
          widthFactor: 2,
          data: {},
        },
      ];

      const result = groupEventsByHour(events);

      expect(result.size).toBe(3); // Hours 9, 10, 11
      expect(result.get(9)).toHaveLength(1);
      expect(result.get(10)).toHaveLength(1);
      expect(result.get(11)).toHaveLength(1);
      expect(result.get(12)).toBeUndefined(); // End hour is exclusive
    });

    it('should group overlapping events correctly', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 12, widthFactor: 2, data: {} },
        { id: 'event2', type: 'course', startHour: 10, endHour: 13, widthFactor: 2, data: {} },
      ];

      const result = groupEventsByHour(events);

      expect(result.get(9)).toHaveLength(1); // Only event1
      expect(result.get(10)).toHaveLength(2); // Both events
      expect(result.get(11)).toHaveLength(2); // Both events
      expect(result.get(12)).toHaveLength(1); // Only event2
    });

    it('should handle non-overlapping events', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 11, widthFactor: 2, data: {} },
        { id: 'event2', type: 'shift', startHour: 14, endHour: 16, widthFactor: 2, data: {} },
      ];

      const result = groupEventsByHour(events);

      expect(result.size).toBe(4); // Hours 9, 10, 14, 15
      expect(result.get(11)).toBeUndefined();
      expect(result.get(12)).toBeUndefined();
      expect(result.get(13)).toBeUndefined();
    });

    it('should handle empty events array', () => {
      const result = groupEventsByHour([]);
      expect(result.size).toBe(0);
    });
  });

  describe('calculateEventPositions', () => {
    it('should give full width to single event', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 12, widthFactor: 2, data: {} },
      ];

      const result = calculateEventPositions(events, 0);

      expect(result.get('event1')).toEqual({
        left: '0%',
        width: '100%',
      });
    });

    it('should split width equally for two events with same width factor', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 12, widthFactor: 2, data: {} },
        { id: 'event2', type: 'course', startHour: 9, endHour: 12, widthFactor: 2, data: {} },
      ];

      const result = calculateEventPositions(events, 0);

      // Each event should get approximately 50% width (minus padding)
      const event1Pos = result.get('event1');
      const event2Pos = result.get('event2');

      expect(event1Pos).toBeDefined();
      expect(event2Pos).toBeDefined();

      // First event should start at 0%
      expect(parseFloat(event1Pos!.left)).toBe(0);
      // Both should have equal width
      expect(event1Pos!.width).toBe(event2Pos!.width);
    });

    it('should allocate proportional width based on width factors', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 12, widthFactor: 3, data: {} },
        { id: 'event2', type: 'course', startHour: 9, endHour: 12, widthFactor: 1, data: {} },
      ];

      const result = calculateEventPositions(events, 0);

      // Event1 should get 75% (3/4), Event2 should get 25% (1/4)
      const event1Width = parseFloat(result.get('event1')!.width);
      const event2Width = parseFloat(result.get('event2')!.width);

      // Check proportions (allow small rounding differences)
      expect(event1Width / event2Width).toBeCloseTo(3, 0);
    });

    it('should handle partially overlapping events', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 9, endHour: 13, widthFactor: 2, data: {} },
        { id: 'event2', type: 'course', startHour: 11, endHour: 14, widthFactor: 2, data: {} },
      ];

      const result = calculateEventPositions(events, 0);

      // Both events should have valid positions
      expect(result.get('event1')).toBeDefined();
      expect(result.get('event2')).toBeDefined();

      // Positions should be different
      expect(result.get('event1')).not.toEqual(result.get('event2'));
    });
  });

  describe('calculateTimelinePositions', () => {
    it('should integrate all functions correctly', () => {
      const shifts = [
        { _id: 'shift1', name: 'Morning', storeHours: { openTime: '09:00', closeTime: '13:00' } },
      ];
      const courses = [
        { _id: 'course1', schedule: { startTime: '10:00', endTime: '12:00' } },
      ];
      const rentals = [{ _id: 'rental1', toolId: 'tool1' }];
      const assignments = [
        { shiftTemplateId: 'shift1', workerId: 'worker1' },
      ];

      const result = calculateTimelinePositions(shifts, courses, rentals, assignments, 5);

      expect(result.events).toHaveLength(3);
      expect(result.positions.size).toBe(3);

      // All events should have positions
      result.events.forEach(event => {
        expect(result.positions.get(event.id)).toBeDefined();
      });
    });

    it('should apply custom padding', () => {
      const shifts = [
        { _id: 'shift1', name: 'Morning', storeHours: { openTime: '09:00', closeTime: '13:00' } },
      ];

      const resultWithPadding = calculateTimelinePositions(shifts, [], [], [], 10);
      const resultWithoutPadding = calculateTimelinePositions(shifts, [], [], [], 0);

      // Both should produce valid results
      expect(resultWithPadding.positions.size).toBe(1);
      expect(resultWithoutPadding.positions.size).toBe(1);
    });

    it('should handle empty inputs', () => {
      const result = calculateTimelinePositions([], [], [], [], 5);

      expect(result.events).toEqual([]);
      expect(result.positions.size).toBe(0);
    });
  });

  describe('edge cases and type safety', () => {
    it('should handle malformed time strings gracefully', () => {
      const shifts = [
        { _id: 'shift1', name: 'Morning', storeHours: { openTime: '9:00', closeTime: '13:00' } },
      ];

      const result = createTopLevelEvents(shifts, [], [], []);

      expect(result[0].startHour).toBe(9);
      expect(result[0].endHour).toBe(13);
    });

    it('should handle very short events (1 hour)', () => {
      const events: TopLevelEvent[] = [
        { id: 'event1', type: 'shift', startHour: 10, endHour: 11, widthFactor: 2, data: {} },
      ];

      const result = groupEventsByHour(events);

      expect(result.size).toBe(1);
      expect(result.get(10)).toHaveLength(1);
    });

    it('should maintain type safety with complex event data', () => {
      const complexShift = {
        _id: 'shift1',
        name: 'Complex Shift',
        storeHours: { openTime: '09:00', closeTime: '17:00' },
        metadata: { location: 'Store A', type: 'regular' },
      };

      const result = createTopLevelEvents([complexShift], [], [], []);

      expect(result[0].data).toEqual(complexShift);
      expect(result[0].data.metadata).toBeDefined();
    });
  });
});
