import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { parseCriteria, runTierAwareMatch } from "@/lib/matching";
import type { BuyerCriteria, BuyerOrganization, Company, VendorApplication } from "@/lib/domain/types";
import { mockDb } from "@/lib/server/mock-db";

type MatchResult = {
  company: Company;
  score: number;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function toCompany(row: Record<string, unknown>): Company {
  return {
    id: String(row.id),
    name: String(row.company_name ?? ""),
    country: String(row.country ?? "Unknown"),
    plan: (row.plan_key as Company["plan"]) ?? "developer",
    websiteUrl: row.website_url ? String(row.website_url) : undefined,
    publicContactEmail: row.public_contact_email ? String(row.public_contact_email) : undefined,
    publicContactPhone: row.public_contact_phone ? String(row.public_contact_phone) : undefined,
    summary: String(row.summary ?? ""),
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    minRate: Number(row.min_rate ?? 20),
    maxRate: Number(row.max_rate ?? 40),
    teamSize: Number(row.team_size ?? 10),
    english: (row.english_level as Company["english"]) ?? "basic",
    japaneseSupport: (row.japanese_support as Company["japaneseSupport"]) ?? "basic"
  };
}

function toVendorApplication(row: Record<string, unknown>): VendorApplication {
  return {
    id: String(row.id),
    company: toCompany({
      id: row.id,
      company_name: row.company_name,
      country: row.country,
      summary: row.summary,
      website_url: row.website_url,
      public_contact_email: row.public_contact_email,
      public_contact_phone: row.public_contact_phone,
      services: row.services,
      min_rate: row.min_rate,
      max_rate: row.max_rate,
      team_size: row.team_size,
      english_level: row.english_level,
      japanese_support: row.japanese_support,
      plan_key: row.plan_key
    }),
    contactName: String(row.contact_name ?? "N/A"),
    contactEmail: String(row.contact_email ?? ""),
    status: (row.status as VendorApplication["status"]) ?? "pending",
    submittedAt: String(row.submitted_at ?? new Date().toISOString()),
    reviewNote: row.review_note ? String(row.review_note) : undefined
  };
}

function buildAssistantReply(nextCriteria: BuyerCriteria, topMatches: MatchResult[]) {
  const tech = nextCriteria.technologies.length > 0 ? nextCriteria.technologies.join(", ") : "技術未指定";
  const budget = nextCriteria.budgetCeiling !== null ? `$${nextCriteria.budgetCeiling}/h` : "予算未指定";
  const team = nextCriteria.teamNeeded !== null ? `${nextCriteria.teamNeeded}名` : "人数未指定";
  const duration = nextCriteria.durationMonths !== null ? `${nextCriteria.durationMonths}ヶ月` : "期間未指定";

  const missing: string[] = [];
  if (nextCriteria.teamNeeded === null) missing.push("必要人数");
  if (nextCriteria.budgetCeiling === null) missing.push("予算上限");
  if (nextCriteria.durationMonths === null) missing.push("契約期間");

  const topText =
    topMatches.length > 0
      ? topMatches
          .slice(0, 3)
          .map((entry, index) => `${index + 1}. ${entry.company.name} (score ${entry.score.toFixed(1)})`)
          .join("\n")
      : "一致する候補がまだ見つかりません。要件を少し広げる提案も可能です。";

  const followUp =
    missing.length > 0
      ? `追加で「${missing.join("・")}」を教えていただくと、より精度の高い提案ができます。`
      : "要件が十分に揃っているため、この内容で比較を進められます。";

  return `要件を整理しました。\n- 技術: ${tech}\n- 予算: ${budget}\n- 人数: ${team}\n- 期間: ${duration}\n\n暫定マッチ候補:\n${topText}\n\n${followUp}`;
}

export async function createBuyerSignup(input: Omit<BuyerOrganization, "id">) {
  if (!isSupabaseConfigured()) return mockDb.createBuyer(input);

  const service = serviceClient();
  if (!service) return { ok: false as const, error: "Supabase service client is not configured." };
  const auth = anonClient();
  if (!auth) return { ok: false as const, error: "Supabase anon client is not configured." };

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: input.password,
    email_confirm: true
  });
  if (authError || !authData.user) {
    return { ok: false as const, error: authError?.message ?? "ユーザー作成に失敗しました。" };
  }

  const { data, error } = await service
    .from("buyer_organizations")
    .insert({
      owner_user_id: authData.user.id,
      company_name: input.companyName,
      industry: input.industry,
      contact_name: input.contactName
    })
    .select("id, company_name, industry, contact_name")
    .single();
  if (error || !data) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { ok: false as const, error: error?.message ?? "企業プロフィールの作成に失敗しました。" };
  }

  const buyer: BuyerOrganization = {
    id: data.id,
    companyName: data.company_name ?? "",
    industry: data.industry ?? "",
    contactName: data.contact_name ?? "",
    email: input.email.toLowerCase(),
    password: ""
  };
  mockDb.upsertBuyer(buyer);
  void auth;
  return { ok: true as const, buyer };
}

