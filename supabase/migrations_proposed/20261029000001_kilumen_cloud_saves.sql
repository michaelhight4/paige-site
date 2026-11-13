-- Kilumen cloud saves: ONE save per account (Gary approved Oct 29, 2026, 2:15 AM CT: "build cloud saves with one save
-- per account"). Replaces the pc/mobile split that used to be in stage 3. Stands alone (needs no other Kilumen stage).
--   - RLS: a signed-in, non-anonymous user can read only their own row. The anon role and is_anonymous accounts get nothing.
--   - No direct INSERT/UPDATE/DELETE grants: every write goes through kilumen_save_put(), which
--       * refuses anon / is_anonymous callers,
--       * caps the save at 256 KB (262,144 bytes of JSON text, same check as the table),
--       * refuses a save whose savedAt is not newer than the stored one (an older device can't overwrite a newer save),
--       * refuses a savedAt more than 10 minutes in the future (a bad clock can't lock the row).
--   - Kill switch is client side (?cloudsave=0); dropping this table removes the feature server side.
create table if not exists public.kilumen_saves (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  save_id      text not null check (length(save_id) between 1 and 64),
  saved_at     bigint not null check (saved_at > 0),          -- the save's own savedAt (ms since epoch)
  save_version integer not null check (save_version between 1 and 1000),
  device       text check (device is null or device in ('pc', 'mobile')),
  data         jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144),
  updated_at   timestamptz not null default now()
);
alter table public.kilumen_saves enable row level security;
revoke all on table public.kilumen_saves from public, anon, authenticated;
grant select on table public.kilumen_saves to authenticated;
drop policy if exists kilumen_saves_select_own on public.kilumen_saves;
create policy kilumen_saves_select_own on public.kilumen_saves for select to authenticated
  using (user_id = (select auth.uid()) and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false));

create or replace function public.kilumen_save_put(p_data jsonb, p_device text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid text; sat bigint; ver integer; cur bigint;
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'account_needed');
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad_save'); end if;
  if octet_length(p_data::text) > 262144 then return jsonb_build_object('ok', false, 'reason', 'too_big'); end if;
  sid := p_data ->> 'saveId';
  if sid is null or length(sid) not between 1 and 64 then return jsonb_build_object('ok', false, 'reason', 'bad_save'); end if;
  begin
    sat := (p_data ->> 'savedAt')::bigint; ver := (p_data ->> 'v')::integer;
  exception when others then return jsonb_build_object('ok', false, 'reason', 'bad_save');
  end;
  if sat is null or sat <= 0 or ver is null or ver not between 1 and 1000 then return jsonb_build_object('ok', false, 'reason', 'bad_save'); end if;
  if sat > (extract(epoch from now()) * 1000)::bigint + 600000 then return jsonb_build_object('ok', false, 'reason', 'future'); end if;
  if p_device is not null and p_device not in ('pc', 'mobile') then p_device := null; end if;
  insert into public.kilumen_saves as s (user_id, save_id, saved_at, save_version, device, data, updated_at)
    values (uid, sid, sat, ver, p_device, p_data, now())
    on conflict (user_id) do update
      set save_id = excluded.save_id, saved_at = excluded.saved_at, save_version = excluded.save_version,
          device = excluded.device, data = excluded.data, updated_at = now()
      where s.saved_at < excluded.saved_at;
  if found then return jsonb_build_object('ok', true, 'saved_at', sat); end if;
  select s.saved_at into cur from public.kilumen_saves s where s.user_id = uid;
  return jsonb_build_object('ok', false, 'reason', 'older', 'cloud_saved_at', cur);
end $$;
revoke all on function public.kilumen_save_put(jsonb, text) from public, anon;
grant execute on function public.kilumen_save_put(jsonb, text) to authenticated;
