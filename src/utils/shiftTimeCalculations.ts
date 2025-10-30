/**
 * Shift Time Calculations
 *
 * Utility functions for calculating time differences for shift assignments.
 *
 * NOTE: These functions are duplicated in convex/shift_assignments.ts because
 * Convex backend cannot import from src/ directory. The logic here is identical
 * and serves as the tested reference implementation. When updating time-based
 * approval logic, update both files and ensure tests pass.
 *
 * Related: convex/shift_assignments.ts - Backend implementation
 * Tests: src/utils/shiftTimeCalculations.test.ts - 39 comprehensive tests
 */

/**
 * Calculate hours until shift start time
 *
 * @param shiftDate - ISO date string (YYYY-MM-DD)
 * @param shiftStartTime - Time string (HH:MM)
 * @returns Number of hours between now and shift start (can be negative if shift is in past)
 *
 * @example
 * getHoursUntilShift('2025-11-05', '08:00') // Returns hours until Nov 5, 2025 at 8:00 AM
 * getHoursUntilShift('2025-10-28', '14:30') // Returns negative number if Oct 28, 2025 2:30 PM has passed
 */
export function getHoursUntilShift(shiftDate: string, shiftStartTime: string): number {
  const [year, month, day] = shiftDate.split('-').map(Number);
  const [hours, minutes] = shiftStartTime.split(':').map(Number);

  // Create date object using local time
  const shiftStartDateTime = new Date(year, month - 1, day, hours, minutes);

  const now = Date.now();
  const millisecondsUntilShift = shiftStartDateTime.getTime() - now;

  return millisecondsUntilShift / (1000 * 60 * 60); // Convert to hours
}

/**
 * Check if assignment should auto-approve based on manager assignment rules
 *
 * @param shiftDate - ISO date string (YYYY-MM-DD)
 * @param shiftStartTime - Time string (HH:MM)
 * @returns true if >48 hours until shift start (should auto-approve)
 */
export function shouldAutoApproveManagerAssignment(shiftDate: string, shiftStartTime: string): boolean {
  const hoursUntilShift = getHoursUntilShift(shiftDate, shiftStartTime);
  return hoursUntilShift > 48;
}

/**
 * Check if worker request should auto-approve based on worker request rules
 *
 * @param shiftDate - ISO date string (YYYY-MM-DD)
 * @param shiftStartTime - Time string (HH:MM)
 * @returns true if >120 hours (5 days) until shift start (should auto-approve)
 */
export function shouldAutoApproveWorkerRequest(shiftDate: string, shiftStartTime: string): boolean {
  const hoursUntilShift = getHoursUntilShift(shiftDate, shiftStartTime);
  return hoursUntilShift > 120;
}

/**
 * Check if worker can edit assignment based on timing rules
 *
 * @param shiftDate - ISO date string (YYYY-MM-DD)
 * @param shiftStartTime - Time string (HH:MM)
 * @returns true if >48 hours until shift start (worker can edit)
 */
export function canWorkerEditAssignment(shiftDate: string, shiftStartTime: string): boolean {
  const hoursUntilShift = getHoursUntilShift(shiftDate, shiftStartTime);
  return hoursUntilShift > 48;
}
