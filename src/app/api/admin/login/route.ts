import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// In-memory rate limiter: max 10 attempts per IP per 15 minutes.
// For multi-instance deployments replace with a shared store (e.g. Upstash Redis).
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "しばらく時間をおいてから再試行してください。" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "メールとパスワードを入力してください。" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, email, account_type")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!appUser || appUser.account_type !== "admin") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "管理者権限がありません。" }, { status: 403 });
  }

  return NextResponse.json({
    admin: {
      id: appUser.id,
      email: appUser.email ?? data.user.email ?? email
    }
  });
}
