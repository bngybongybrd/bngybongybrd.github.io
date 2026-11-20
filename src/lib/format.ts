// Date formatting shared by the trip components.
// Dates are written as plain days in the content files (2026-09-12), which
// JavaScript reads as midnight UTC, so we format in UTC to avoid showing the
// previous day in time zones behind UTC.

const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekdayDayMonth = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// "12 September 2026"
export const formatDate = (date: Date) => dayMonthYear.format(date);

// "Saturday 12 September"
export const formatDayDate = (date: Date) => weekdayDayMonth.format(date).replace(",", "");

// "12–21 September 2026", or "28 September – 3 October 2026" across months.
export function formatRange(start: Date, end: Date) {
  return dayMonthYear.formatRange(start, end);
}

// "2026-09-12", for the machine-readable <time datetime="..."> attribute.
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
