/**
 * Belajar-Ku Date Utilities
 * Ensures timezone-safe day of week mapping and availability checking.
 * Schema dayOfWeek mapping: 1 (Senin) .. 7 (Minggu)
 */

export const DAY_NAMES: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

/**
 * Converts a YYYY-MM-DD date string to a timezone-safe dayOfWeek number (1 = Senin .. 7 = Minggu).
 * Avoids local timezone shift errors by using Date.UTC.
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] || '1970', 10);
  const month = parseInt(parts[1] || '1', 10);
  const day = parseInt(parts[2] || '1', 10);

  const d = new Date(Date.UTC(year, month - 1, day));
  const jsDay = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Checks whether a requested slot matches a tutor's availability.
 */
export function isSlotMatchingAvailability(
  slot: { date: string; startTime: string; endTime: string },
  availability: { dayOfWeek: number; startTime: string; endTime: string }
): boolean {
  const slotDayOfWeek = getDayOfWeekFromDateString(slot.date);
  if (slotDayOfWeek !== availability.dayOfWeek) {
    return false;
  }

  // Matches exact time OR falls within the availability window OR matches start time
  return (
    (slot.startTime === availability.startTime && slot.endTime === availability.endTime) ||
    (slot.startTime >= availability.startTime && slot.endTime <= availability.endTime) ||
    slot.startTime === availability.startTime
  );
}
