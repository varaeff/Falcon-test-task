import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bounds, duration, currentWeek } from '../src/domain/report.ts'

test('report clips intervals and includes an active timer only until now', () => {
  const range = [1000, 5000]
  const entry = { id: '1', employee_id: '1', description: 'task', started_at: new Date(0).toISOString(), ended_at: new Date(3000).toISOString() }
  assert.equal(duration(entry, range, 9000), 2000)
  assert.equal(duration({ ...entry, ended_at: null }, range, 4000), 3000)
  assert.equal(duration({ ...entry, ended_at: null }, range, 9000), 4000)
  assert.equal(duration(entry, [3000, 5000], 9000), 0)
})
test('calendar bounds use local days across daylight saving', () => {
  process.env.TZ = 'America/New_York'
  const range = bounds('2024-03-10', '2024-03-10')
  assert.ok(range)
  assert.equal(range[1] - range[0], 23 * 3600000)
  assert.equal(bounds('2024-03-11', '2024-03-10'), null)
  assert.equal(bounds('', '2024-03-10'), null)
  const [start, end] = currentWeek()
  assert.equal(new Date(`${start}T00:00:00`).getDay(), 1)
  assert.equal(new Date(`${end}T00:00:00`).getDay(), 0)
  process.env.TZ = 'Asia/Tbilisi'
  const tbilisi = bounds('2024-03-10', '2024-03-10')
  assert.ok(tbilisi)
  assert.equal(new Date(tbilisi[0]).toISOString(), '2024-03-09T20:00:00.000Z')
  assert.equal(tbilisi[1] - tbilisi[0], 24 * 3600000)
})
