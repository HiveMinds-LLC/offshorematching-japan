import { NextResponse } from "next/server";

import type { Company } from "@/lib/domain/types";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/server/api-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const company = await getCompanyProfile(id);
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const summary = String(body.summary ?? "").trim();
  const websiteUrl = String(body.websiteUrl ?? "").trim();
  const publicContactEmail = String(body.publicContactEmail ?? "").trim();
  const publicContactPhone = String(body.publicContactPhone ?? "").trim();
  const preferredLanguage = body.preferredLanguage ? (String(body.preferredLanguage) as Company["preferredLanguage"]) : undefined;
  const portfolioProjects = Array.isArray(body.portfolioProjects) ? (body.portfolioProjects as Company["portfolioProjects"]) : [];

  if (!summary) return NextResponse.json({ error: "summary is required." }, { status: 400 });

  const updated = await updateCompanyProfile(id, {
    summary,
    websiteUrl: websiteUrl || undefined,
    publicContactEmail: publicContactEmail || undefined,
    publicContactPhone: publicContactPhone || undefined,
    preferredLanguage,
    portfolioProjects
  });
  if (!updated) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  return NextResponse.json({ company: updated });
}
