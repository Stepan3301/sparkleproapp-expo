/** Business rules from client brief (June 2026) */

export const MIN_BOOKING_HOURS = 2;
export const WINDOW_HOURLY_RATE = 50;
export const WEEKEND_SURCHARGE_PER_HOUR = 5;

/** Work day: 07:30 – 19:00. Last start = 19:00 − duration */
export const BUSINESS_OPEN = { hour: 7, minute: 30 };
export const BUSINESS_CLOSE = { hour: 19, minute: 0 };

export const HOURLY_RATES_CLIENT = {
  regular: { with_materials: 45, without_materials: 35 },
  deep: { with_materials: 55, without_materials: 45 },
} as const;

export function isWeekendDate(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function getWeekendSurcharge(isoDate: string, durationHours: number): number {
  if (!isoDate || durationHours < 1) return 0;
  return isWeekendDate(isoDate) ? durationHours * WEEKEND_SURCHARGE_PER_HOUR : 0;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatTimeLabelFromMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${dh}:00 ${period}` : `${dh}:${String(m).padStart(2, '0')} ${period}`;
}

export function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
