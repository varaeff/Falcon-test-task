import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bounds,
  duration,
  currentWeek,
  formatCompactDuration,
  validateEntryInterval,
} from '../src/domain/report.ts';

test('entry validation checks future, ordering and all employee intervals', () => {
  const at = (hour) => `2024-01-01T${String(hour).padStart(2, '0')}:00:00Z`;
  const entry = {
    id: '1',
    employee_id: 'a',
    description: 'task',
    started_at: at(1),
    ended_at: at(2),
  };
  const other = { ...entry, id: '2', started_at: at(4), ended_at: at(6) };
  const active = { ...entry, id: '3', started_at: at(8), ended_at: null };
  const entries = [
    entry,
    other,
    active,
    { ...other, id: '4', employee_id: 'b', started_at: at(2), ended_at: at(4) },
  ];
  const check = (start, end) =>
    validateEntryInterval(at(start), at(end), entry, entries, Date.parse(at(10)));
  assert.deepEqual(check(2, 4), { invalidStart: false, invalidEnd: false });
  assert.deepEqual(check(5, 7), { invalidStart: true, invalidEnd: false });
  assert.deepEqual(check(3, 5), { invalidStart: false, invalidEnd: true });
  assert.deepEqual(check(3, 7), { invalidStart: true, invalidEnd: true });
  assert.deepEqual(check(7, 9), { invalidStart: false, invalidEnd: true });
  assert.deepEqual(check(9, 11), { invalidStart: true, invalidEnd: true });
  assert.deepEqual(check(3, 3), { invalidStart: true, invalidEnd: true });
});

test('compact duration omits zero units', () => {
  assert.equal(formatCompactDuration(1147000), '19 мин 07 с');
  assert.equal(formatCompactDuration(3607000), '1 ч 07 с');
  assert.equal(formatCompactDuration(60000), '1 мин');
  assert.equal(formatCompactDuration(0), '0 с');
});

test('report clips intervals and includes an active timer only until now', () => {
  const range = [1000, 5000];
  const entry = {
    id: '1',
    employee_id: '1',
    description: 'task',
    started_at: new Date(0).toISOString(),
    ended_at: new Date(3000).toISOString(),
  };
  assert.equal(duration(entry, range, 9000), 2000);
  assert.equal(duration({ ...entry, ended_at: null }, range, 4000), 3000);
  assert.equal(duration({ ...entry, ended_at: null }, range, 9000), 4000);
  assert.equal(duration(entry, [3000, 5000], 9000), 0);
});
test('calendar bounds use local days across daylight saving', () => {
  process.env.TZ = 'America/New_York';
  const range = bounds('2024-03-10', '2024-03-10');
  assert.ok(range);
  assert.equal(range[1] - range[0], 23 * 3600000);
  assert.equal(bounds('2024-03-11', '2024-03-10'), null);
  assert.equal(bounds('', '2024-03-10'), null);
  const [start, end] = currentWeek();
  assert.equal(new Date(`${start}T00:00:00`).getDay(), 1);
  assert.equal(new Date(`${end}T00:00:00`).getDay(), 0);
  process.env.TZ = 'Asia/Tbilisi';
  const tbilisi = bounds('2024-03-10', '2024-03-10');
  assert.ok(tbilisi);
  assert.equal(new Date(tbilisi[0]).toISOString(), '2024-03-09T20:00:00.000Z');
  assert.equal(tbilisi[1] - tbilisi[0], 24 * 3600000);
});