export async function loginBuyer(email: string, password: string) {
  if (!isSupabaseConfigured()) return mockDb.loginBuyer(email, password);

  const auth = anonClient();
  const service = serviceClient();
  if (!auth || !service) return { ok: false as const, error: "Supabase client is not configured." };

  const { data: signInData, error: signInError } = await auth.auth.signInWithPassword({ email: email.toLowerCase(), password });
  if (signInError || !signInData.user) {
    return { ok: false as const, error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const { data, error } = await service
    .from("buyer_organizations")
    .select("id, company_name, industry, contact_name")
    .eq("owner_user_id", signInData.user.id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: "発注企業プロフィールが見つかりません。" };
  }

  const buyer: BuyerOrganization = {
    id: data.id,
    companyName: data.company_name ?? "",
    industry: data.industry ?? "",
    contactName: data.contact_name ?? "",
    email: email.toLowerCase(),
    password: ""
  };
  mockDb.upsertBuyer(buyer);
  const token = mockDb.createSessionForEmail(buyer.email);
  return { ok: true as const, token, buyer };
}

async function loadSupabaseCompanies(client: SupabaseClient) {
  const { data: profileRows } = await client.from("vendor_profiles").select("*").eq("active", true);
  const baseCompanies = (profileRows ?? []).map((row) => toCompany(row as Record<string, unknown>));

  if (baseCompanies.length > 0) return baseCompanies;

  const { data: approvedRows } = await client.from("vendor_applications").select("*").eq("status", "approved");
  return (approvedRows ?? []).map((row) => toCompany(row as Record<string, unknown>));
}

export async function listCompaniesForMarketplace() {
  if (!isSupabaseConfigured()) return mockDb.listCompanies();

  const client = serviceClient();
  if (!client) return mockDb.listCompanies();
  return loadSupabaseCompanies(client);
}

export async function listVendorApplications() {
  if (!isSupabaseConfigured()) return mockDb.listApplications();

  const client = serviceClient();
  if (!client) return mockDb.listApplications();
  const { data, error } = await client.from("vendor_applications").select("*").order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => toVendorApplication(row as Record<string, unknown>));
}

export async function createVendorApplication(app: VendorApplication) {
  if (!isSupabaseConfigured()) return mockDb.createApplication(app);

  const client = serviceClient();
  if (!client) return mockDb.createApplication(app);

  const payload = {
    company_name: app.company.name,
    country: app.company.country,
    summary: app.company.summary,
    services: app.company.services,
    min_rate: app.company.minRate,
    max_rate: app.company.maxRate,
    team_size: app.company.teamSize,
    english_level: app.company.english,
    japanese_support: app.company.japaneseSupport,
    plan_key: app.company.plan,
    website_url: app.company.websiteUrl,
    public_contact_email: app.company.publicContactEmail,
    public_contact_phone: app.company.publicContactPhone,
    contact_name: app.contactName,
    contact_email: app.contactEmail,
    status: "pending"
  };
  const { data, error } = await client.from("vendor_applications").insert(payload).select("*").single();
  if (error || !data) {
    return null;
  }
  return toVendorApplication(data as Record<string, unknown>);
}

