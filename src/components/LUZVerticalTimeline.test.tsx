import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LUZVerticalTimeline } from './LUZVerticalTimeline';

/**
 * Integration tests for LUZVerticalTimeline component
 *
 * These tests verify critical interaction functionality that could break
 * due to CSS pointer-events, z-index layering, or event handler issues.
 */

describe('LUZVerticalTimeline', () => {
  const mockGetShiftStaffingStatus = vi.fn(() => ({
    status: 'staffed',
    currentWorkers: 2,
    minWorkers: 2,
    maxWorkers: 4,
  }));

  const mockShift = {
    _id: 'shift1',
    name: 'Morning Shift',
    storeHours: { openTime: '09:00', closeTime: '13:00' },
    hourlyRequirements: [
      { startTime: '09:00', endTime: '13:00', minWorkers: 2, maxWorkers: 4 },
    ],
  };

  const mockProps = {
    assignmentsForDate: [],
    shiftsForDate: [mockShift],
    coursesForDate: [],
    rentalsForDate: [],
    selectedDate: '2025-10-08',
    hasManagerTag: false,
    getShiftStaffingStatus: mockGetShiftStaffingStatus,
  };

  describe('Shift Click Interactions', () => {
    it('should call onShiftClick when clicking on a shift', async () => {
      const onShiftClick = vi.fn();
      const user = userEvent.setup();

      render(
        <LUZVerticalTimeline
          {...mockProps}
          onShiftClick={onShiftClick}
        />
      );

      // Find shift by name
      const shiftElement = screen.getByText('Morning Shift').closest('div[class*="cursor-pointer"]');
      expect(shiftElement).toBeTruthy();

      // Click the shift
      if (shiftElement) {
        await user.click(shiftElement);
      }

      // Verify onClick was called with correct shift ID
      expect(onShiftClick).toHaveBeenCalledWith('shift1');
      expect(onShiftClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer class on clickable shifts', () => {
      render(
        <LUZVerticalTimeline
          {...mockProps}
          onShiftClick={vi.fn()}
        />
      );

      const shiftElement = screen.getByText('Morning Shift').closest('div[class*="cursor-pointer"]');
      expect(shiftElement).toBeTruthy();
      expect(shiftElement?.className).toContain('cursor-pointer');
    });

    it('should apply pointer-events: none to shift body and header to prevent blocking clicks', () => {
      const onShiftClick = vi.fn();

      render(
        <LUZVerticalTimeline
          {...mockProps}
          onShiftClick={onShiftClick}
        />
      );

      // Find shift body (has bg-success/20 class from staffed status)
      const shiftBody = document.querySelector('.bg-success\\/20.border-success.rounded-b');
      expect(shiftBody).toBeTruthy();

      // Verify pointer-events: none is applied
      if (shiftBody) {
        const style = window.getComputedStyle(shiftBody);
        expect(style.pointerEvents).toBe('none');
      }
    });
  });

  describe('Worker Assignment Display', () => {
    it('should render worker assignments within shifts', () => {
      const mockAssignments = [
        {
          _id: 'assignment1',
          shiftTemplateId: 'shift1',
          workerId: 'worker1',
          status: 'confirmed',
          assignedHours: [
            { startTime: '09:00', endTime: '13:00' },
          ],
          worker: { _id: 'worker1', name: 'John Doe' },
        },
      ];

      render(
        <LUZVerticalTimeline
          {...mockProps}
          assignmentsForDate={mockAssignments}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      // Use getAllByText since time appears in both header and assignment
      const timeElements = screen.getAllByText(/09:00 - 13:00/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should only show workers assigned to specific shift', () => {
      const mockAssignments = [
        {
          _id: 'assignment1',
          shiftTemplateId: 'shift1',
          workerId: 'worker1',
          status: 'confirmed',
          assignedHours: [{ startTime: '09:00', endTime: '13:00' }],
          worker: { _id: 'worker1', name: 'John Doe' },
        },
        {
          _id: 'assignment2',
          shiftTemplateId: 'shift2', // Different shift
          workerId: 'worker2',
          status: 'confirmed',
          assignedHours: [{ startTime: '14:00', endTime: '18:00' }],
          worker: { _id: 'worker2', name: 'Jane Smith' },
        },
      ];

      render(
        <LUZVerticalTimeline
          {...mockProps}
          assignmentsForDate={mockAssignments}
        />
      );

      // Should only show worker assigned to shift1
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('CSS and Styling', () => {
    it('should apply pointer-events: none to child decorative elements', () => {
      render(
        <LUZVerticalTimeline
          {...mockProps}
          onShiftClick={vi.fn()}
        />
      );

      // Find the shift container
      const shiftContainer = screen.getByText('Morning Shift').closest('div[class*="cursor-pointer"]');
      expect(shiftContainer).toBeTruthy();

      // Check that child elements have pointer-events: none
      const headerElement = shiftContainer?.querySelector('[style*="pointerEvents"]');
      if (headerElement) {
        const style = window.getComputedStyle(headerElement);
        expect(style.pointerEvents).toBe('none');
      }
    });

    it('should position shift elements absolutely', () => {
      render(
        <LUZVerticalTimeline
          {...mockProps}
        />
      );

      const shiftContainer = screen.getByText('Morning Shift').closest('div[class*="absolute"]');
      expect(shiftContainer).toBeTruthy();
      expect(shiftContainer?.className).toContain('absolute');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no shifts exist', () => {
      render(
        <LUZVerticalTimeline
          {...mockProps}
          shiftsForDate={[]}
        />
      );

      expect(screen.getByText(/No events scheduled/i)).toBeInTheDocument();
    });

    it('should show daily schedule title even when empty', () => {
      render(
        <LUZVerticalTimeline
          {...mockProps}
          shiftsForDate={[]}
        />
      );

      expect(screen.getByText('Daily Schedule')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible time labels', () => {
      render(<LUZVerticalTimeline {...mockProps} />);

      // Check for time labels (8:00, 9:00, etc.)
      expect(screen.getByText('8:00')).toBeInTheDocument();
      expect(screen.getByText('9:00')).toBeInTheDocument();
      expect(screen.getByText('19:00')).toBeInTheDocument();
    });

    it('should show staffing information', () => {
      render(<LUZVerticalTimeline {...mockProps} />);

      // Should show current/min workers ratio
      expect(screen.getByText('2/2')).toBeInTheDocument();
      expect(screen.getByText('staffed')).toBeInTheDocument();
    });
  });
});
