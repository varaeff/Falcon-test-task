import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { duration } from '../domain/report';
import type { Employee, Entry } from '../types';

export function useReport(
  entries: Ref<Entry[]>,
  employees: Ref<Employee[]>,
  range: Ref<[number, number] | null>
) {
  const now = ref(Date.now());
  const groups = computed(() => {
    const groups = employees.value.map((person) => ({
      person,
      entries: [] as { entry: Entry; elapsed: number }[],
      total: 0,
    }));
    const byId = new Map(groups.map((group) => [group.person.id, group]));
    if (!range.value) return groups;
    for (const entry of entries.value) {
      const group = byId.get(entry.employee_id);
      const elapsed = duration(entry, range.value, now.value);
      if (group && elapsed > 0) {
        group.entries.push({ entry, elapsed });
        group.total += elapsed;
      }
    }
    return groups;
  });
  let clock: ReturnType<typeof setInterval>;
  onMounted(() => {
    clock = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onUnmounted(() => clearInterval(clock));
  return { now, groups };
}
