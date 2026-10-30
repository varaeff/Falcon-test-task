create extension if not exists btree_gist;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0 and name = btrim(name)),
  is_admin boolean not null default false,
  session_id uuid
);
create unique index employees_normalized_name on public.employees (lower(btrim(name)));

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  description text not null check (length(btrim(description)) > 0),
  started_at timestamptz not null,
  ended_at timestamptz,
  check (ended_at is null or ended_at > started_at),
  exclude using gist (employee_id with =, tstzrange(started_at, ended_at, '[)') with &&)
);
create unique index one_active_timer on public.time_entries (employee_id) where ended_at is null;
insert into public.employees (name, is_admin) values ('Администратор', true);

alter table public.employees enable row level security;
alter table public.time_entries enable row level security;
revoke all on public.employees, public.time_entries from anon, authenticated;

create function public.employee_list() returns table(id uuid, name text, is_admin boolean)
language sql security definer set search_path = public as $$
  select e.id, e.name, e.is_admin from employees e order by e.name;
$$;

create function public.login(p_employee uuid, p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_session is null then raise exception 'Требуется идентификатор сессии'; end if;
  update employees set session_id = p_session where id = p_employee;
  if not found then raise exception 'Сотрудник не найден'; end if;
end; $$;

create function public.require_session(p_employee uuid, p_session uuid) returns employees
language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  select * into actor from employees where id = p_employee for update;
  if not found or p_session is null or actor.session_id is distinct from p_session then
    raise exception 'SESSION_REVOKED';
  end if;
  return actor;
end; $$;
revoke all on function public.require_session(uuid, uuid) from public, anon, authenticated;

create function public.session_info(p_employee uuid, p_session uuid) returns table(id uuid, name text, is_admin boolean)
language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  actor := require_session(p_employee, p_session);
  return query select actor.id, actor.name, actor.is_admin;
end; $$;

create function public.logout(p_employee uuid, p_session uuid) returns void
language sql security definer set search_path = public as $$
  update employees set session_id = null where id = p_employee and session_id = p_session;
$$;

create function public.add_employee(p_employee uuid, p_session uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  actor := require_session(p_employee, p_session);
  if not actor.is_admin then raise exception 'Требуются права администратора'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Укажите имя'; end if;
  insert into employees(name) values (btrim(p_name));
exception when unique_violation then raise exception 'Сотрудник с таким именем уже существует';
end; $$;

create function public.set_admin(p_employee uuid, p_session uuid, p_target uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  perform pg_advisory_xact_lock(48411);
  actor := require_session(p_employee, p_session);
  if not actor.is_admin then raise exception 'Требуются права администратора'; end if;
  if p_admin is null then raise exception 'Укажите роль'; end if;
  if not p_admin and (select is_admin from employees where id = p_target) and (select count(*) from employees where is_admin) <= 1 then
    raise exception 'Нельзя снять роль с последнего администратора';
  end if;
  update employees set is_admin = p_admin where id = p_target;
  if not found then raise exception 'Сотрудник не найден'; end if;
end; $$;

create function public.entries(p_employee uuid, p_session uuid) returns setof time_entries
language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  actor := require_session(p_employee, p_session);
  return query select t.* from time_entries t where actor.is_admin or t.employee_id = actor.id order by t.started_at desc;
end; $$;

create function public.start_timer(p_employee uuid, p_session uuid, p_description text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  if p_description is null or btrim(p_description) = '' then raise exception 'Укажите описание'; end if;
  insert into time_entries(employee_id, description, started_at) values (p_employee, btrim(p_description), clock_timestamp());
exception when exclusion_violation or unique_violation then raise exception 'Таймер уже запущен или интервал пересекается с другой записью';
end; $$;

create function public.stop_timer(p_employee uuid, p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  update time_entries set ended_at = clock_timestamp() where employee_id = p_employee and ended_at is null;
  if not found then raise exception 'Активный таймер не найден'; end if;
end; $$;

create function public.update_entry(p_employee uuid, p_session uuid, p_id uuid, p_description text, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  if p_description is null or btrim(p_description) = '' then raise exception 'Укажите описание'; end if;
  if p_start is null or p_end is null or p_end <= p_start or p_end > clock_timestamp() then raise exception 'Некорректный интервал'; end if;
  update time_entries set description = btrim(p_description), started_at = p_start, ended_at = p_end
    where id = p_id and employee_id = p_employee and ended_at is not null;
  if not found then raise exception 'Запись не найдена или недоступна'; end if;
exception when exclusion_violation then raise exception 'Интервал пересекается с другой записью';
end; $$;

create function public.delete_entry(p_employee uuid, p_session uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  delete from time_entries where id = p_id and employee_id = p_employee and ended_at is not null;
  if not found then raise exception 'Запись не найдена или недоступна'; end if;
end; $$;
