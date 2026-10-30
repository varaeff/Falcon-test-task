export interface Employee { id: string; name: string; is_admin: boolean }
export interface Entry { id: string; employee_id: string; description: string; started_at: string; ended_at: string | null }
export interface Session { employee: string; token: string }
