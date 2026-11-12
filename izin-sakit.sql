-- IZIN / SAKIT lewat Presensi Manual
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang. Uji di staging / backup dulu.
--
-- Alur:
--   Peserta memilih "Izin" atau "Sakit" di halaman Presensi Manual
--   -> baris presensi dibuat dengan status 'menunggu' dan kategori 'izin' / 'sakit'
--   -> pembimbing menyetujui -> status menjadi 'izin' / 'sakit' (dibaca statistik yang sudah ada)
--   -> pembimbing menolak    -> status 'ditolak'
--
-- Prasyarat: constraint presensi.status sudah mengizinkan 'izin', 'sakit', 'menunggu', 'ditolak'
-- (sudah termasuk di jam-presensi.sql, langkah 0).
-- Fungsi catat_presensi_manual yang lama TIDAK diubah.

-- 1) Kolom penanda jenis pengajuan. Baris lama dibiarkan NULL (= presensi biasa).
alter table public.presensi add column if not exists kategori text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.presensi'::regclass and conname = 'presensi_kategori_check'
  ) then
    alter table public.presensi
      add constraint presensi_kategori_check
      check (kategori is null or kategori in ('hadir', 'izin', 'sakit'));
  end if;
end $$;

-- 2) Pengajuan izin / sakit
--    Tanggal boleh hari ini atau sampai 7 hari ke belakang (ubah angka 7 bila perlu).
create or replace function public.catat_izin_sakit(
  p_tanggal date,
  p_kategori text,
  p_alasan text,
  p_bukti_file text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_role text;
  hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if uid is null then raise exception 'Belum login'; end if;

  select role into v_role from public.users where id = uid;
  if v_role is null or v_role = 'deleted' then
    raise exception 'Akun tidak aktif';
  end if;

  if p_kategori not in ('izin', 'sakit') then
    raise exception 'Jenis pengajuan tidak valid';
  end if;
  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan wajib diisi';
  end if;
  if p_tanggal is null or p_tanggal > hari then
    raise exception 'Tanggal tidak boleh di masa depan';
  end if;
  if p_tanggal < hari - 7 then
    raise exception 'Pengajuan hanya bisa untuk 7 hari terakhir';
  end if;

  begin
    insert into public.presensi
      (user_id, tanggal, jenis, metode, dalam_radius, status, kategori, alasan, bukti_file)
    values
      (uid, p_tanggal, 'masuk', 'manual', false, 'menunggu', p_kategori, trim(p_alasan), p_bukti_file);
  exception when unique_violation then
    raise exception 'Sudah ada catatan presensi pada tanggal tersebut';
  end;

  return json_build_object('ok', true, 'tanggal', p_tanggal, 'kategori', p_kategori);
end $$;

revoke execute on function public.catat_izin_sakit(date, text, text, text) from public, anon;
grant  execute on function public.catat_izin_sakit(date, text, text, text) to authenticated;

-- ROLLBACK:
-- drop function if exists public.catat_izin_sakit(date, text, text, text);
-- alter table public.presensi drop constraint if exists presensi_kategori_check;
-- alter table public.presensi drop column if exists kategori;
