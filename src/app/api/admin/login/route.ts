import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
