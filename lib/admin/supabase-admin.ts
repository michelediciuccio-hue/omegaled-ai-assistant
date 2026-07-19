type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export type AdminUser = {
  id: string;
  email: string;
};

export function getSupabaseAdminConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Configurazione Supabase incompleta.");
  }

  return { url, anonKey, serviceRoleKey };
}

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(request: Request): Promise<AdminUser> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) throw new Error("UNAUTHORIZED");

  const config = getSupabaseAdminConfig();
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("UNAUTHORIZED");

  const user = (await response.json()) as { id?: string; email?: string };
  const email = user.email?.toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  if (!user.id || !email || !allowedEmails.includes(email)) {
    throw new Error("FORBIDDEN");
  }

  return { id: user.id, email };
}

export async function supabaseAdminFetch(path: string, init: RequestInit = {}) {
  const config = getSupabaseAdminConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  return fetch(`${config.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
