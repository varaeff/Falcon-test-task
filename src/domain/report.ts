import type { Entry, Interval } from '../types';

export function dateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function currentWeek(): [string, string] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return [dateInput(start), dateInput(end)];
}
export function bounds(from: string, to: string): [number, number] | null {
  if (!from || !to || from > to) return null;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  return [start.getTime(), end.getTime()];
}
export function duration(entry: Entry, range: [number, number], now: number): number {
  const end = entry.ended_at ? Date.parse(entry.ended_at) : now;
  return Math.max(
    0,
    Math.min(end, range[1]) - Math.max(Date.parse(entry.started_at), range[0])
  );
}
function durationParts(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}
export function formatDuration(milliseconds: number): string {
  const { hours, minutes, seconds } = durationParts(milliseconds);
  return `${hours} ч ${String(minutes).padStart(2, '0')} мин ${String(seconds).padStart(2, '0')} с`;
}
export function formatCompactDuration(milliseconds: number): string {
  const { hours, minutes, seconds } = durationParts(milliseconds);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ч`);
  if (minutes) parts.push(`${minutes} мин`);
  if (seconds || !parts.length)
    parts.push(`${parts.length ? String(seconds).padStart(2, '0') : seconds} с`);
  return parts.join(' ');
}
export function localDateTime(value: string): string {
  const date = new Date(value);
  return `${dateInput(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function validateEntryInterval(
  start: string,
  end: string,
  entry: Entry,
  entries: Interval[],
  now: number
) {
  const from = Date.parse(start);
  const to = Date.parse(end);
  let invalidStart = !Number.isFinite(from) || from > now;
  let invalidEnd = !Number.isFinite(to) || to > now;
  if (Number.isFinite(from) && Number.isFinite(to)) {
    if (to <= from) invalidStart = invalidEnd = true;
    else
      for (const other of entries) {
        if (other.id === entry.id || other.employee_id !== entry.employee_id) continue;
        const otherStart = Date.parse(other.started_at);
        const otherEnd = other.ended_at ? Date.parse(other.ended_at) : Infinity;
        if (from < otherEnd && to > otherStart) {
          if (from >= otherStart && from < otherEnd) invalidStart = true;
          if (to > otherStart && to <= otherEnd) invalidEnd = true;
          if (from <= otherStart && to >= otherEnd) invalidStart = invalidEnd = true;
        }
      }
  }
  return { invalidStart, invalidEnd };
}
