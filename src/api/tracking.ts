import { supabase } from './supabase';
import type { Employee, Entry, Interval, Session } from '../types';

async function call<T>(
  name: string,
  args: Record<string, string | boolean> = {}
): Promise<T> {
  if (!supabase)
    throw new Error('Настройте подключение к Supabase в переменных окружения.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
async function pages<T>(
  name: string,
  args: Record<string, string | boolean>
): Promise<T[]> {
  if (!supabase)
    throw new Error('Настройте подключение к Supabase в переменных окружения.');
  const result: T[] = [];
  const pageSize = 500;
  for (let offset = 0; ;) {
    const { data, error } = await supabase
      .rpc(name, args)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data as T[];
    result.push(...page);
    if (!page.length) return result;
    offset += page.length;
  }
}
const credentials = (session: Session) => ({
  p_employee: session.employee,
  p_session: session.token,
});
export const api = {
  employees: () => call<Employee[]>('employee_list'),
  login: (session: Session) => call<void>('login', credentials(session)),
  session: async (session: Session) =>
    (await call<Employee[]>('session_info', credentials(session)))[0],
  logout: (session: Session) => call<void>('logout', credentials(session)),
  report: (session: Session, from: string, to: string) =>
    pages<Entry>('report_entries', { ...credentials(session), p_from: from, p_to: to }),
  intervals: (session: Session) =>
    pages<Interval>('employee_intervals', credentials(session)),
  active: async (session: Session) =>
    (await call<Entry[]>('active_entry', credentials(session)))[0],
  addEmployee: (session: Session, name: string) =>
    call<void>('add_employee', { ...credentials(session), p_name: name }),
  setAdmin: (session: Session, target: string, admin: boolean) =>
    call<void>('set_admin', {
      ...credentials(session),
      p_target: target,
      p_admin: admin,
    }),
  start: (session: Session, description: string) =>
    call<void>('start_timer', {
      ...credentials(session),
      p_description: description,
    }),
  stop: (session: Session) => call<void>('stop_timer', credentials(session)),
  update: (
    session: Session,
    id: string,
    description: string,
    start: string,
    end: string
  ) =>
    call<void>('update_entry', {
      ...credentials(session),
      p_id: id,
      p_description: description,
      p_start: start,
      p_end: end,
    }),
  remove: (session: Session, id: string) =>
    call<void>('delete_entry', { ...credentials(session), p_id: id }),
};
