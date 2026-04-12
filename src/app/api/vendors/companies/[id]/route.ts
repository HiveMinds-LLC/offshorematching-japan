import { NextResponse } from "next/server";

import type { Company } from "@/lib/domain/types";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const company = await getCompanyProfile(id);
  if (!company || company.active === false) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  if (vendor.companyId !== id) return NextResponse.json({ error: "このプロフィールを編集する権限がありません。" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const summary = String(body.summary ?? "").trim();
  const summaryJa = String(body.summaryJa ?? "").trim();
  const name = String(body.name ?? "").trim();
  const country = String(body.country ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const websiteUrl = String(body.websiteUrl ?? "").trim();
  const publicContactPhone = String(body.publicContactPhone ?? "").trim();
  const preferredLanguage = body.preferredLanguage ? (String(body.preferredLanguage) as Company["preferredLanguage"]) : undefined;
  const portfolioProjects = Array.isArray(body.portfolioProjects) ? (body.portfolioProjects as Company["portfolioProjects"]) : [];
  const services = typeof body.servicesCsv === "string"
    ? body.servicesCsv.split(",").map((value: string) => value.trim()).filter(Boolean)
    : Array.isArray(body.services)
      ? (body.services as string[]).map((value) => String(value).trim()).filter(Boolean)
      : [];
  const minRate = Number(body.minRate ?? 0);
  const maxRate = Number(body.maxRate ?? 0);
  const teamSize = Number(body.teamSize ?? 0);
  const english = body.english ? (String(body.english) as Company["english"]) : "basic";
  const japaneseSupport = body.japaneseSupport ? (String(body.japaneseSupport) as Company["japaneseSupport"]) : "basic";

  if (!name) return NextResponse.json({ error: "company name is required." }, { status: 400 });
  if (!summary) return NextResponse.json({ error: "summary is required." }, { status: 400 });
  if (!contactName) return NextResponse.json({ error: "contact name is required." }, { status: 400 });
  if (!Number.isFinite(minRate) || minRate < 0) return NextResponse.json({ error: "minRate must be a valid number." }, { status: 400 });
  if (!Number.isFinite(maxRate) || maxRate < minRate) return NextResponse.json({ error: "maxRate must be greater than or equal to minRate." }, { status: 400 });
  if (!Number.isFinite(teamSize) || teamSize < 1) return NextResponse.json({ error: "teamSize must be at least 1." }, { status: 400 });

  const updated = await updateCompanyProfile(id, {
    name,
    country,
    contactName,
    summary,
    summaryJa: summaryJa || undefined,
    websiteUrl: websiteUrl || undefined,
    publicContactPhone: publicContactPhone || undefined,
    preferredLanguage,
    portfolioProjects,
    services,
    minRate,
    maxRate,
    teamSize,
    english,
    japaneseSupport
  });
  if (!updated) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  return NextResponse.json({ company: updated });
}
