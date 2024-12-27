export function getDayRange(date: any): { start: Date; end: Date } {
  let start = new Date(date);
  start.setHours(0, 0, 0, 0);

  let end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function convertDate(date: string): string {
  const parts = date.split("/");
  const y = parts[0];
  const m = parts[1].padStart(2, "0");
  const d = parts[2].padStart(2, "0");

  return `${y}-${m}-${d} 00:00:00`;
}
