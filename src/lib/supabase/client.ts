import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  if (!supabaseEnv.url || !supabaseEnv.publishableKey) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.publishableKey);
}
