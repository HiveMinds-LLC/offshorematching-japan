import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/server/api-store";

export type AdminSession = {
  id: string;
  email: string;
};

export async function getCurrentAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, email, account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser || appUser.account_type !== "admin") return null;

  return {
    id: appUser.id,
    email: appUser.email ?? user.email ?? ""
  };
}
