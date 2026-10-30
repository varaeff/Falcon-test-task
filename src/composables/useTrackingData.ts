import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { api } from '../api/tracking'
import type { Employee, Entry, Session } from '../types'

export function useTrackingData(session: Ref<Session | null>, clearSession: () => void) {
  const employee = ref<Employee | null>(null)
  const employees = ref<Employee[]>([])
  const entries = ref<Entry[]>([])
  const error = ref('')
  const busy = ref(false)

  function resetData() {
    employee.value = null
    entries.value = []
  }

  function handleError(problem: unknown) {
    const message = problem instanceof Error ? problem.message : 'Неизвестная ошибка'
    if (message.includes('SESSION_REVOKED')) {
      clearSession()
      resetData()
      error.value = 'Сессия завершена: выполнен вход на другом устройстве.'
    } else {
      error.value = message
    }
  }

  async function refresh() {
    const current = session.value
    if (!current) {
      employees.value = await api.employees()
      return
    }
    const [person, list, records] = await Promise.all([api.session(current), api.employees(), api.entries(current)])
    if (session.value?.token !== current.token) return
    if (!person) throw new Error('SESSION_REVOKED')
    employee.value = person
    employees.value = list
    entries.value = records
  }

  async function run(action: () => Promise<void>) {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      await action()
      await refresh()
    } catch (problem) {
      handleError(problem)
      if (session.value && !error.value.includes('Сессия завершена')) {
        try { await refresh() } catch (refreshError) {
          if (refreshError instanceof Error && refreshError.message.includes('SESSION_REVOKED')) handleError(refreshError)
        }
      }
    } finally {
      busy.value = false
    }
  }

  function withSession(action: (current: Session) => Promise<void>) {
    return run(async () => { if (session.value) await action(session.value) })
  }

  let poll: ReturnType<typeof setInterval>
  onMounted(() => {
    void run(async () => {})
    poll = setInterval(() => { if (!busy.value) void refresh().catch(handleError) }, 15000)
  })
  onUnmounted(() => clearInterval(poll))

  return { employee, employees, entries, error, busy, resetData, run, withSession }
}
