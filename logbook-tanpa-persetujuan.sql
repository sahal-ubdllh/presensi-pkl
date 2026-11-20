-- Logbook kegiatan tanpa persetujuan pembimbing/admin.
-- Status kegiatan sekarang hanya: 'draft' (belum final) dan 'tercatat' (langsung sah).
-- Aman dijalankan ulang.

begin;

-- 1. Hapus aturan (check constraint) lama yang membatasi nilai status kegiatan
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.kegiatan'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.kegiatan drop constraint %I', c.conname);
  end loop;
end $$;

-- 2. Semua kegiatan yang pernah dikirim (menunggu/disetujui/ditolak) menjadi 'tercatat'
update public.kegiatan
   set status = 'tercatat'
 where status in ('menunggu', 'disetujui', 'ditolak');

-- 3. Aturan baru
alter table public.kegiatan
  add constraint kegiatan_status_check check (status in ('draft', 'tercatat'));

commit;

-- Pemeriksaan
-- select status, count(*) from public.kegiatan group by status;

-- Rollback (kembalikan aturan lama; kegiatan 'tercatat' dianggap 'disetujui'):
-- begin;
-- alter table public.kegiatan drop constraint kegiatan_status_check;
-- update public.kegiatan set status = 'disetujui' where status = 'tercatat';
-- alter table public.kegiatan add constraint kegiatan_status_check
--   check (status in ('draft','menunggu','disetujui','ditolak'));
-- commit;