export async function getCompanyProfile(companyId: string) {
  if (!isSupabaseConfigured()) return mockDb.getCompany(companyId);

  const client = serviceClient();
  if (!client) return mockDb.getCompany(companyId);

  const { data: profile } = await client.from("vendor_profiles").select("*").eq("id", companyId).maybeSingle();
  if (profile) return toCompany(profile as Record<string, unknown>);

  const { data: application } = await client.from("vendor_applications").select("*").eq("id", companyId).maybeSingle();
  if (application) return toCompany(application as Record<string, unknown>);
  return null;
}

export async function updateCompanyProfile(
  companyId: string,
  patch: Pick<Company, "summary" | "websiteUrl" | "publicContactEmail" | "publicContactPhone">
) {
  if (!isSupabaseConfigured()) return mockDb.updateCompany(companyId, patch);

  const client = serviceClient();
  if (!client) return mockDb.updateCompany(companyId, patch);

  const payload = {
    summary: patch.summary,
    website_url: patch.websiteUrl,
    public_contact_email: patch.publicContactEmail,
    public_contact_phone: patch.publicContactPhone
  };

  const { data: profile } = await client.from("vendor_profiles").update(payload).eq("id", companyId).select("*").maybeSingle();
  if (profile) return toCompany(profile as Record<string, unknown>);

  const { data: application } = await client.from("vendor_applications").update(payload).eq("id", companyId).select("*").maybeSingle();
  if (application) return toCompany(application as Record<string, unknown>);
  return null;
}

export async function reviewVendorApplication(id: string, decision: "approved" | "rejected") {
  if (!isSupabaseConfigured()) return mockDb.reviewApplication(id, decision);

  const client = serviceClient();
  if (!client) return mockDb.reviewApplication(id, decision);

  const { data, error } = await client
    .from("vendor_applications")
    .update({ status: decision, review_note: decision === "approved" ? "承認" : "却下", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return null;

  if (decision === "approved") {
    const { data: existing } = await client.from("vendor_profiles").select("id").eq("application_id", id).maybeSingle();
    if (!existing) {
      await client.from("vendor_profiles").insert({
        application_id: id,
        company_name: data.company_name,
        country: data.country,
        summary: data.summary,
        services: data.services ?? [],
        min_rate: data.min_rate,
        max_rate: data.max_rate,
        team_size: data.team_size,
        english_level: data.english_level,
        japanese_support: data.japanese_support,
        plan_key: data.plan_key
      });
    }
  }
  return toVendorApplication(data as Record<string, unknown>);
}

export async function runMatching(text: string, limit = 6) {
  const criteria = parseCriteria(text);
  const companies = await listCompaniesForMarketplace();
  const matches = runTierAwareMatch(companies, criteria, {}, limit);
  return { criteria, matches, assistantMessage: buildAssistantReply(criteria, matches) };
}

export function getBuyerFromSessionToken(token: string | undefined) {
  return mockDb.getBuyerByToken(token);
}

export async function listThreadsForBuyer(email: string) {
  if (!isSupabaseConfigured()) return mockDb.listThreads(email);
  return mockDb.listThreads(email);
}

export async function listThreadsForVendor(vendorCompanyId: string) {
  if (!isSupabaseConfigured()) return mockDb.listThreadsByVendorCompanyId(vendorCompanyId);
  return mockDb.listThreadsByVendorCompanyId(vendorCompanyId);
}

export function getThreadById(threadId: string) {
  return mockDb.getThreadById(threadId);
}

export async function createThreadForBuyer(email: string, vendorCompanyId: string) {
  if (!isSupabaseConfigured()) return mockDb.findOrCreateThread(email, vendorCompanyId);
  return mockDb.findOrCreateThread(email, vendorCompanyId);
}

export async function listMessagesByThread(threadId: string) {
  if (!isSupabaseConfigured()) return mockDb.listMessages(threadId);
  return mockDb.listMessages(threadId);
}

export async function addMessageToThread(threadId: string, sender: "buyer" | "vendor", body: string) {
  if (!isSupabaseConfigured()) return mockDb.addMessage(threadId, sender, body);
  return mockDb.addMessage(threadId, sender, body);
}
