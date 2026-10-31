import { useSession } from './useSession';
import { useTrackingData } from './useTrackingData';
import { useReport } from './useReport';
import { api } from '../api/tracking';

export function useTracking() {
  const identity = useSession();
  const data = useTrackingData(identity.session, identity.clearSession);
  const report = useReport(data.entries, identity.session);

  const login = (id: string) => data.run(() => identity.login(id));
  const addEmployee = (name: string) =>
    data.withSession((session) => api.addEmployee(session, name));
  const logout = () =>
    data.run(async () => {
      await identity.logout();
      data.resetData();
    });

  return {
    session: identity.session,
    employee: data.employee,
    employees: data.employees,
    entries: data.entries,
    error: data.error,
    busy: data.busy,
    withSession: data.withSession,
    ...report,
    login,
    addEmployee,
    logout,
  };
}
