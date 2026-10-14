const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function formatDate(isoDate: string): string {
  return dateFmt.format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function isOverdue(isoDate: string, now = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return isoDate < today;
}
