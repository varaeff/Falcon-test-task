import { ref } from 'vue'
import { api } from '../api/tracking'
import type { Session } from '../types'

const storageKey = 'falcon-session'

function savedSession(): Session | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (typeof value === 'object' && value !== null && 'employee' in value && 'token' in value && typeof value.employee === 'string' && typeof value.token === 'string') {
      return { employee: value.employee, token: value.token }
    }
  } catch { /* Ignore malformed storage. */ }
  return null
}

export function useSession() {
  const session = ref<Session | null>(savedSession())

  function clearSession() {
    session.value = null
    sessionStorage.removeItem(storageKey)
  }

  async function login(id: string) {
    const next = { employee: id, token: crypto.randomUUID() }
    await api.login(next)
    session.value = next
    sessionStorage.setItem(storageKey, JSON.stringify(next))
  }

  async function logout() {
    if (session.value) await api.logout(session.value)
    clearSession()
  }

  return { session, clearSession, login, logout }
}
