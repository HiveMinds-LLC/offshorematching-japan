const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nextPublicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getOptionalEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

function getRequiredEnv(names: string[]) {
  const value = getOptionalEnv(names);
  if (!value) {
    throw new Error(`Missing required env var. Expected one of: ${names.join(", ")}`);
  }
  return value;
}

export const supabaseEnv = {
  url: nextPublicSupabaseUrl,
  publishableKey: nextPublicSupabasePublishableKey,
  secretKey: getOptionalEnv(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
};

export function getRequiredSupabasePublicEnv() {
  return {
    url: nextPublicSupabaseUrl ?? getRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL"]),
    publishableKey:
      nextPublicSupabasePublishableKey ??
      getRequiredEnv([
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      ])
  };
}
