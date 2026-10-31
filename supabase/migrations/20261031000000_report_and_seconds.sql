-- Existing sub-second intervals cannot be represented at second precision without
-- changing their meaning. Abort atomically so they can be reviewed first.
begin;
do $$
begin
  if exists (
    select 1 from public.time_entries
    where ended_at is not null
      and date_trunc('second', ended_at) <= date_trunc('second', started_at)
  ) then
    raise exception 'Найдены интервалы короче секунды, которые нельзя сохранить с точностью до секунды. Исправьте их перед миграцией.';
  end if;
end $$;

-- The exclusion constraint is rebuilt after normalization to avoid transient
-- conflicts between an old fractional boundary and a normalized boundary.
do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.time_entries'::regclass and contype = 'x';
  if constraint_name is null then raise exception 'Не найдено ограничение пересечения интервалов'; end if;
  execute format('alter table public.time_entries drop constraint %I', constraint_name);
end $$;
update public.time_entries set started_at = date_trunc('second', started_at), ended_at = date_trunc('second', ended_at);
alter table public.time_entries add constraint time_entries_no_overlap
  exclude using gist (employee_id with =, tstzrange(started_at, ended_at, '[)') with &&);

create function public.normalize_entry_seconds() returns trigger
language plpgsql set search_path = public as $$
begin
  new.started_at := date_trunc('second', new.started_at);
  new.ended_at := date_trunc('second', new.ended_at);
  if new.ended_at is not null and new.ended_at <= new.started_at then
    raise exception 'Интервал должен составлять не менее одной секунды';
  end if;
  return new;
end $$;
create trigger time_entries_seconds before insert or update of started_at, ended_at on public.time_entries
for each row execute function public.normalize_entry_seconds();

create function public.report_entries(p_employee uuid, p_session uuid, p_from timestamptz, p_to timestamptz)
returns setof public.time_entries language plpgsql security definer set search_path = public as $$
declare actor employees;
begin
  actor := require_session(p_employee, p_session);
  if p_from is null or p_to is null or p_from >= p_to then raise exception 'Некорректный период'; end if;
  return query select t.* from time_entries t
    where (actor.is_admin or t.employee_id = actor.id)
      and t.started_at < p_to and (t.ended_at is null or t.ended_at > p_from)
    order by t.started_at desc, t.id;
end $$;

create function public.employee_intervals(p_employee uuid, p_session uuid)
returns table(id uuid, employee_id uuid, started_at timestamptz, ended_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  return query select t.id, t.employee_id, t.started_at, t.ended_at from time_entries t
    where t.employee_id = p_employee order by t.started_at desc, t.id;
end $$;

create function public.active_entry(p_employee uuid, p_session uuid)
returns setof public.time_entries language plpgsql security definer set search_path = public as $$
begin
  perform require_session(p_employee, p_session);
  return query select t.* from time_entries t where t.employee_id = p_employee and t.ended_at is null;
end $$;
commit;
