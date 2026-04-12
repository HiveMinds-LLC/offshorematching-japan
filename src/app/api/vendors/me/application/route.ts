import { NextResponse } from "next/server";

import type { Company } from "@/lib/domain/types";
import { TERMS_VERSION } from "@/lib/legal";
import {
  getAppUserRole,
  getVendorApplicationByUserId,
  getVendorCompanyByUserId,
  submitVendorApplicationByUserId,
  updateVendorApplicationByUserId
} from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getVendorUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const appUser = await getAppUserRole(user.id);
  if (!appUser || appUser.accountType !== "vendor") return null;
  return user;
}

function toCompany(body: Record<string, unknown>): Company {
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
    summaryJa: String(body.summaryJa ?? "").trim() || undefined,
    services,
    portfolioProjects: Array.isArray(body.portfolioProjects) ? (body.portfolioProjects as Company["portfolioProjects"]) : [],
    minRate: Number(body.minRate ?? 20),
    maxRate: Number(body.maxRate ?? 40),
    teamSize: Number(body.teamSize ?? 10),
    english: (body.english as Company["english"]) ?? "basic",
    japaneseSupport: (body.japaneseSupport as Company["japaneseSupport"]) ?? "basic"
  };
}

export async function GET() {
  const user = await getVendorUser();
  if (!user) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const [application, company] = await Promise.all([
    getVendorApplicationByUserId(user.id),
    getVendorCompanyByUserId(user.id)
  ]);

  return NextResponse.json({ application, company });
}

export async function PATCH(request: Request) {
  const user = await getVendorUser();
  if (!user) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const company = toCompany(body as Record<string, unknown>);
  if (!company.name || !company.summary) {
    return NextResponse.json({ error: "会社名と会社紹介は必須です。" }, { status: 400 });
  }

  const application = await updateVendorApplicationByUserId({
    userId: user.id,
    company,
    contactName: String(body.contactName ?? "").trim(),
    contactEmail: String(body.contactEmail ?? user.email ?? "").trim().toLowerCase(),
    termsAcceptedAt: body.acceptedTerms ? new Date().toISOString() : undefined,
    termsVersion: body.acceptedTerms ? TERMS_VERSION : undefined
  });

  if (!application) return NextResponse.json({ error: "申請情報の更新に失敗しました。" }, { status: 400 });
  return NextResponse.json({ application });
}

export async function POST() {
  const user = await getVendorUser();
  if (!user) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const application = await submitVendorApplicationByUserId(user.id);
  if (!application) return NextResponse.json({ error: "申請の送信に失敗しました。" }, { status: 400 });

  if (application.status === "rejected" || application.status === "approved" || application.status === "pending") {
    return NextResponse.json({ application });
  }

  return NextResponse.json({ application });
}
