import { NextResponse } from "next/server";

import type { Company, VendorApplication } from "@/lib/domain/types";
import { TERMS_VERSION } from "@/lib/legal";
import { getCurrentAdminSession } from "@/lib/server/admin-auth";
import { createVendorApplication, listVendorApplications } from "@/lib/server/api-store";

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export async function GET() {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });
  const applications = await listVendorApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const acceptedTerms = body.acceptedTerms === true;
  if (!name || !contactEmail || !summary) {
    return NextResponse.json({ error: "必須項目を入力してください。" }, { status: 400 });
  }
  if (!acceptedTerms) {
    return NextResponse.json({ error: "利用規約と請求条件への同意が必要です。" }, { status: 400 });
  }

  const services = String(body.servicesCsv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const company: Company = {
    id: makeId("c"),
    name,
    country: String(body.country ?? "Unknown"),
    plan: body.plan === "translation" ? "translation" : "basic",
    websiteUrl: String(body.websiteUrl ?? "").trim() || undefined,
    publicContactEmail: String(body.publicContactEmail ?? body.contactEmail ?? "").trim() || undefined,
    publicContactPhone: String(body.publicContactPhone ?? "").trim() || undefined,
    preferredLanguage: body.preferredLanguage ? String(body.preferredLanguage) as Company["preferredLanguage"] : undefined,
    summary,
    services,
    portfolioProjects: [],
    minRate: Number(body.minRate ?? 20),
    maxRate: Number(body.maxRate ?? 40),
    teamSize: Number(body.teamSize ?? 10),
    english: (body.english as Company["english"]) ?? "basic",
    japaneseSupport: (body.japaneseSupport as Company["japaneseSupport"]) ?? "basic"
  };

  const application: VendorApplication = {
    id: makeId("app"),
    company,
    contactName: String(body.contactName ?? "N/A"),
    contactEmail,
    status: "pending",
    submittedAt: new Date().toISOString(),
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION
  };
  const created = await createVendorApplication(application);
  if (!created) return NextResponse.json({ error: "申請の保存に失敗しました。" }, { status: 500 });
  return NextResponse.json({ application: created });
}
