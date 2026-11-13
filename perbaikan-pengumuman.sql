-- PERBAIKAN: pembimbing/admin tidak bisa mengedit & menghapus pengumuman
-- Penyebab: RLS tabel pengumuman tidak punya izin UPDATE dan DELETE untuk pembimbing/admin.
-- Perintah yang ditolak RLS tidak menghasilkan error, hanya mengubah 0 baris.
--
-- File ini MANDIRI: sudah memuat penjaga dari langkah 9, jadi tidak perlu menjalankan
-- langkah-9-pengumuman.sql lagi. Aman dijalankan ulang. Hanya MENAMBAH izin.

-- 1) Pembantu: role akun yang sedang login (security definer agar tidak kena rekursi RLS)
create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

-- 2) Izin RLS: hanya pembimbing & admin yang boleh mengubah / menghapus pengumuman
drop policy if exists "reviewer ubah pengumuman" on public.pengumuman;
create policy "reviewer ubah pengumuman" on public.pengumuman
  for update to authenticated
  using      (public.current_app_role() in ('pembimbing', 'admin'))
  with check (public.current_app_role() in ('pembimbing', 'admin'));

drop policy if exists "reviewer hapus pengumuman" on public.pengumuman;
create policy "reviewer hapus pengumuman" on public.pengumuman
  for delete to authenticated
  using (public.current_app_role() in ('pembimbing', 'admin'));

-- 3) Penjaga (lapisan kedua, sama dengan langkah 9): peserta tidak bisa membuat/mengubah/
--    menghapus walau ada policy lain yang longgar; pembuat (dibuat_oleh) tidak bisa dipalsukan.
create or replace function public.guard_pengumuman() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
  r text;
begin
  if session_user in ('postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  r := public.current_app_role();
  if uid is null or r is null or r not in ('pembimbing', 'admin') then
    raise exception 'Hanya pembimbing atau admin yang dapat mengelola pengumuman';
  end if;

  if tg_op = 'INSERT' then
    new.dibuat_oleh := uid;
  elsif tg_op = 'UPDATE' then
    new.dibuat_oleh := old.dibuat_oleh;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists trg_guard_pengumuman on public.pengumuman;
create trigger trg_guard_pengumuman
before insert or update or delete on public.pengumuman
for each row execute function public.guard_pengumuman();

-- ROLLBACK:
-- drop policy if exists "reviewer ubah pengumuman" on public.pengumuman;
-- drop policy if exists "reviewer hapus pengumuman" on public.pengumuman;
-- drop trigger if exists trg_guard_pengumuman on public.pengumuman;
-- drop function if exists public.guard_pengumuman();
