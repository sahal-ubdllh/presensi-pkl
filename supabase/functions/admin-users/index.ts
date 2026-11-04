// Edge Function: admin-users
// Aksi: "create" (buat akun) dan "deactivate" (nonaktifkan akun).
// Hanya boleh dipanggil oleh user dengan role 'admin' di public.users.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const ROLES = ["peserta", "pembimbing", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method tidak diizinkan" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Siapa pemanggilnya?
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Belum login" }, 401);

  // 2) Wajib admin (dicek dengan service role, bukan dari metadata)
  const admin = createClient(url, service);
  const { data: me } = await admin
    .from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return json({ error: "Hanya admin yang diizinkan" }, 403);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Body tidak valid" }, 400); }

  // ---------- CREATE ----------
  if (payload.action === "create") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const nama = String(payload.nama_lengkap ?? "").trim();
    const role = String(payload.role ?? "peserta");
    const jenis = payload.jenis_peserta ?? null;
    const instansi = payload.asal_instansi ?? null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email tidak valid" }, 400);
    if (password.length < 6) return json({ error: "Password minimal 6 karakter" }, 400);
    if (!nama) return json({ error: "Nama wajib diisi" }, 400);
    if (!ROLES.includes(role)) return json({ error: "Role tidak valid" }, 400);

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { nama_lengkap: nama, jenis_peserta: jenis },
    });
    if (error || !data.user) return json({ error: error?.message ?? "Gagal membuat akun" }, 400);

    // Trigger signup membuat baris 'peserta'; service role boleh menetapkan role sebenarnya.
    const { error: dbErr } = await admin.from("users").upsert({
      id: data.user.id, email, nama_lengkap: nama,
      jenis_peserta: role === "peserta" ? jenis : null,
      asal_instansi: role === "peserta" ? instansi : null,
      role,
    });
    if (dbErr) {
      await admin.auth.admin.deleteUser(data.user.id); // batalkan agar tidak setengah jadi
      return json({ error: "Gagal menyimpan profil: " + dbErr.message }, 400);
    }
    return json({ ok: true, id: data.user.id });
  }

  // ---------- DEACTIVATE ----------
  if (payload.action === "deactivate") {
    const id = String(payload.id ?? "");
    if (!id) return json({ error: "id wajib" }, 400);
    if (id === user.id) return json({ error: "Tidak bisa menonaktifkan akun sendiri" }, 400);

    const { data: target } = await admin
      .from("users").select("email, role").eq("id", id).single();
    if (!target) return json({ error: "User tidak ditemukan" }, 404);

    // 1) Tandai di database lebih dulu. Jika gagal, tidak ada yang berubah.
    const { error: dbErr } = await admin.from("users").update({
      role: "deleted",
      email: `deleted_${Date.now()}_${target.email}`,
    }).eq("id", id);
    if (dbErr) return json({ error: "Gagal memperbarui profil: " + dbErr.message }, 400);

    // 2) Blokir login. Jika gagal, kembalikan profil agar tidak setengah jadi.
    const { error: banErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h", // ~100 tahun: tidak bisa login lagi
    });
    if (banErr) {
      await admin.from("users").update({ role: target.role, email: target.email }).eq("id", id);
      return json({ error: "Gagal memblokir akun: " + banErr.message }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: "action tidak dikenal" }, 400);
});
