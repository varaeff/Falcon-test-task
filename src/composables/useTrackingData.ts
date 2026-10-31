import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { api } from '../api/tracking';
import type { Employee, Entry, Session } from '../types';

type Range = [number, number] | null;
export function useTrackingData(
  session: Ref<Session | null>,
  clearSession: () => void,
  range: Ref<Range>
) {
  const employee = ref<Employee | null>(null);
  const employees = ref<Employee[]>([]);
  const entries = ref<Entry[]>([]);
  const active = ref<Entry>();
  const error = ref('');
  const loading = ref(true);
  const refreshing = ref(false);
  const operation = ref('');
  const loaded = ref(false);
  let generation = 0;
  let mounted = true;
  let rangeChangedDuringAction = false;

  function resetData() {
    employee.value = null;
    entries.value = [];
    active.value = undefined;
  }
  function handleError(problem: unknown) {
    const message = problem instanceof Error ? problem.message : 'Неизвестная ошибка';
    if (message.includes('SESSION_REVOKED')) {
      clearSession();
      resetData();
      error.value = 'Сессия завершена: выполнен вход на другом устройстве.';
    } else error.value = message;
  }
  async function refresh(options: { afterAction?: boolean } = {}) {
    const request = ++generation;
    const current = session.value;
    const period = range.value;
    refreshing.value = true;
    try {
      const listPromise = api.employees();
      if (!current) {
        const list = await listPromise;
        if (!mounted || request !== generation || session.value) return false;
        employees.value = list;
      } else {
        const [person, list, records, running] = await Promise.all([
          api.session(current),
          listPromise,
          period
            ? api.report(
                current,
                new Date(period[0]).toISOString(),
                new Date(period[1]).toISOString()
              )
            : Promise.resolve([]),
          api.active(current),
        ]);
        if (!mounted || request !== generation || session.value?.token !== current.token)
          return false;
        if (!person) throw new Error('SESSION_REVOKED');
        employee.value = person;
        employees.value = list;
        entries.value = records;
        active.value = running;
      }
      error.value = '';
      loaded.value = true;
      return true;
    } catch (problem) {
      if (!mounted || request !== generation || session.value?.token !== current?.token)
        return false;
      handleError(problem);
      if (options.afterAction && !error.value.includes('Сессия завершена'))
        error.value = `Действие выполнено, но обновить данные не удалось: ${error.value}`;
      return false;
    } finally {
      if (mounted && request === generation) {
        refreshing.value = false;
        loading.value = false;
      }
    }
  }
  async function run(name: string, action: () => Promise<void>) {
    if (operation.value) return false;
    ++generation;
    refreshing.value = false;
    operation.value = name;
    error.value = '';
    try {
      await action();
    } catch (problem) {
      handleError(problem);
      if (rangeChangedDuringAction) {
        const actionError = error.value;
        rangeChangedDuringAction = false;
        if (await refresh()) error.value = actionError;
      }
      operation.value = '';
      return false;
    }
    rangeChangedDuringAction = false;
    await refresh({ afterAction: true });
    operation.value = '';
    return true;
  }
  function withSession(name: string, action: (current: Session) => Promise<void>) {
    const current = session.value;
    if (!current) return Promise.resolve(false);
    return run(name, () => action(current));
  }
  async function loadIntervals() {
    const current = session.value;
    if (!current) return null;
    try {
      const result = await api.intervals(current);
      return session.value?.token === current.token ? result : null;
    } catch (problem) {
      if (session.value?.token === current.token) handleError(problem);
      return null;
    }
  }
  let poll: ReturnType<typeof setInterval>;
  onMounted(() => {
    void refresh();
    poll = setInterval(() => {
      if (!operation.value && !refreshing.value) void refresh();
    }, 15000);
  });
  watch(range, () => {
    if (operation.value && !refreshing.value) rangeChangedDuringAction = true;
    if (mounted && (!operation.value || refreshing.value))
      void refresh({ afterAction: !!operation.value });
  });
  onUnmounted(() => {
    mounted = false;
    ++generation;
    clearInterval(poll);
  });
  return {
    employee,
    employees,
    entries,
    active,
    error,
    loading,
    refreshing,
    loaded,
    operation,
    resetData,
    run,
    withSession,
    refresh,
    loadIntervals,
  };
}
