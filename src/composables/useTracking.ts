import { computed, ref } from 'vue';
import { useSession } from './useSession';
import { useTrackingData } from './useTrackingData';
import { useReport } from './useReport';
import { bounds, currentWeek } from '../domain/report';
import { api } from '../api/tracking';

export function useTracking() {
  const identity = useSession();
  const [initialFrom, initialTo] = currentWeek();
  const from = ref(initialFrom),
    to = ref(initialTo);
  const range = computed(() => bounds(from.value, to.value));
  const data = useTrackingData(identity.session, identity.clearSession, range);
  const report = useReport(data.entries, data.employees, range);
  const login = (id: string) => data.run('login', () => identity.login(id));
  const addEmployee = (name: string) =>
    data.withSession('add', (session) => api.addEmployee(session, name));
  const setAdmin = (id: string, admin: boolean) =>
    data.withSession(`role:${id}`, (session) => api.setAdmin(session, id, admin));
  const start = (description: string) =>
    data.withSession('start', (session) => api.start(session, description));
  const stop = () => data.withSession('stop', api.stop);
  const update = (id: string, description: string, start: string, end: string) =>
    data.withSession(`update:${id}`, (session) =>
      api.update(session, id, description, start, end)
    );
  const remove = (id: string) =>
    data.withSession(`remove:${id}`, (session) => api.remove(session, id));
  const logout = () =>
    data.run('logout', async () => {
      await identity.logout();
      data.resetData();
    });
  return {
    session: identity.session,
    ...data,
    ...report,
    from,
    to,
    range,
    login,
    addEmployee,
    setAdmin,
    start,
    stop,
    update,
    remove,
    logout,
  };
}
