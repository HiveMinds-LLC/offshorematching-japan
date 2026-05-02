import { NextResponse } from "next/server";

import { getAppUserRole, getBuyerByUserId, getVendorCompanyByUserId, isSupabaseConfigured, loginBuyer } from "@/lib/server/api-store";
import { setMockSessionToken } from "@/lib/server/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "メールとパスワードを入力してください。" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
    }

    const appUser = await getAppUserRole(data.user.id);
    if (!appUser) {
      return NextResponse.json({ error: "アカウント種別を確認できませんでした。" }, { status: 404 });
    }

    if (appUser.accountType === "admin") {
      return NextResponse.json({
        role: "admin",
        admin: { email: appUser.email || data.user.email || email },
        supabaseSession: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token
            }
          : null
      });
    }

    if (appUser.accountType === "vendor") {
      const vendor = await getVendorCompanyByUserId(data.user.id);
      if (!vendor) {
        return NextResponse.json({ error: "開発会社プロフィールまたは申請情報が見つかりません。" }, { status: 404 });
      }

      return NextResponse.json({
        role: "vendor",
        vendor,
        supabaseSession: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token
            }
          : null
      });
    }

    const buyer = await getBuyerByUserId(data.user.id, data.user.email ?? email);
    if (!buyer) {
      return NextResponse.json({ error: "発注企業プロフィールが見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({
      role: "buyer",
      buyer,
      supabaseSession: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token
          }
        : null
    });
  }

  const result = await loginBuyer(email, password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  await setMockSessionToken(result.token);
  return NextResponse.json({ role: "buyer", buyer: result.buyer });
}
