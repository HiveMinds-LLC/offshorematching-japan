import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/server/api-store";
import { mockDb } from "@/lib/server/mock-db";
import { clearMockSessionToken, getMockSessionToken } from "@/lib/server/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    await clearMockSessionToken();
    return NextResponse.json({ ok: true });
  }

  const token = await getMockSessionToken();
  mockDb.logout(token);
  await clearMockSessionToken();
  return NextResponse.json({ ok: true });
}
