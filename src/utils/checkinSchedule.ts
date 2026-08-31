const NEW_YORK_TIME_ZONE = 'America/New_York';
const CHECKIN_RESET_HOUR = 8;

function getPart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value;
}

/** Returns the New York business date for the 08:00 daily check-in reset. */
export function getNewYorkCheckinDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const year = getPart(parts, 'year')!;
  const month = getPart(parts, 'month')!;
  const day = getPart(parts, 'day')!;
  const hour = Number(getPart(parts, 'hour'));

  if (hour >= CHECKIN_RESET_HOUR) {
    return `${year}-${month}-${day}`;
  }

  const previousDay = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) - 1),
  );
  return previousDay.toISOString().slice(0, 10);
}
