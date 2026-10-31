import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { bounds, currentWeek, duration } from '../domain/report';
import type { Entry, Session } from '../types';

export function useReport(entries: Ref<Entry[]>, session: Ref<Session | null>) {
  const now = ref(Date.now());
  const [initialFrom, initialTo] = currentWeek();
  const from = ref(initialFrom);
  const to = ref(initialTo);
  const range = computed(() => bounds(from.value, to.value));
  const active = computed(() =>
    entries.value.find(
      (item) => item.employee_id === session.value?.employee && !item.ended_at
    )
  );
  const visible = computed(() => {
    const period = range.value;
    return period
      ? entries.value.filter((item) => duration(item, period, now.value) > 0)
      : [];
  });

  function total(id: string) {
    const period = range.value;
    return period
      ? visible.value
          .filter((item) => item.employee_id === id)
          .reduce((sum, item) => sum + duration(item, period, now.value), 0)
      : 0;
  }

  function entryDuration(entry: Entry) {
    const period = range.value;
    return period ? duration(entry, period, now.value) : 0;
  }

  let clock: ReturnType<typeof setInterval>;
  onMounted(() => {
    clock = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onUnmounted(() => clearInterval(clock));

  return { now, from, to, range, active, visible, total, entryDuration };
}
