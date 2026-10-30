import type { Entry } from '../types'

export function dateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export function currentWeek(): [string, string] {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return [dateInput(start), dateInput(end)]
}
export function bounds(from: string, to: string): [number, number] | null {
  if (!from || !to || from > to) return null
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  end.setDate(end.getDate() + 1)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null
  return [start.getTime(), end.getTime()]
}
export function duration(entry: Entry, range: [number, number], now: number): number {
  const end = entry.ended_at ? Date.parse(entry.ended_at) : now
  return Math.max(0, Math.min(end, range[1]) - Math.max(Date.parse(entry.started_at), range[0]))
}
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 3600)} ч ${String(Math.floor(seconds / 60) % 60).padStart(2, '0')} мин ${String(seconds % 60).padStart(2, '0')} с`
}
export function localDateTime(value: string): string {
  const date = new Date(value)
  return `${dateInput(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}
