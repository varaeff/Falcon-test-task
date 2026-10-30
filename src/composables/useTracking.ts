import { useSession } from './useSession'
import { useTrackingData } from './useTrackingData'
import { useReport } from './useReport'

export function useTracking() {
  const identity = useSession()
  const data = useTrackingData(identity.session, identity.clearSession)
  const report = useReport(data.entries, identity.session)

  const login = (id: string) => data.run(() => identity.login(id))
  const logout = () => data.run(async () => {
    await identity.logout()
    data.resetData()
  })

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
    logout,
  }
}
