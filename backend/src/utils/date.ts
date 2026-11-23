/**
 * Calculates the current calendar week range (Monday 00:00:00.000 to Sunday 23:59:59.999)
 * strictly in the 'Asia/Kolkata' timezone, regardless of the server's local timezone.
 */
export function getKolkataCalendarWeekRange(referenceDate: Date = new Date()): {
  startOfWeek: Date;
  endOfWeek: Date;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const daysSinceMonday = weekdayMap[partMap['weekday']] ?? 0;
  const year = parseInt(partMap['year'], 10);
  const month = parseInt(partMap['month'], 10) - 1; // 0-based month
  const day = parseInt(partMap['day'], 10);

  // Kolkata date components: Monday 00:00:00 IST
  // Since IST is UTC+05:30, 00:00:00 IST corresponds to previous day 18:30:00 UTC
  const kolkataMondayUTC = Date.UTC(year, month, day - daysSinceMonday, 0, 0, 0, 0);
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const startOfWeek = new Date(kolkataMondayUTC - istOffsetMs);

  // Sunday 23:59:59.999 IST
  const kolkataSundayUTC = Date.UTC(year, month, day - daysSinceMonday + 6, 23, 59, 59, 999);
  const endOfWeek = new Date(kolkataSundayUTC - istOffsetMs);

  return { startOfWeek, endOfWeek };
}
