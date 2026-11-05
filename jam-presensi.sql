-- JAM PRESENSI: batas masuk 07:30 (lewat = "terlambat"), presensi pulang 15:45 - 16:00
-- Jalankan SETELAH langkah 4 dan 8. Aman dijalankan ulang. Uji di staging / backup dulu.
--
-- Aturan (jam WIB, dibandingkan per MENIT, jadi 07:30:59 masih tepat waktu):
--   MASUK : sampai 07:30            -> status 'hadir'
--           07:31 s.d. 16:00        -> status 'terlambat'
--           setelah 16:00           -> ditolak (presensi sudah ditutup)
--   PULANG: sebelum 15:45           -> ditolak (belum dibuka)
--           15:45 s.d. 16:00        -> diterima
--           setelah 16:00           -> ditolak (sudah ditutup)
-- Jam dapat diubah tanpa mengubah kode: edit tabel konfigurasi (key: jam_masuk_batas,
-- jam_pulang_mulai, jam_pulang_batas; nilai format HH:MM). Bila baris tidak ada / salah format,
-- dipakai nilai bawaan di atas.
-- Presensi lama tetap berstatus 'hadir' (tidak dihitung ulang menjadi terlambat).

-- 0) Status 'terlambat' harus diizinkan oleh kolom presensi.status
do $$
declare
  c record;
  asing text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'presensi'
      and column_name = 'status' and data_type = 'USER-DEFINED'
  ) then
    raise exception 'Kolom presensi.status bertipe ENUM. Kirim hasil: select enum_range(null::public.<nama_enum>) ke Claude sebelum lanjut.';
  end if;

  select string_agg(distinct status, ', ') into asing
  from public.presensi
  where status is not null
    and status not in ('hadir','terlambat','izin','sakit','alpha','menunggu','ditolak');
  if asing is not null then
    raise exception 'Ada nilai status lain di tabel presensi: %. Kirim teks ini ke Claude sebelum lanjut.', asing;
  end if;

  for c in
    select conname from pg_constraint
    where conrelid = 'public.presensi'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.presensi drop constraint %I', c.conname);
  end loop;

  alter table public.presensi add constraint presensi_status_check
    check (status in ('hadir','terlambat','izin','sakit','alpha','menunggu','ditolak'));
end $$;

-- 1) Isi jam bawaan di tabel konfigurasi (hanya jika belum ada)
do $$
declare r record;
begin
  for r in select * from (values
    ('jam_masuk_batas',  '07:30'),
    ('jam_pulang_mulai', '15:45'),
    ('jam_pulang_batas', '16:00')
  ) as t(k, v) loop
    begin
      insert into public.konfigurasi (key, value)
      select r.k, r.v
      where not exists (select 1 from public.konfigurasi where key = r.k);
    exception when others then
      raise notice 'Tidak bisa menambah % otomatis (%). Tambahkan manual di tabel konfigurasi, atau biarkan: nilai bawaan dipakai.', r.k, sqlerrm;
    end;
  end loop;
end $$;

-- 2) Pembantu: waktu sekarang (WIB) dan pembaca jam dari konfigurasi
create or replace function public.waktu_wib() returns timestamp
language sql stable as $$
  select now() at time zone 'Asia/Jakarta';
$$;

create or replace function public.konfig_jam(p_key text, p_bawaan time) returns time
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  select (value)::text into v from public.konfigurasi where key = p_key limit 1;
  if v is null then return p_bawaan; end if;
  return v::time;
exception when others then
  return p_bawaan;   -- format salah -> pakai nilai bawaan
end $$;

