import { NextResponse } from "next/server";

import type { Company } from "@/lib/domain/types";
import { TERMS_VERSION } from "@/lib/legal";
import { createVendorApplicationDraftForUser, isSupabaseConfigured } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isValidPassword(password: string) {
  return password.length >= 8 && /\d/.test(password);
}

function signupErrorMessage(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return "登録に失敗しました。入力内容をご確認ください。";
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("already registered") || message.includes("user already registered")) {
    return "このメールアドレスは既に登録されています。";
  }
  if (error.code === "over_email_send_rate_limit" || (message.includes("email rate limit") && message.includes("exceeded"))) {
    return "確認メールの送信上限に達しました。少し時間をおいて再度お試しいただくか、ローカル開発中はメール確認を無効にしてください。";
  }
  if (message.includes("email") && message.includes("invalid")) {
    return "メールアドレスの形式を確認してください。";
  }
  if (message.includes("password")) {
    return "パスワードの条件を確認してください。";
  }
  return "登録に失敗しました。入力内容をご確認ください。";
}

function makeCompany(body: Record<string, unknown>): Company {
  const services = String(body.servicesCsv ?? "")
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);

  return {
    id: "",
    name: String(body.name ?? "").trim(),
    country: String(body.country ?? "").trim() || "Unknown",
    plan: body.plan === "translation" ? "translation" : "basic",
    websiteUrl: String(body.websiteUrl ?? "").trim() || undefined,
    publicContactEmail: String(body.publicContactEmail ?? body.contactEmail ?? "").trim() || undefined,
    publicContactPhone: String(body.publicContactPhone ?? "").trim() || undefined,
    preferredLanguage: body.preferredLanguage ? (String(body.preferredLanguage) as Company["preferredLanguage"]) : undefined,
    summary: String(body.summary ?? "").trim(),
    services,
    portfolioProjects: [],
    minRate: Number(body.minRate ?? 20),
    maxRate: Number(body.maxRate ?? 40),
    teamSize: Number(body.teamSize ?? 10),
    english: (body.english as Company["english"]) ?? "basic",
    japaneseSupport: (body.japaneseSupport as Company["japaneseSupport"]) ?? "basic"
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const email = String(body.contactEmail ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const company = makeCompany(body as Record<string, unknown>);
  const contactName = String(body.contactName ?? "").trim();
  const acceptedTerms = body.acceptedTerms === true;

  if (!company.name || !email || !contactName || !isValidPassword(password)) {
    return NextResponse.json({ error: "会社名・担当者名・連絡先メール・8文字以上かつ数字を1つ以上含むパスワードを入力してください。" }, { status: 400 });
  }
  if (!acceptedTerms) {
    return NextResponse.json({ error: "利用規約と請求条件への同意が必要です。" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 設定が見つかりません。" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: "vendor",
        company_name: company.name,
        contact_name: contactName
      }
    }
  });

  if (error || !data.user) {
    console.error("Vendor sign-up failed", {
      code: error?.code,
      message: error?.message,
      email
    });
    return NextResponse.json({ error: signupErrorMessage(error) }, { status: 400 });
  }

  const application = await createVendorApplicationDraftForUser({
    userId: data.user.id,
    company,
    contactName,
    contactEmail: email,
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION
  });

  if (!application) {
    return NextResponse.json({ error: "開発会社の下書き申請作成に失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({
    application,
    requiresEmailConfirmation: !data.session
  });
}
