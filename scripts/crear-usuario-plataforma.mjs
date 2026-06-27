// Da de alta (o actualiza) el primer usuario de plataforma de Kioma.
// Uso:
//   node scripts/crear-usuario-plataforma.mjs <email> <password> ["Nombre"]
// Requiere en el entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// (se cargan automáticamente desde .env.local).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarEnvLocal() {
  try {
    const ruta = resolve(__dirname, "..", ".env.local");
    const txt = readFileSync(ruta, "utf8");
    for (const linea of txt.split("\n")) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // sin .env.local: se usan las variables del entorno
  }
}

cargarEnvLocal();

const [, , email, password, nombre] = process.argv;
if (!email || !password) {
  console.error("Uso: node scripts/crear-usuario-plataforma.mjs <email> <password> [\"Nombre\"]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function buscarUsuarioPorEmail(correo) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === correo.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let user = await buscarUsuarioPorEmail(email);

  if (user) {
    console.log(`Usuario existente (${user.id}); actualizando contraseña…`);
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre ?? user.user_metadata?.nombre ?? email },
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre ?? email },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Usuario creado: ${user.id}`);
  }

  // Asegura el perfil y lo marca como admin de plataforma.
  const { error: upErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        nombre: nombre ?? email,
        is_platform_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (upErr) throw upErr;

  console.log(`Listo. ${email} es admin de plataforma. Entra en /panel/login`);
}

main().catch((e) => {
  console.error("Error:", e.message ?? e);
  process.exit(1);
});
