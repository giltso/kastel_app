import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LUZWeekView } from './LUZWeekView';

/**
 * Integration tests for LUZWeekView component
 *
 * These tests verify click-to-create functionality on empty days
 * and ensure manager permissions work correctly.
 */

describe('LUZWeekView', () => {
  const mockGetShiftStaffingStatus = vi.fn(() => ({
    status: 'staffed',
    currentWorkers: 2,
    minWorkers: 2,
    maxWorkers: 4,
  }));

  const weekDates = [
    '2025-10-06', // Mon
    '2025-10-07', // Tue
    '2025-10-08', // Wed
    '2025-10-09', // Thu
    '2025-10-10', // Fri
    '2025-10-11', // Sat (empty)
    '2025-10-12', // Sun
  ];

  const mockShift = {
    _id: 'shift1',
    name: 'Morning Shift',
    storeHours: { openTime: '09:00', closeTime: '13:00' },
    hourlyRequirements: [
      { startTime: '09:00', endTime: '13:00', minWorkers: 2, maxWorkers: 4 },
    ],
    recurringDays: [1, 2, 3, 4, 5, 0], // Mon-Sun except Sat
  };

  const shiftsForWeek = {
    '2025-10-06': [mockShift],
    '2025-10-07': [mockShift],
    '2025-10-08': [mockShift],
    '2025-10-09': [mockShift],
    '2025-10-10': [mockShift],
    '2025-10-11': [], // Saturday - empty
    '2025-10-12': [mockShift],
  };

  const mockProps = {
    weekDates,
    shiftsForWeek,
    coursesForWeek: {},
    rentalsForWeek: {},
    assignmentsForWeek: {},
    hasManagerTag: false,
    getShiftStaffingStatus: mockGetShiftStaffingStatus,
  };

  describe('Empty Day Click-to-Create', () => {
    it('should show "No events" message on empty days', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
        />
      );

      // Saturday should show "No events"
      const noEventsText = screen.getByText('No events');
      expect(noEventsText).toBeInTheDocument();
    });

    it('should show "+" icon for managers on empty days', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          onCreateShift={vi.fn()}
        />
      );

      // Should show + icon (rendered as text content)
      const plusIcon = screen.getByText('+');
      expect(plusIcon).toBeInTheDocument();
    });

    it('should NOT show "+" icon for non-managers', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={false}
        />
      );

      // Should not show + icon for non-managers
      expect(screen.queryByText('+')).not.toBeInTheDocument();
    });

    it('should NOT show "+" icon when onCreateShift prop is missing', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          // onCreateShift intentionally omitted
        />
      );

      // Should not show + icon without handler
      expect(screen.queryByText('+')).not.toBeInTheDocument();
    });

    it('should call onCreateShift when clicking empty day area', async () => {
      const onCreateShift = vi.fn();
      const user = userEvent.setup();

      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          onCreateShift={onCreateShift}
        />
      );

      // Find the empty day container by looking for "No events" text
      const noEventsContainer = screen.getByText('No events').parentElement?.parentElement;
      expect(noEventsContainer).toBeTruthy();

      // Click the empty day
      if (noEventsContainer) {
        await user.click(noEventsContainer);
      }

      expect(onCreateShift).toHaveBeenCalledTimes(1);
    });

    it('should have hover effect on clickable empty days', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          onCreateShift={vi.fn()}
        />
      );

      // Find empty day container
      const noEventsContainer = screen.getByText('No events').parentElement?.parentElement;
      expect(noEventsContainer).toBeTruthy();

      // Should have cursor-pointer class
      expect(noEventsContainer?.className).toContain('cursor-pointer');
      expect(noEventsContainer?.className).toContain('hover:bg-base-200/30');
    });

    it('should have tooltip on empty day', () => {
      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          onCreateShift={vi.fn()}
        />
      );

      // Find empty day container with title attribute
      const emptyDayElement = screen.getByTitle('Click to create a new shift');
      expect(emptyDayElement).toBeInTheDocument();
    });

    it('CRITICAL: should require both hasManagerTag and onCreateShift for clickable empty state', () => {
      const onCreateShift = vi.fn();

      render(
        <LUZWeekView
          {...mockProps}
          hasManagerTag={true}
          onCreateShift={onCreateShift}
        />
      );

      // Verify both props are present
      expect(onCreateShift).toBeDefined();

      // Verify clickable empty state exists
      const emptyDayElement = screen.getByTitle('Click to create a new shift');
      expect(emptyDayElement).toBeInTheDocument();
    });
  });

  describe('Shift Display', () => {
    it('should display shifts for each day', () => {
      render(<LUZWeekView {...mockProps} />);

      // Should show shift names (multiple instances for different days)
      const shiftElements = screen.getAllByText('Morning Shift');
      expect(shiftElements.length).toBeGreaterThan(0);
    });

    it('should call onShiftClick when clicking a shift', async () => {
      const onShiftClick = vi.fn();
      const user = userEvent.setup();

      render(
        <LUZWeekView
          {...mockProps}
          onShiftClick={onShiftClick}
        />
      );

      // Find first shift
      const shiftElements = screen.getAllByText('Morning Shift');
      const firstShift = shiftElements[0].closest('div[class*="cursor-pointer"]');

      if (firstShift) {
        await user.click(firstShift);
      }

      expect(onShiftClick).toHaveBeenCalledWith('shift1', expect.any(String));
    });
  });

  describe('Week View Layout', () => {
    it('should show all 7 days of the week', () => {
      render(<LUZWeekView {...mockProps} />);

      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('should show time labels', () => {
      render(<LUZWeekView {...mockProps} />);

      // Check for time labels
      expect(screen.getByText('8:00')).toBeInTheDocument();
      expect(screen.getByText('9:00')).toBeInTheDocument();
      expect(screen.getByText('19:00')).toBeInTheDocument();
    });

    it('should show weekly schedule title', () => {
      render(<LUZWeekView {...mockProps} />);

      expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    });
  });

  describe('Summary Stats', () => {
    it('should display total assignments stat', () => {
      render(<LUZWeekView {...mockProps} />);

      // Text is split by responsive <br>, so use function matcher to find correct element
      const assignmentsStat = screen.getByText((content, element) => {
        return element?.textContent === 'TotalAssignments' || element?.textContent === 'Total Assignments';
      });
      expect(assignmentsStat).toBeInTheDocument();
    });

    it('should display total shifts stat', () => {
      render(<LUZWeekView {...mockProps} />);

      // Text is split by responsive <br>, so use function matcher to find correct element
      const shiftsStat = screen.getByText((content, element) => {
        return element?.textContent === 'TotalShifts' || element?.textContent === 'Total Shifts';
      });
      expect(shiftsStat).toBeInTheDocument();
    });

    it('should display total courses stat', () => {
      render(<LUZWeekView {...mockProps} />);

      // Text is split by responsive <br>, so use function matcher to find correct element
      const coursesStat = screen.getByText((content, element) => {
        return element?.textContent === 'TotalCourses' || element?.textContent === 'Total Courses';
      });
      expect(coursesStat).toBeInTheDocument();
    });
  });
});
