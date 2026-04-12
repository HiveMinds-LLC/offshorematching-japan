import { NextResponse } from "next/server";

import { createBuyerProfileForUser, createBuyerSignup, isSupabaseConfigured } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isValidBuyerPassword(password: string) {
  return password.length >= 8 && /\d/.test(password);
}

function signupErrorMessage(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return "登録に失敗しました。時間をおいて再度お試しください。";
  if (error.code === "23503") return "アカウント作成直後のプロフィール保存に失敗しました。もう一度お試しください。";
  if (error.message?.toLowerCase().includes("already registered")) return "このメールアドレスは既に登録されています。";
  return "登録に失敗しました。入力内容をご確認ください。";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const companyName = String(body.companyName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const contactName = String(body.contactName ?? "").trim();
  const industry = String(body.industry ?? "").trim();

  if (!companyName || !email || !isValidBuyerPassword(password)) {
    return NextResponse.json({ error: "会社名・メール・8文字以上かつ数字を1つ以上含むパスワードを入力してください。" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: "buyer",
          company_name: companyName,
          contact_name: contactName
        }
      }
    });

    if (error || !data.user) {
      return NextResponse.json({ error: signupErrorMessage(error) }, { status: 400 });
    }

    if (data.session) {
      const { data: profile, error: profileError } = await supabase
        .from("buyer_organizations")
        .insert({
          owner_user_id: data.user.id,
          company_name: companyName,
          industry,
          contact_name: contactName
        })
        .select("id, company_name, industry, contact_name")
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: signupErrorMessage(profileError) }, { status: 400 });
      }

      return NextResponse.json({
        buyer: {
          id: profile.id,
          companyName: profile.company_name ?? "",
          industry: profile.industry ?? "",
          contactName: profile.contact_name ?? "",
          email,
          password: ""
        },
        requiresEmailConfirmation: false
      });
    }

    const result = await createBuyerProfileForUser({
      userId: data.user.id,
      companyName,
      industry,
      contactName,
      email
    });
    if (!result.ok) {
      return NextResponse.json({ error: signupErrorMessage({ message: result.error }) }, { status: 400 });
    }

    return NextResponse.json({ buyer: result.buyer, requiresEmailConfirmation: true });
  }

  const result = await createBuyerSignup({ companyName, email, password, contactName, industry });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ buyer: result.buyer });
}