-- 3) Presensi otomatis dengan aturan jam
create or replace function public.catat_presensi(
  p_jenis text, p_lat double precision, p_lng double precision
) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_role text;
  v_now timestamp := public.waktu_wib();
  hari date := v_now::date;
  v_jam time := date_trunc('minute', v_now)::time;
  t_masuk time := public.konfig_jam('jam_masuk_batas',  time '07:30');
  t_pulang_mulai time := public.konfig_jam('jam_pulang_mulai', time '15:45');
  t_pulang_batas time := public.konfig_jam('jam_pulang_batas', time '16:00');
  v_status text;
  k_lat double precision;
  k_lng double precision;
  k_radius double precision;
  jarak double precision;
  a double precision;
begin
  if uid is null then raise exception 'Belum login'; end if;

  select role into v_role from public.users where id = uid;
  if v_role is null or v_role = 'deleted' then
    raise exception 'Akun tidak aktif';
  end if;

  if p_jenis not in ('masuk', 'pulang') then
    raise exception 'Jenis presensi tidak valid';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Koordinat tidak valid';
  end if;

  -- Aturan jam
  if p_jenis = 'masuk' then
    if v_jam > t_pulang_batas then
      raise exception 'Presensi masuk sudah ditutup (batas pukul %)', to_char(t_pulang_batas, 'HH24:MI');
    end if;
    v_status := case when v_jam > t_masuk then 'terlambat' else 'hadir' end;
  else
    if v_jam < t_pulang_mulai then
      raise exception 'Presensi pulang baru dibuka pukul %', to_char(t_pulang_mulai, 'HH24:MI');
    end if;
    if v_jam > t_pulang_batas then
      raise exception 'Presensi pulang sudah ditutup (batas pukul %)', to_char(t_pulang_batas, 'HH24:MI');
    end if;
    v_status := 'hadir';
  end if;

  select (value)::text::double precision into k_lat    from public.konfigurasi where key = 'lokasi_kantor_lat';
  select (value)::text::double precision into k_lng    from public.konfigurasi where key = 'lokasi_kantor_lng';
  select (value)::text::double precision into k_radius from public.konfigurasi where key = 'radius_presensi';
  if k_lat is null or k_lng is null or k_radius is null then
    raise exception 'Konfigurasi lokasi kantor belum diatur';
  end if;

  a := power(sin(radians(k_lat - p_lat) / 2), 2)
     + cos(radians(p_lat)) * cos(radians(k_lat))
     * power(sin(radians(k_lng - p_lng) / 2), 2);
  jarak := 2 * 6371000 * asin(sqrt(least(1, a)));

  if jarak > k_radius then
    raise exception 'Anda berada di luar radius kantor (% m)', round(jarak);
  end if;

  if p_jenis = 'pulang' and not exists (
    select 1 from public.presensi
    where user_id = uid and tanggal = hari and jenis = 'masuk'
      and status is distinct from 'ditolak'
  ) then
    raise exception 'Presensi masuk hari ini belum tercatat';
  end if;

  begin
    insert into public.presensi
      (user_id, tanggal, jenis, metode, lokasi_lat, lokasi_lng, dalam_radius, status)
    values
      (uid, hari, p_jenis, 'otomatis', p_lat, p_lng, true, v_status);
  exception when unique_violation then
    raise exception 'Presensi % hari ini sudah tercatat', p_jenis;
  end;

  return json_build_object(
    'ok', true, 'tanggal', hari, 'jarak', round(jarak),
    'status', v_status, 'jam', to_char(v_jam, 'HH24:MI')
  );
end $$;

revoke execute on function public.catat_presensi(text, double precision, double precision) from public, anon;
grant  execute on function public.catat_presensi(text, double precision, double precision) to authenticated;

-- ROLLBACK (kembali ke aturan tanpa jam; fungsi catat_presensi versi langkah 8 harus dijalankan ulang):
-- drop function if exists public.konfig_jam(text, time);
-- drop function if exists public.waktu_wib();
-- delete from public.konfigurasi where key in ('jam_masuk_batas','jam_pulang_mulai','jam_pulang_batas');
-- update public.presensi set status = 'hadir' where status = 'terlambat';
-- (lalu pulihkan constraint tanpa 'terlambat' bila perlu)
