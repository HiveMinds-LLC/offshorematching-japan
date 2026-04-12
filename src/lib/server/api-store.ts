import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { parseCriteria, runTierAwareMatch } from "@/lib/matching";
import type { BuyerCriteria, BuyerOrganization, Company, CompletedEngagementRecord, DealRecord, DealStatus, MatchResult, MessageRecord, VendorApplication, VendorBillingAccount } from "@/lib/domain/types";
import { mockDb } from "@/lib/server/mock-db";
import { changeStripeSubscriptionPlan, releaseStripeSubscriptionSchedule, retrieveStripeSubscription, retrieveStripeSubscriptionSchedule, scheduleStripeSubscriptionPlanChangeAtPeriodEnd, updateStripeSubscriptionCancelAtPeriodEnd } from "@/lib/server/stripe";

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function supabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function supabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function serviceClient() {
  const url = supabaseUrl();
  const serviceKey = supabaseSecretKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient() {
  const url = supabaseUrl();
  const anonKey = supabasePublishableKey();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublishableKey() && supabaseSecretKey());
}

function toCompany(row: Record<string, unknown>): Company {
  const plan = row.plan_key === "translation" ? "translation" : "basic";
  return {
    id: String(row.id),
    name: String(row.company_name ?? ""),
    country: String(row.country ?? "Unknown"),
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    plan,
    active: typeof row.active === "boolean" ? row.active : undefined,
    flaggedAt: row.flagged_at ? String(row.flagged_at) : undefined,
    flagReason: row.flag_reason ? String(row.flag_reason) : undefined,
    deactivatedAt: row.deactivated_at ? String(row.deactivated_at) : undefined,
    deactivationReason: row.deactivation_reason ? String(row.deactivation_reason) : undefined,
    removedAt: row.removed_at ? String(row.removed_at) : undefined,
    removedReason: row.removed_reason ? String(row.removed_reason) : undefined,
    websiteUrl: row.website_url ? String(row.website_url) : undefined,
    publicContactEmail: row.public_contact_email ? String(row.public_contact_email) : undefined,
    publicContactPhone: row.public_contact_phone ? String(row.public_contact_phone) : undefined,
    preferredLanguage: row.preferred_language ? (String(row.preferred_language) as Company["preferredLanguage"]) : undefined,
    summary: String(row.summary ?? ""),
    summaryJa: row.summary_ja ? String(row.summary_ja) : undefined,
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    portfolioProjects: Array.isArray(row.portfolio_projects) ? (row.portfolio_projects as Company["portfolioProjects"]) : [],
    completedEngagements: Array.isArray(row.completed_engagements) ? (row.completed_engagements as CompletedEngagementRecord[]) : undefined,
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
      preferred_language: row.preferred_language,
      services: row.services,
      portfolio_projects: row.portfolio_projects,
      min_rate: row.min_rate,
      max_rate: row.max_rate,
      team_size: row.team_size,
      english_level: row.english_level,
      japanese_support: row.japanese_support,
      contact_name: row.contact_name,
      summary_ja: row.summary_ja,
      plan_key: row.plan_key
    }),
    contactName: String(row.contact_name ?? "N/A"),
    contactEmail: String(row.contact_email ?? ""),
    status: (row.status as VendorApplication["status"]) ?? "pending",
    submittedAt: String(row.submitted_at ?? new Date().toISOString()),
    lastSubmittedAt: row.last_submitted_at ? String(row.last_submitted_at) : undefined,
    lastResubmittedAt: row.last_resubmitted_at ? String(row.last_resubmitted_at) : undefined,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
    termsAcceptedAt: row.terms_accepted_at ? String(row.terms_accepted_at) : undefined,
    termsVersion: row.terms_version ? String(row.terms_version) : undefined
  };
}

function toBillingAccount(row: Record<string, unknown>): VendorBillingAccount {
  const plan = row.plan_key === "translation" ? "translation" : "basic";
  return {
    companyId: String(row.company_id ?? row.vendor_profile_id ?? ""),
    applicationId: row.application_id ? String(row.application_id) : undefined,
    companyName: String(row.company_name ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    plan,
    pendingPlan: row.pending_plan_key === "translation" ? "translation" : row.pending_plan_key === "basic" ? "basic" : undefined,
    pendingScheduleId: row.stripe_subscription_schedule_id ? String(row.stripe_subscription_schedule_id) : undefined,
    translationEnabled: Boolean(row.translation_enabled ?? plan === "translation"),
    monthlyPriceJpy: Number(row.monthly_price_jpy ?? (plan === "translation" ? 10000 : 5000)),
    status: (row.status as VendorBillingAccount["status"]) ?? "pending_checkout",
    termsAcceptedAt: row.terms_accepted_at ? String(row.terms_accepted_at) : undefined,
    termsVersion: row.terms_version ? String(row.terms_version) : undefined,
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : undefined,
    pendingPlanEffectiveAt: row.pending_plan_effective_at ? String(row.pending_plan_effective_at) : undefined,
    pauseRequestedAt: row.pause_requested_at ? String(row.pause_requested_at) : undefined,
    canceledAt: row.canceled_at ? String(row.canceled_at) : undefined,
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : undefined,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : undefined
  };
}

function planFromStripePriceId(priceId: string | null | undefined): "basic" | "translation" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_VENDOR_MONTHLY_PRICE_ID) return "basic";
  if (priceId === process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID) return "translation";
  return null;
}

function hasFuturePendingPlan(row: Record<string, unknown>) {
  if (!row.pending_plan_key || !row.pending_plan_effective_at) return false;
  const effectiveAt = new Date(String(row.pending_plan_effective_at)).getTime();
  if (Number.isNaN(effectiveAt)) return false;
  return effectiveAt > Date.now();
}

async function enrichBillingAccountWithScheduledPlan(
  billingAccount: VendorBillingAccount,
  subscription: Awaited<ReturnType<typeof retrieveStripeSubscription>>
): Promise<VendorBillingAccount> {
  const scheduleId =
    typeof subscription?.schedule === "string"
      ? subscription.schedule
      : subscription?.schedule?.id;

  if (!scheduleId) return billingAccount;

  const schedule = await retrieveStripeSubscriptionSchedule(scheduleId);
  const nextPhase = schedule?.phases?.[1];
  const nextPriceId = nextPhase?.items?.[0]?.price as string | undefined;
  const nextPlan = planFromStripePriceId(nextPriceId);
  const effectiveAt = nextPhase?.start_date ? new Date(nextPhase.start_date * 1000).toISOString() : undefined;

  if (!nextPlan || nextPlan === billingAccount.plan) return billingAccount;

  return {
    ...billingAccount,
    pendingPlan: nextPlan,
    pendingPlanEffectiveAt: effectiveAt ?? billingAccount.pendingPlanEffectiveAt
  };
}

async function persistPendingPlanState(
  client: SupabaseClient,
  companyId: string,
  pendingPlan?: "basic" | "translation",
  pendingPlanEffectiveAt?: string,
  pendingScheduleId?: string
) {
  await client
    .from("vendor_billing_accounts")
    .update({
      pending_plan_key: pendingPlan ?? null,
      pending_plan_effective_at: pendingPlan ? pendingPlanEffectiveAt ?? null : null,
      stripe_subscription_schedule_id: pendingPlan ? pendingScheduleId ?? null : null
    })
    .eq("company_id", companyId);
}

function toMessageRecord(row: Record<string, unknown>): MessageRecord {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    sender: (row.sender_role as MessageRecord["sender"]) ?? "buyer",
    messageType: (row.message_type as MessageRecord["messageType"]) ?? "text",
    body: String(row.body ?? ""),
    originalLanguage: String(row.original_language ?? ""),
    translations: {
      ja: row.translated_body_ja ? String(row.translated_body_ja) : undefined,
      en: row.translated_body_en ? String(row.translated_body_en) : undefined,
      company: row.translated_body_company ? String(row.translated_body_company) : undefined
    },
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

function toDealRecord(row: Record<string, unknown>): DealRecord {
  return {
    threadId: String(row.thread_id),
    title: row.title ? String(row.title) : undefined,
    status: row.status as DealStatus,
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by_role as "buyer" | "vendor",
    proposedStatus: row.proposed_status ? (String(row.proposed_status) as DealStatus) : null,
    proposedBy: row.proposed_by_role ? (String(row.proposed_by_role) as "buyer" | "vendor") : null,
    proposalCreatedAt: row.proposal_created_at ? String(row.proposal_created_at) : null,
    lockedAt: row.status_locked_at ? String(row.status_locked_at) : null
  };
}

const ALLOWED_DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  "相談中": ["進行中"],
  "進行中": ["相談中", "完了"],
  "完了": []
};

function canTransitionDealStatus(current: DealStatus, next: DealStatus, lockedAt?: string | null) {
  if (lockedAt || current === "完了") return false;
  return ALLOWED_DEAL_TRANSITIONS[current].includes(next);
}

function statusProposalMessage(nextStatus: DealStatus, by: "buyer" | "vendor") {
  const actor = by === "buyer" ? "発注企業" : "開発会社";
  return `${actor}が案件ステータスを「${nextStatus}」へ変更したいと提案しました。`;
}

function statusAcceptedMessage(nextStatus: DealStatus, by: "buyer" | "vendor") {
  const actor = by === "buyer" ? "発注企業" : "開発会社";
  return `${actor}が提案を承認し、案件ステータスが「${nextStatus}」に更新されました。`;
}

function statusRejectedMessage(by: "buyer" | "vendor") {
  const actor = by === "buyer" ? "発注企業" : "開発会社";
  return `${actor}がステータス変更提案を却下しました。`;
}

function makeTranslatedText(body: string, target: string) {
  if (target === "ja") return `[JA] ${body}`;
  if (target === "en") return `[EN] ${body}`;
  return `[${target.toUpperCase()}] ${body}`;
}

function companyLanguageFromCountry(country: string | undefined) {
  const lower = (country ?? "").toLowerCase();
  if (lower.includes("japan")) return "ja";
  if (lower.includes("vietnam")) return "vi";
  if (lower.includes("indonesia")) return "id";
  if (lower.includes("thailand")) return "th";
  if (lower.includes("poland")) return "pl";
  if (lower.includes("romania")) return "ro";
  if (lower.includes("korea")) return "ko";
  if (lower.includes("india")) return "hi";
  if (lower.includes("ukraine")) return "uk";
  if (lower.includes("estonia")) return "et";
  if (lower.includes("spain")) return "es";
  if (lower.includes("malaysia")) return "ms";
  if (lower.includes("philippines")) return "tl";
  return "en";
}

async function getBuyerOrgRowByUserId(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("buyer_organizations")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data;
}

async function getVendorProfileRowByUserId(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("vendor_profiles")
    .select("id, owner_user_id, plan_key, preferred_language, country")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data;
}

async function getBuyerOwnedThreadRow(client: SupabaseClient, threadId: string, userId: string) {
  const { data } = await client
    .from("message_threads")
    .select("id, buyer_org_id, vendor_profile_id, created_at")
    .eq("id", threadId)
    .maybeSingle();
  if (!data) return null;

  const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
  if (!buyerOrg || buyerOrg.id !== data.buyer_org_id) return null;
  return data;
}

async function getVendorOwnedThreadRow(client: SupabaseClient, threadId: string, userId: string) {
  const { data } = await client
    .from("message_threads")
    .select("id, buyer_org_id, vendor_profile_id, created_at")
    .eq("id", threadId)
    .maybeSingle();
  if (!data) return null;

  const vendorProfile = await getVendorProfileRowByUserId(client, userId);
  if (!vendorProfile || vendorProfile.id !== data.vendor_profile_id) return null;
  return data;
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
            .map((entry, index) => `${index + 1}. ${entry.company.name} (score ${entry.score.toFixed(1)}) - ${entry.reasons.slice(0, 2).join(" / ") || "基本条件に適合"}`)
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

export async function createBuyerProfileForUser(input: Omit<BuyerOrganization, "id" | "password"> & { userId: string }) {
  if (!isSupabaseConfigured()) {
    const buyer: BuyerOrganization = {
      id: globalThis.crypto.randomUUID(),
      companyName: input.companyName,
      industry: input.industry,
      contactName: input.contactName,
      email: input.email,
      password: ""
    };
    mockDb.upsertBuyer(buyer);
    return { ok: true as const, buyer };
  }

  const service = serviceClient();
  if (!service) return { ok: false as const, error: "Supabase service client is not configured." };

  const existing = await service
    .from("buyer_organizations")
    .select("id, company_name, industry, contact_name")
    .eq("owner_user_id", input.userId)
    .maybeSingle();

  if (existing.data) {
    const buyer: BuyerOrganization = {
      id: existing.data.id,
      companyName: existing.data.company_name ?? "",
      industry: existing.data.industry ?? "",
      contactName: existing.data.contact_name ?? "",
      email: input.email.toLowerCase(),
      password: ""
    };
    mockDb.upsertBuyer(buyer);
    return { ok: true as const, buyer };
  }

  const { data, error } = await service
    .from("buyer_organizations")
    .insert({
      owner_user_id: input.userId,
      company_name: input.companyName,
      industry: input.industry,
      contact_name: input.contactName
    })
    .select("id, company_name, industry, contact_name")
    .single();

  if (error || !data) {
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

export async function getBuyerByUserId(userId: string, email?: string) {
  if (!isSupabaseConfigured()) return null;

  const service = serviceClient();
  if (!service) return null;

  const { data, error } = await service
    .from("buyer_organizations")
    .select("id, company_name, industry, contact_name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const buyer: BuyerOrganization = {
    id: data.id,
    companyName: data.company_name ?? "",
    industry: data.industry ?? "",
    contactName: data.contact_name ?? "",
    email: email?.toLowerCase() ?? "",
    password: ""
  };
  mockDb.upsertBuyer(buyer);
  return buyer;
}

export async function listSavedCompanyIdsByBuyerUserId(userId: string) {
  try {
    if (!isSupabaseConfigured()) return [] as string[];

    const client = serviceClient();
    if (!client) return [] as string[];

    const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
    if (!buyerOrg) return [] as string[];

    const { data, error } = await client
      .from("buyer_saved_companies")
      .select("vendor_profile_id")
      .eq("buyer_org_id", buyerOrg.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [] as string[];
    return data.map((row) => String(row.vendor_profile_id));
  } catch (error) {
    console.error("Failed to list buyer saved companies", error);
    return [] as string[];
  }
}

export async function saveCompanyForBuyerUserId(userId: string, vendorCompanyId: string) {
  if (!isSupabaseConfigured()) return { ok: true as const };

  const client = serviceClient();
  if (!client) return { ok: false as const, error: "Supabase client is not configured." };

  const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
  if (!buyerOrg) return { ok: false as const, error: "発注企業プロフィールが見つかりません。" };

  const { error } = await client.from("buyer_saved_companies").upsert({
    buyer_org_id: buyerOrg.id,
    vendor_profile_id: vendorCompanyId
  });

  if (error) return { ok: false as const, error: "保存候補に追加できませんでした。" };
  return { ok: true as const };
}

export async function removeSavedCompanyForBuyerUserId(userId: string, vendorCompanyId: string) {
  if (!isSupabaseConfigured()) return { ok: true as const };

  const client = serviceClient();
  if (!client) return { ok: false as const, error: "Supabase client is not configured." };

  const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
  if (!buyerOrg) return { ok: false as const, error: "発注企業プロフィールが見つかりません。" };

  const { error } = await client
    .from("buyer_saved_companies")
    .delete()
    .eq("buyer_org_id", buyerOrg.id)
    .eq("vendor_profile_id", vendorCompanyId);

  if (error) return { ok: false as const, error: "保存候補から外せませんでした。" };
  return { ok: true as const };
}

export async function getAppUserRole(userId: string) {
  if (!isSupabaseConfigured()) return null;

  const service = serviceClient();
  if (!service) return null;

  const { data, error } = await service
    .from("app_users")
    .select("account_type, email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    accountType: String(data.account_type ?? ""),
    email: String(data.email ?? "")
  };
}

export async function getThreadStatusCountsByUserId(userId: string, role: "buyer" | "vendor") {
  if (!isSupabaseConfigured()) {
    return { activeCount: 0, completedCount: 0 };
  }

  const client = serviceClient();
  if (!client) return { activeCount: 0, completedCount: 0 };

  if (role === "buyer") {
    const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
    if (!buyerOrg) return { activeCount: 0, completedCount: 0 };

    const { data, error } = await client
      .from("deal_records")
      .select("status, status_locked_at, message_threads!inner(buyer_org_id)")
      .eq("message_threads.buyer_org_id", buyerOrg.id);

    if (error || !data) return { activeCount: 0, completedCount: 0 };

    const completedCount = data.filter((row) => row.status === "完了" && Boolean(row.status_locked_at)).length;
    const activeCount = data.length - completedCount;
    return { activeCount, completedCount };
  }

  const vendorProfile = await getVendorProfileRowByUserId(client, userId);
  if (!vendorProfile) return { activeCount: 0, completedCount: 0 };

  const { data, error } = await client
    .from("deal_records")
    .select("status, status_locked_at, message_threads!inner(vendor_profile_id)")
    .eq("message_threads.vendor_profile_id", vendorProfile.id);

  if (error || !data) return { activeCount: 0, completedCount: 0 };

  const completedCount = data.filter((row) => row.status === "完了" && Boolean(row.status_locked_at)).length;
  const activeCount = data.length - completedCount;
  return { activeCount, completedCount };
}

export async function getVendorCompanyByUserId(userId: string) {
  if (!isSupabaseConfigured()) return null;

  const service = serviceClient();
  if (!service) return null;

  const { data: profile, error: profileError } = await service
    .from("vendor_profiles")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (profileError) return null;
  if (profile) return toCompany(profile as Record<string, unknown>);

  const { data: application, error: applicationError } = await service
    .from("vendor_applications")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (applicationError || !application) return null;
  return toCompany(application as Record<string, unknown>);
}

export async function getVendorApplicationByUserId(userId: string) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const { data, error } = await client
    .from("vendor_applications")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return toVendorApplication(data as Record<string, unknown>);
}

type VendorApplicationInput = {
  userId: string;
  company: Company;
  contactName: string;
  contactEmail: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
};

function isVendorProfileComplete(company: Pick<Company, "name" | "country" | "summary" | "services" | "minRate" | "maxRate" | "teamSize">, contactName?: string | null) {
  return Boolean(
    company.name.trim() &&
    company.country.trim() &&
    contactName?.trim() &&
    company.summary.trim() &&
    company.services.length > 0 &&
    company.minRate > 0 &&
    company.maxRate >= company.minRate &&
    company.teamSize > 0
  );
}

function vendorApplicationPayload(input: VendorApplicationInput) {
  return {
    owner_user_id: input.userId,
    company_name: input.company.name,
    country: input.company.country,
    summary: input.company.summary,
    services: input.company.services,
    portfolio_projects: input.company.portfolioProjects,
    min_rate: input.company.minRate,
    max_rate: input.company.maxRate,
    team_size: input.company.teamSize,
    english_level: input.company.english,
    japanese_support: input.company.japaneseSupport,
    plan_key: input.company.plan,
    preferred_language: input.company.preferredLanguage,
    website_url: input.company.websiteUrl,
    public_contact_email: input.company.publicContactEmail,
    public_contact_phone: input.company.publicContactPhone,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    terms_accepted_at: input.termsAcceptedAt,
    terms_version: input.termsVersion
  };
}

async function syncVendorListingStateFromApplicationRow(client: SupabaseClient, row: Record<string, unknown>) {
  const company = toCompany(row);
  const contactName = row.contact_name ? String(row.contact_name) : "";

  const { data: billingRow } = await client
    .from("vendor_billing_accounts")
    .select("*")
    .eq("application_id", String(row.id))
    .maybeSingle();

  const billingStatus = billingRow?.status ? String(billingRow.status) : null;
  const shouldBeActive = billingStatus === "active" && isVendorProfileComplete(company, contactName);

  const { data: existingProfile } = await client
    .from("vendor_profiles")
    .select("id, application_id")
    .eq("application_id", String(row.id))
    .maybeSingle();

  const profilePayload = {
    owner_user_id: row.owner_user_id ? String(row.owner_user_id) : null,
    application_id: String(row.id),
    company_name: company.name,
    country: company.country,
    contact_name: contactName || null,
    summary: company.summary,
    summary_ja: company.summaryJa ?? null,
    services: company.services,
    portfolio_projects: company.portfolioProjects,
    min_rate: company.minRate,
    max_rate: company.maxRate,
    team_size: company.teamSize,
    english_level: company.english,
    japanese_support: company.japaneseSupport,
    plan_key: company.plan,
    preferred_language: company.preferredLanguage ?? null,
    website_url: company.websiteUrl ?? null,
    public_contact_email: company.publicContactEmail ?? row.contact_email ?? null,
    public_contact_phone: company.publicContactPhone ?? null,
    active: shouldBeActive
  };

  if (existingProfile) {
    await client.from("vendor_profiles").update(profilePayload).eq("id", String(existingProfile.id));
  } else {
    await client.from("vendor_profiles").insert({
      id: String(row.id),
      ...profilePayload
    });
  }

  const nextStatus =
    String(row.status) === "rejected"
      ? "rejected"
      : shouldBeActive
        ? "approved"
        : "draft";

  if (String(row.status) !== nextStatus) {
    await client
      .from("vendor_applications")
      .update({
        status: nextStatus,
        review_note: nextStatus === "approved" ? "決済と必須プロフィール入力が完了し、掲載中です。" : null,
        reviewed_at: null,
        reviewed_by: null
      })
      .eq("id", String(row.id));
  }
}

async function syncVendorPlanAcrossRecords(client: SupabaseClient, applicationId: string | null, companyId: string, plan: "basic" | "translation") {
  if (applicationId) {
    await client.from("vendor_applications").update({ plan_key: plan }).eq("id", applicationId);
  }
  await client.from("vendor_profiles").update({ plan_key: plan }).eq("id", companyId);
}

export async function createVendorApplicationDraftForUser(input: VendorApplicationInput) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const existing = await getVendorApplicationByUserId(input.userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("vendor_applications")
    .insert({
      ...vendorApplicationPayload(input),
      status: "draft",
      submitted_at: now
    })
    .select("*")
    .single();

  if (error || !data) return null;
  await syncVendorListingStateFromApplicationRow(client, data as Record<string, unknown>);
  return toVendorApplication(data as Record<string, unknown>);
}

export async function updateVendorApplicationByUserId(input: VendorApplicationInput) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const { data, error } = await client
    .from("vendor_applications")
    .update(vendorApplicationPayload(input))
    .eq("owner_user_id", input.userId)
    .select("*")
    .single();

  if (error || !data) return null;
  await syncVendorListingStateFromApplicationRow(client, data as Record<string, unknown>);
  const { data: refreshed } = await client.from("vendor_applications").select("*").eq("id", String(data.id)).single();
  return toVendorApplication((refreshed ?? data) as Record<string, unknown>);
}

export async function submitVendorApplicationByUserId(userId: string) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const { data, error } = await client
    .from("vendor_applications")
    .select("*")
    .eq("owner_user_id", userId)
    .single();

  if (error || !data) return null;
  await syncVendorListingStateFromApplicationRow(client, data as Record<string, unknown>);
  const { data: refreshed } = await client.from("vendor_applications").select("*").eq("id", String(data.id)).single();
  return toVendorApplication((refreshed ?? data) as Record<string, unknown>);
}

async function loadSupabaseCompanies(client: SupabaseClient) {
  const { data: profileRows } = await client.from("vendor_profiles").select("*").eq("active", true);
  const rows = (profileRows ?? []) as Array<Record<string, unknown>>;
  const companyIds = rows.map((row) => String(row.id));
  const { data: billingRows } = companyIds.length > 0
    ? await client.from("vendor_billing_accounts").select("company_id, plan_key").in("company_id", companyIds)
    : { data: [] as Array<{ company_id: string; plan_key: string | null }> };
  const billingPlanByCompanyId = new Map((billingRows ?? []).map((row) => [String(row.company_id), row.plan_key]));
  return rows.map((row) =>
    toCompany({
      ...row,
      plan_key: billingPlanByCompanyId.get(String(row.id)) ?? row.plan_key
    })
  );
}

export async function listCompaniesForMarketplace() {
  if (!isSupabaseConfigured()) return mockDb.listCompanies();

  const client = serviceClient();
  if (!client) return mockDb.listCompanies();
  return loadSupabaseCompanies(client);
}

export async function getMarketplaceStats() {
  if (!isSupabaseConfigured()) {
    return {
      listedVendorCount: mockDb.listCompanies().length,
      activeMatchCount: 0,
      completedJobCount: 0
    };
  }

  const client = serviceClient();
  if (!client) {
    return {
      listedVendorCount: mockDb.listCompanies().length,
      activeMatchCount: 0,
      completedJobCount: 0
    };
  }

  const [vendorResult, dealsResult] = await Promise.all([
    client.from("vendor_profiles").select("id", { count: "exact", head: true }).eq("active", true),
    client.from("deal_records").select("status, status_locked_at")
  ]);

  const deals = dealsResult.data ?? [];
  const completedJobCount = deals.filter((row) => row.status === "完了" && Boolean(row.status_locked_at)).length;
  const activeMatchCount = deals.length - completedJobCount;

  return {
    listedVendorCount: vendorResult.count ?? 0,
    activeMatchCount,
    completedJobCount
  };
}

export async function listVendorApplications() {
  if (!isSupabaseConfigured()) return mockDb.listApplications();

  const client = serviceClient();
  if (!client) return mockDb.listApplications();
  const { data, error } = await client.from("vendor_applications").select("*").order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => toVendorApplication(row as Record<string, unknown>));
}

export async function listVendorProfilesForAdmin() {
  if (!isSupabaseConfigured()) return mockDb.listCompanies();

  const client = serviceClient();
  if (!client) return mockDb.listCompanies();
  const { data, error } = await client.from("vendor_profiles").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => toCompany(row as Record<string, unknown>));
}

export async function createVendorApplication(app: VendorApplication) {
  if (!isSupabaseConfigured()) return mockDb.createApplication(app);

  const client = serviceClient();
  if (!client) return mockDb.createApplication(app);

  const payload = {
    company_name: app.company.name,
    country: app.company.country,
    summary: app.company.summary,
    summary_ja: app.company.summaryJa ?? null,
    services: app.company.services,
    portfolio_projects: app.company.portfolioProjects,
    min_rate: app.company.minRate,
    max_rate: app.company.maxRate,
    team_size: app.company.teamSize,
    english_level: app.company.english,
    japanese_support: app.company.japaneseSupport,
    plan_key: app.company.plan,
    preferred_language: app.company.preferredLanguage,
    website_url: app.company.websiteUrl,
    public_contact_email: app.company.publicContactEmail,
    public_contact_phone: app.company.publicContactPhone,
    contact_name: app.contactName,
    contact_email: app.contactEmail,
    status: "pending",
    terms_accepted_at: app.termsAcceptedAt,
    terms_version: app.termsVersion
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
  if (profile) {
    const { data: billing } = await client
      .from("vendor_billing_accounts")
      .select("plan_key")
      .eq("company_id", companyId)
      .maybeSingle();
    const completedEngagements = await listCompletedEngagementsForVendorProfile(companyId);
    return {
      ...toCompany({
        ...(profile as Record<string, unknown>),
        plan_key: billing?.plan_key ?? (profile as Record<string, unknown>).plan_key
      }),
      completedEngagements
    };
  }

  const { data: application } = await client.from("vendor_applications").select("*").eq("id", companyId).maybeSingle();
  if (application) return toCompany(application as Record<string, unknown>);
  return null;
}

export async function listCompletedEngagementsForVendorProfile(companyId: string) {
  if (!isSupabaseConfigured()) return [];

  const client = serviceClient();
  if (!client) return [];

  const { data, error } = await client
    .from("deal_records")
    .select("thread_id, title, status_locked_at, message_threads!inner(vendor_profile_id)")
    .eq("message_threads.vendor_profile_id", companyId)
    .eq("status", "完了")
    .not("status_locked_at", "is", null)
    .order("status_locked_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row, index) => ({
    id: String(row.thread_id),
    title: row.title ? String(row.title) : `完了案件 ${index + 1}`,
    summary: "Completed through OffshoreMatch.",
    completedAt: String(row.status_locked_at ?? new Date().toISOString())
  }));
}

export async function updateCompanyProfile(
  companyId: string,
  patch: Pick<
    Company,
    | "name"
    | "country"
    | "contactName"
    | "summary"
    | "summaryJa"
    | "websiteUrl"
    | "publicContactPhone"
    | "preferredLanguage"
    | "portfolioProjects"
    | "services"
    | "minRate"
    | "maxRate"
    | "teamSize"
    | "english"
    | "japaneseSupport"
  >
) {
  if (!isSupabaseConfigured()) return mockDb.updateCompany(companyId, patch);

  const client = serviceClient();
  if (!client) return mockDb.updateCompany(companyId, patch);

  const profilePayload = {
    company_name: patch.name,
    country: patch.country,
    contact_name: patch.contactName,
    summary: patch.summary,
    summary_ja: patch.summaryJa ?? null,
    website_url: patch.websiteUrl,
    public_contact_phone: patch.publicContactPhone,
    preferred_language: patch.preferredLanguage,
    portfolio_projects: patch.portfolioProjects,
    services: patch.services,
    min_rate: patch.minRate,
    max_rate: patch.maxRate,
    team_size: patch.teamSize,
    english_level: patch.english,
    japanese_support: patch.japaneseSupport
  };

  const { data: profile } = await client.from("vendor_profiles").update(profilePayload).eq("id", companyId).select("*").maybeSingle();
  if (profile) {
    const applicationId = (profile as { application_id?: string | null }).application_id;
    if (applicationId) {
      await client
        .from("vendor_applications")
        .update({
          company_name: patch.name,
          country: patch.country,
          contact_name: patch.contactName,
          summary: patch.summary,
          summary_ja: patch.summaryJa ?? null,
          website_url: patch.websiteUrl,
          public_contact_phone: patch.publicContactPhone,
          preferred_language: patch.preferredLanguage,
          portfolio_projects: patch.portfolioProjects,
          services: patch.services,
          min_rate: patch.minRate,
          max_rate: patch.maxRate,
          team_size: patch.teamSize,
          english_level: patch.english,
          japanese_support: patch.japaneseSupport
        })
        .eq("id", applicationId);
      const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", applicationId).maybeSingle();
      if (applicationRow) {
        await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
      }
    }
    const { data: refreshedProfile } = await client.from("vendor_profiles").select("*").eq("id", companyId).maybeSingle();
    return toCompany((refreshedProfile ?? profile) as Record<string, unknown>);
  }

  const { data: application } = await client
    .from("vendor_applications")
    .update({
      company_name: patch.name,
      country: patch.country,
      contact_name: patch.contactName,
      summary: patch.summary,
      summary_ja: patch.summaryJa ?? null,
      website_url: patch.websiteUrl,
      public_contact_phone: patch.publicContactPhone,
      preferred_language: patch.preferredLanguage,
      portfolio_projects: patch.portfolioProjects,
      services: patch.services,
      min_rate: patch.minRate,
      max_rate: patch.maxRate,
      team_size: patch.teamSize,
      english_level: patch.english,
      japanese_support: patch.japaneseSupport
    })
    .eq("id", companyId)
    .select("*")
    .maybeSingle();
  if (application) {
    await syncVendorListingStateFromApplicationRow(client, application as Record<string, unknown>);
    const { data: refreshedApplication } = await client.from("vendor_applications").select("*").eq("id", companyId).maybeSingle();
    return toCompany((refreshedApplication ?? application) as Record<string, unknown>);
  }
  return null;
}

export async function reviewVendorApplication(
  id: string,
  decision: "approved" | "changes_requested" | "rejected",
  options?: { reviewNote?: string; reviewedBy?: string }
) {
  if (!isSupabaseConfigured()) return mockDb.reviewApplication(id, decision);

  const client = serviceClient();
  if (!client) return mockDb.reviewApplication(id, decision);

  const reviewNote =
    options?.reviewNote?.trim() ||
    (decision === "approved" ? "承認" : decision === "changes_requested" ? "修正のうえ再申請してください。" : "却下");

  const { data, error } = await client
    .from("vendor_applications")
    .update({
      status: decision,
      review_note: reviewNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: options?.reviewedBy ?? null
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return null;

  if (decision === "approved") {
    const { data: existing } = await client.from("vendor_profiles").select("id").eq("application_id", id).maybeSingle();
    if (!existing) {
      await client.from("vendor_profiles").insert({
        owner_user_id: data.owner_user_id,
        application_id: id,
        company_name: data.company_name,
        country: data.country,
        contact_name: data.contact_name,
        summary: data.summary,
        services: data.services ?? [],
        portfolio_projects: data.portfolio_projects ?? [],
        min_rate: data.min_rate,
        max_rate: data.max_rate,
        team_size: data.team_size,
        english_level: data.english_level,
        japanese_support: data.japanese_support,
        plan_key: data.plan_key,
        preferred_language: data.preferred_language,
        website_url: data.website_url,
        public_contact_email: data.public_contact_email,
        public_contact_phone: data.public_contact_phone
      });
    }
  }
  await syncVendorListingStateFromApplicationRow(client, data as Record<string, unknown>);
  const { data: refreshed } = await client.from("vendor_applications").select("*").eq("id", id).single();
  return toVendorApplication((refreshed ?? data) as Record<string, unknown>);
}

export async function moderateVendorProfile(companyId: string, action: "deactivate" | "reactivate" | "flag" | "remove", reason?: string) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const now = new Date().toISOString();
  const payload =
    action === "deactivate"
      ? {
          active: false,
          deactivated_at: now,
          deactivation_reason: reason ?? null
        }
      : action === "reactivate"
        ? {
            active: true,
            deactivated_at: null,
            deactivation_reason: null,
            removed_at: null,
            removed_reason: null
          }
        : action === "flag"
          ? {
              flagged_at: now,
              flag_reason: reason ?? null
            }
          : {
              active: false,
              removed_at: now,
              removed_reason: reason ?? null
            };

  const { data, error } = await client.from("vendor_profiles").update(payload).eq("id", companyId).select("*").single();
  if (error || !data) return null;
  return toCompany(data as Record<string, unknown>);
}

export async function getVendorBillingAccount(companyId: string) {
  if (!isSupabaseConfigured()) return mockDb.getBillingAccount(companyId);

  const client = serviceClient();
  if (!client) return mockDb.getBillingAccount(companyId);
  let { data } = await client.from("vendor_billing_accounts").select("*").eq("company_id", companyId).maybeSingle();
  if (!data) {
    const { data: profile } = await client.from("vendor_profiles").select("application_id").eq("id", companyId).maybeSingle();
    const applicationId = profile?.application_id ? String(profile.application_id) : null;
    if (applicationId) {
      const fallback = await client.from("vendor_billing_accounts").select("*").eq("application_id", applicationId).maybeSingle();
      data = fallback.data ?? null;
    }
  }
  if (!data) return null;

  const billingRow = data as Record<string, unknown>;
  const persistedPendingPlan =
    hasFuturePendingPlan(billingRow)
      ? {
          pendingPlan: billingRow.pending_plan_key === "translation" ? "translation" as const : "basic" as const,
          pendingPlanEffectiveAt: String(billingRow.pending_plan_effective_at)
        }
      : null;
  if (billingRow.stripe_subscription_id) {
    const subscription = await retrieveStripeSubscription(String(billingRow.stripe_subscription_id));
    if (subscription) {
      const synced = await syncVendorBillingAccountFromStripe({
        applicationId: billingRow.application_id ? String(billingRow.application_id) : null,
        companyId,
        customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
        subscriptionId: subscription.id,
        plan: billingRow.plan_key === "translation" ? "translation" : "basic",
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
      });
      if (synced) {
        const enriched = await enrichBillingAccountWithScheduledPlan(synced, subscription);
        const nextBillingAccount =
          !enriched.pendingPlan && persistedPendingPlan && enriched.plan !== persistedPendingPlan.pendingPlan
            ? { ...enriched, ...persistedPendingPlan }
            : enriched;

        if (
          nextBillingAccount.pendingPlan !== synced.pendingPlan ||
          (nextBillingAccount.pendingPlanEffectiveAt ?? null) !== (synced.pendingPlanEffectiveAt ?? null)
        ) {
          const scheduleId =
            typeof subscription.schedule === "string"
              ? subscription.schedule
              : subscription.schedule?.id;
          await persistPendingPlanState(
            client,
            synced.companyId,
            nextBillingAccount.pendingPlan,
            nextBillingAccount.pendingPlanEffectiveAt,
            nextBillingAccount.pendingPlan ? scheduleId ?? synced.pendingScheduleId : undefined
          );
        }
        return nextBillingAccount;
      }
    }
  }

  return toBillingAccount(billingRow);
}

export async function createPendingBillingAccount(application: VendorApplication) {
  if (!isSupabaseConfigured()) return mockDb.createPendingBillingAccount(application);

  const client = serviceClient();
  if (!client) return mockDb.createPendingBillingAccount(application);
  const { data, error } = await client
    .from("vendor_billing_accounts")
    .upsert(
      {
        company_id: application.company.id,
        application_id: application.id,
        company_name: application.company.name,
        contact_email: application.contactEmail,
        plan_key: application.company.plan,
        translation_enabled: application.company.plan === "translation",
        monthly_price_jpy: application.company.plan === "translation" ? 10000 : 5000,
        status: "pending_checkout",
        terms_accepted_at: application.termsAcceptedAt,
        terms_version: application.termsVersion
      },
      { onConflict: "company_id" }
    )
    .select("*")
    .single();
  if (error || !data) return null;
  await syncVendorPlanAcrossRecords(
    client,
    data.application_id ? String(data.application_id) : null,
    String(data.company_id),
    application.company.plan === "translation" ? "translation" : "basic"
  );
  if (data.application_id) {
    const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", String(data.application_id)).maybeSingle();
    if (applicationRow) {
      await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
    }
  }
  return toBillingAccount(data as Record<string, unknown>);
}

function mapStripeSubscriptionStatus(status: string | null | undefined): VendorBillingAccount["status"] {
  if (status === "active" || status === "trialing") return "active";
  if (status === "paused") return "paused";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") return "canceled";
  return "pending_checkout";
}

export async function syncVendorBillingAccountFromStripe(input: {
  applicationId?: string | null;
  companyId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  plan?: "basic" | "translation" | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  cancelAt?: string | null;
  canceledAt?: string | null;
}) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const identifiers = [
    input.companyId ? ["company_id", input.companyId] as const : null,
    input.applicationId ? ["application_id", input.applicationId] as const : null,
    input.subscriptionId ? ["stripe_subscription_id", input.subscriptionId] as const : null
  ].filter(Boolean) as Array<readonly [string, string]>;

  let existing: Record<string, unknown> | null = null;
  for (const [column, value] of identifiers) {
    const { data } = await client.from("vendor_billing_accounts").select("*").eq(column, value).maybeSingle();
    if (data) {
      existing = data as Record<string, unknown>;
      break;
    }
  }

  if (!existing) return null;

  const plan = input.plan ?? ((existing.plan_key as "basic" | "translation" | undefined) ?? "basic");
  const nextStatus = mapStripeSubscriptionStatus(input.subscriptionStatus);
  const nextCanceledAt =
    input.cancelAt
      ? input.cancelAt
      : input.cancelAtPeriodEnd
        ? input.canceledAt ?? (existing.canceled_at ? String(existing.canceled_at) : new Date().toISOString())
        : nextStatus === "canceled"
        ? input.canceledAt ?? (existing.canceled_at ? String(existing.canceled_at) : new Date().toISOString())
        : null;
  const shouldClearPendingPlan =
    existing.pending_plan_key &&
    String(existing.pending_plan_key) === plan;
  const { data, error } = await client
    .from("vendor_billing_accounts")
    .update({
      plan_key: plan,
      translation_enabled: plan === "translation",
      monthly_price_jpy: plan === "translation" ? 10000 : 5000,
      status: nextStatus,
      stripe_customer_id: input.customerId ?? existing.stripe_customer_id ?? null,
      stripe_subscription_id: input.subscriptionId ?? existing.stripe_subscription_id ?? null,
      current_period_end: input.currentPeriodEnd ?? existing.current_period_end ?? null,
      canceled_at: nextCanceledAt,
      pending_plan_key: shouldClearPendingPlan ? null : existing.pending_plan_key ?? null,
      pending_plan_effective_at: shouldClearPendingPlan ? null : existing.pending_plan_effective_at ?? null,
      stripe_subscription_schedule_id: shouldClearPendingPlan ? null : existing.stripe_subscription_schedule_id ?? null
    })
    .eq("company_id", String(existing.company_id))
    .select("*")
    .single();

  if (error || !data) return null;
  await syncVendorPlanAcrossRecords(
    client,
    data.application_id ? String(data.application_id) : null,
    String(data.company_id),
    plan
  );
  if (data.application_id) {
    const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", String(data.application_id)).maybeSingle();
    if (applicationRow) {
      await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
    }
  }
  return toBillingAccount(data as Record<string, unknown>);
}

export async function updateVendorBillingStatus(companyId: string, action: "pause" | "resume" | "cancel") {
  if (!isSupabaseConfigured()) return mockDb.updateBillingStatus(companyId, action);

  const client = serviceClient();
  if (!client) return mockDb.updateBillingStatus(companyId, action);

  const { data: existingRow } = await client.from("vendor_billing_accounts").select("*").eq("company_id", companyId).maybeSingle();
  if (!existingRow) return null;

  if (action === "cancel" && existingRow.stripe_subscription_id) {
    const subscription = await updateStripeSubscriptionCancelAtPeriodEnd({
      subscriptionId: String(existingRow.stripe_subscription_id),
      cancelAtPeriodEnd: true
    });
    if (!subscription) return null;

    const synced = await syncVendorBillingAccountFromStripe({
      applicationId: existingRow.application_id ? String(existingRow.application_id) : null,
      companyId,
      customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
      subscriptionId: subscription.id,
      plan: existingRow.plan_key === "translation" ? "translation" : "basic",
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
    });
    if (!synced) return null;

    if (existingRow.application_id) {
      const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", String(existingRow.application_id)).maybeSingle();
      if (applicationRow) {
        await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
      }
    }
    return synced;
  }

  if (action === "resume" && existingRow.stripe_subscription_id && existingRow.canceled_at) {
    const subscription = await updateStripeSubscriptionCancelAtPeriodEnd({
      subscriptionId: String(existingRow.stripe_subscription_id),
      cancelAtPeriodEnd: false
    });
    if (!subscription) return null;

    const synced = await syncVendorBillingAccountFromStripe({
      applicationId: existingRow.application_id ? String(existingRow.application_id) : null,
      companyId,
      customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
      subscriptionId: subscription.id,
      plan: existingRow.plan_key === "translation" ? "translation" : "basic",
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
    });
    if (!synced) return null;

    if (existingRow.application_id) {
      const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", String(existingRow.application_id)).maybeSingle();
      if (applicationRow) {
        await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
      }
    }
    return synced;
  }

  const payload =
    action === "pause"
      ? { status: "paused", pause_requested_at: new Date().toISOString() }
      : action === "resume"
        ? { status: "active", pause_requested_at: null }
        : { status: "canceled", canceled_at: new Date().toISOString() };

  const { data, error } = await client.from("vendor_billing_accounts").update(payload).eq("company_id", companyId).select("*").single();
  if (error || !data) return null;
  if (data.application_id) {
    const { data: applicationRow } = await client.from("vendor_applications").select("*").eq("id", String(data.application_id)).maybeSingle();
    if (applicationRow) {
      await syncVendorListingStateFromApplicationRow(client, applicationRow as Record<string, unknown>);
    }
  }
  return toBillingAccount(data as Record<string, unknown>);
}

export async function updateVendorBillingPlan(companyId: string, plan: "basic" | "translation") {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  const { data: existingRow } = await client.from("vendor_billing_accounts").select("*").eq("company_id", companyId).maybeSingle();
  if (!existingRow || !existingRow.stripe_subscription_id) return null;

  const currentPlan = existingRow.plan_key === "translation" ? "translation" : "basic";
  if (currentPlan === plan) {
    return toBillingAccount(existingRow as Record<string, unknown>);
  }

  const subscription = await changeStripeSubscriptionPlan({
    subscriptionId: String(existingRow.stripe_subscription_id),
    plan,
    applicationId: existingRow.application_id ? String(existingRow.application_id) : undefined,
    companyId,
    companyName: existingRow.company_name ? String(existingRow.company_name) : undefined
  });
  if (!subscription) return null;

  const synced = await syncVendorBillingAccountFromStripe({
    applicationId: existingRow.application_id ? String(existingRow.application_id) : null,
    companyId,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    subscriptionId: subscription.id,
    plan,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  });
  if (!synced) return null;

  return synced;
}

export async function scheduleVendorBillingDowngrade(companyId: string) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  let { data: existingRow } = await client.from("vendor_billing_accounts").select("*").eq("company_id", companyId).maybeSingle();
  if (!existingRow) {
    const { data: profile } = await client.from("vendor_profiles").select("application_id").eq("id", companyId).maybeSingle();
    const applicationId = profile?.application_id ? String(profile.application_id) : null;
    if (applicationId) {
      const fallback = await client.from("vendor_billing_accounts").select("*").eq("application_id", applicationId).maybeSingle();
      existingRow = fallback.data ?? null;
    }
  }
  if (!existingRow || !existingRow.stripe_subscription_id) return null;
  if ((existingRow.plan_key !== "translation") || existingRow.pending_plan_key === "basic") {
    return toBillingAccount(existingRow as Record<string, unknown>);
  }

  const schedule = await scheduleStripeSubscriptionPlanChangeAtPeriodEnd({
    subscriptionId: String(existingRow.stripe_subscription_id),
    nextPlan: "basic"
  });
  if (!schedule) return null;

  const effectiveAt = schedule.phases[1]?.start_date
    ? new Date(schedule.phases[1].start_date * 1000).toISOString()
    : (existingRow.current_period_end ? String(existingRow.current_period_end) : null);

  const { data, error } = await client
    .from("vendor_billing_accounts")
    .update({
      pending_plan_key: "basic",
      pending_plan_effective_at: effectiveAt,
      stripe_subscription_schedule_id: schedule.id
    })
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ...toBillingAccount(existingRow as Record<string, unknown>),
      pendingPlan: "basic",
      pendingPlanEffectiveAt: effectiveAt ?? undefined,
      pendingScheduleId: schedule.id
    };
  }
  return toBillingAccount(data as Record<string, unknown>);
}

export async function cancelVendorBillingDowngrade(companyId: string) {
  if (!isSupabaseConfigured()) return null;

  const client = serviceClient();
  if (!client) return null;

  let { data: existingRow } = await client.from("vendor_billing_accounts").select("*").eq("company_id", companyId).maybeSingle();
  if (!existingRow) {
    const { data: profile } = await client.from("vendor_profiles").select("application_id").eq("id", companyId).maybeSingle();
    const applicationId = profile?.application_id ? String(profile.application_id) : null;
    if (applicationId) {
      const fallback = await client.from("vendor_billing_accounts").select("*").eq("application_id", applicationId).maybeSingle();
      existingRow = fallback.data ?? null;
    }
  }
  if (!existingRow || !existingRow.stripe_subscription_id) return null;

  const subscription = await retrieveStripeSubscription(String(existingRow.stripe_subscription_id));
  const scheduleId =
    existingRow.stripe_subscription_schedule_id
      ? String(existingRow.stripe_subscription_schedule_id)
      : typeof subscription?.schedule === "string"
        ? subscription.schedule
        : subscription?.schedule?.id;

  if (scheduleId) {
    await releaseStripeSubscriptionSchedule(scheduleId);
  }

  const { data, error } = await client
    .from("vendor_billing_accounts")
    .update({
      pending_plan_key: null,
      pending_plan_effective_at: null,
      stripe_subscription_schedule_id: null
    })
    .eq("company_id", String(existingRow.company_id))
    .select("*")
    .single();

  if (error || !data) return null;
  return toBillingAccount(data as Record<string, unknown>);
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

export async function listThreadsForBuyerByUserId(userId: string, email: string) {
  if (!isSupabaseConfigured()) return mockDb.listThreads(email);

  const client = serviceClient();
  if (!client) return mockDb.listThreads(email);

  const buyerOrg = await getBuyerOrgRowByUserId(client, userId);
  if (!buyerOrg) return [];

  const { data, error } = await client
    .from("message_threads")
    .select("id, vendor_profile_id, created_at, deal_records(status, status_locked_at)")
    .eq("buyer_org_id", buyerOrg.id)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  const vendorProfileIds = [...new Set(data.map((row) => String(row.vendor_profile_id)))];
  const { data: vendorProfiles } = await client
    .from("vendor_profiles")
    .select("id, company_name, application_id")
    .in("id", vendorProfileIds);
  const applicationIds = [...new Set((vendorProfiles ?? []).map((row) => String(row.application_id ?? "")).filter(Boolean))];
  const { data: vendorApplications } = applicationIds.length > 0
    ? await client.from("vendor_applications").select("id, contact_name").in("id", applicationIds)
    : { data: [] as Array<{ id: string; contact_name: string | null }> };
  const vendorProfileById = new Map((vendorProfiles ?? []).map((row) => [String(row.id), row]));
  const vendorContactByApplicationId = new Map((vendorApplications ?? []).map((row) => [String(row.id), String(row.contact_name ?? "")]));

  return data.map((row) => {
    const profile = vendorProfileById.get(String(row.vendor_profile_id));
    const dealRow = Array.isArray((row as Record<string, unknown>).deal_records)
      ? ((row as Record<string, unknown>).deal_records as Array<Record<string, unknown>>)[0]
      : ((row as Record<string, unknown>).deal_records as Record<string, unknown> | undefined);
    return {
      id: String(row.id),
      buyerEmail: email,
      vendorCompanyId: String(row.vendor_profile_id),
      createdAt: String(row.created_at),
      status: dealRow?.status ? (String(dealRow.status) as DealStatus) : "相談中",
      lockedAt: dealRow?.status_locked_at ? String(dealRow.status_locked_at) : null,
      vendorCompanyName: profile?.company_name ? String(profile.company_name) : undefined,
      vendorContactName: profile?.application_id ? vendorContactByApplicationId.get(String(profile.application_id)) ?? undefined : undefined
    };
  });
}

export async function listThreadsForVendorByUserId(userId: string) {
  if (!isSupabaseConfigured()) {
    const company = mockDb.listCompanies().find((entry) => entry.id === userId);
    return company ? mockDb.listThreadsByVendorCompanyId(company.id) : [];
  }

  const client = serviceClient();
  if (!client) return [];

  const vendorProfile = await getVendorProfileRowByUserId(client, userId);
  if (!vendorProfile) return [];

  const { data, error } = await client
    .from("message_threads")
    .select("id, buyer_org_id, vendor_profile_id, created_at, deal_records(status, status_locked_at)")
    .eq("vendor_profile_id", vendorProfile.id)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];

  const buyerOrgIds = [...new Set(data.map((row) => String(row.buyer_org_id)))];
  const { data: buyerRows } = await client
    .from("buyer_organizations")
    .select("id, company_name, contact_name")
    .in("id", buyerOrgIds);
  const buyerRowByOrgId = new Map((buyerRows ?? []).map((row) => [String(row.id), row]));

  return data.map((row) => {
    const buyerRow = buyerRowByOrgId.get(String(row.buyer_org_id));
    const dealRow = Array.isArray((row as Record<string, unknown>).deal_records)
      ? ((row as Record<string, unknown>).deal_records as Array<Record<string, unknown>>)[0]
      : ((row as Record<string, unknown>).deal_records as Record<string, unknown> | undefined);
    return {
      id: String(row.id),
      buyerEmail: buyerRow?.company_name ? String(buyerRow.company_name) : "",
      vendorCompanyId: String(row.vendor_profile_id),
      createdAt: String(row.created_at),
      status: dealRow?.status ? (String(dealRow.status) as DealStatus) : "相談中",
      lockedAt: dealRow?.status_locked_at ? String(dealRow.status_locked_at) : null,
      buyerCompanyName: buyerRow?.company_name ? String(buyerRow.company_name) : undefined,
      buyerContactName: buyerRow?.contact_name ? String(buyerRow.contact_name) : undefined
    };
  });
}

export function getThreadById(threadId: string) {
  return mockDb.getThreadById(threadId);
}

export async function createThreadForBuyerByUserId(userId: string, email: string, vendorCompanyId: string) {
  if (!isSupabaseConfigured()) return mockDb.findOrCreateThread(email, vendorCompanyId);

  const client = serviceClient();
  if (!client) return mockDb.findOrCreateThread(email, vendorCompanyId);

  const [buyerOrg, vendorProfile] = await Promise.all([
    getBuyerOrgRowByUserId(client, userId),
    client.from("vendor_profiles").select("id").eq("id", vendorCompanyId).eq("active", true).maybeSingle()
  ]);

  if (!buyerOrg || !vendorProfile.data) return null;

  const existing = await client
    .from("message_threads")
    .select("id, vendor_profile_id, created_at, deal_records(status, status_locked_at)")
    .eq("buyer_org_id", buyerOrg.id)
    .eq("vendor_profile_id", vendorCompanyId)
    .order("last_message_at", { ascending: false });

  const reusableThread = (existing.data ?? []).find((thread) => {
    const dealRow = Array.isArray(thread.deal_records) ? thread.deal_records[0] : thread.deal_records;
    const status = dealRow?.status ? String(dealRow.status) : null;
    const lockedAt = dealRow?.status_locked_at ? String(dealRow.status_locked_at) : null;
    return status !== "完了" || !lockedAt;
  });

  if (reusableThread) {
    return {
      id: String(reusableThread.id),
      buyerEmail: email,
      vendorCompanyId: String(reusableThread.vendor_profile_id),
      createdAt: String(reusableThread.created_at),
      status: "相談中",
      lockedAt: null
    };
  }

  const { data, error } = await client
    .from("message_threads")
    .insert({
      buyer_org_id: buyerOrg.id,
      vendor_profile_id: vendorCompanyId,
      created_by: userId
    })
    .select("id, vendor_profile_id, created_at")
    .single();

  if (error || !data) return null;

  await client.from("deal_records").upsert({
    thread_id: data.id,
    status: "相談中",
    updated_by_role: "buyer"
  });

  return {
    id: String(data.id),
    buyerEmail: email,
    vendorCompanyId: String(data.vendor_profile_id),
    createdAt: String(data.created_at),
    status: "相談中",
    lockedAt: null
  };
}

export async function getBuyerOwnedThreadByUserId(threadId: string, userId: string, email: string) {
  if (!isSupabaseConfigured()) {
    const thread = mockDb.getThreadById(threadId);
    return thread && thread.buyerEmail === email ? thread : null;
  }

  const client = serviceClient();
  if (!client) return null;
  const row = await getBuyerOwnedThreadRow(client, threadId, userId);
  if (!row) return null;
  return {
    id: String(row.id),
    buyerEmail: email,
    vendorCompanyId: String(row.vendor_profile_id),
    createdAt: String(row.created_at)
  };
}

export async function getVendorOwnedThreadByUserId(threadId: string, userId: string) {
  if (!isSupabaseConfigured()) return mockDb.getThreadById(threadId);

  const client = serviceClient();
  if (!client) return null;
  const row = await getVendorOwnedThreadRow(client, threadId, userId);
  if (!row) return null;

  const vendorProfile = await getVendorProfileRowByUserId(client, userId);
  if (!vendorProfile) return null;

  return {
    id: String(row.id),
    buyerEmail: "",
    vendorCompanyId: String(vendorProfile.id),
    createdAt: String(row.created_at)
  };
}

export async function deleteBuyerThreadByUserId(threadId: string, userId: string, email: string) {
  if (!isSupabaseConfigured()) {
    const thread = mockDb.getThreadById(threadId);
    if (!thread || thread.buyerEmail !== email) return false;
    return mockDb.deleteThread(threadId);
  }

  const client = serviceClient();
  if (!client) return false;
  const row = await getBuyerOwnedThreadRow(client, threadId, userId);
  if (!row) return false;

  const { error } = await client.from("message_threads").delete().eq("id", threadId);
  return !error;
}

export async function deleteVendorThreadByUserId(threadId: string, userId: string) {
  if (!isSupabaseConfigured()) {
    const thread = mockDb.getThreadById(threadId);
    return Boolean(thread && mockDb.deleteThread(threadId));
  }

  const client = serviceClient();
  if (!client) return false;
  const row = await getVendorOwnedThreadRow(client, threadId, userId);
  if (!row) return false;

  const { error } = await client.from("message_threads").delete().eq("id", threadId);
  return !error;
}

export async function listMessagesByThread(threadId: string) {
  if (!isSupabaseConfigured()) return mockDb.listMessages(threadId);

  const client = serviceClient();
  if (!client) return mockDb.listMessages(threadId);
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => toMessageRecord(row as Record<string, unknown>));
}

export async function addMessageToThread(threadId: string, sender: "buyer" | "vendor", body: string, senderUserId?: string) {
  if (!isSupabaseConfigured() || !senderUserId) return mockDb.addMessage(threadId, sender, body);

  const client = serviceClient();
  if (!client) return mockDb.addMessage(threadId, sender, body);

  const { data: thread } = await client
    .from("message_threads")
    .select("vendor_profile_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return null;

  const { data: vendorProfile } = await client
    .from("vendor_profiles")
    .select("plan_key, preferred_language, country")
    .eq("id", thread.vendor_profile_id)
    .maybeSingle();

  const companyLanguage = (vendorProfile?.preferred_language as Company["preferredLanguage"]) ?? companyLanguageFromCountry(vendorProfile?.country ? String(vendorProfile.country) : undefined);
  const translationEnabled = (vendorProfile?.plan_key ?? "basic") === "translation";
  const originalLanguage = sender === "buyer" ? "ja" : companyLanguage;

  const payload = {
    thread_id: threadId,
    sender_user_id: senderUserId,
    sender_role: sender,
    message_type: "text",
    body,
    original_language: originalLanguage,
    translated_body_ja: translationEnabled ? (originalLanguage === "ja" ? body : makeTranslatedText(body, "ja")) : null,
    translated_body_en: translationEnabled ? (originalLanguage === "en" ? body : makeTranslatedText(body, "en")) : null,
    translated_body_company: translationEnabled ? (originalLanguage === companyLanguage ? body : makeTranslatedText(body, String(companyLanguage))) : null
  };

  const { data, error } = await client.from("messages").insert(payload).select("*").single();
  if (error || !data) return null;

  await client.from("message_reads").upsert({
    thread_id: threadId,
    user_id: senderUserId,
    last_read_at: new Date().toISOString()
  });

  return toMessageRecord(data as Record<string, unknown>);
}

async function addSystemMessageToThread(threadId: string, sender: "buyer" | "vendor", body: string, senderUserId: string) {
  if (!isSupabaseConfigured()) return mockDb.addMessage(threadId, sender, body);

  const client = serviceClient();
  if (!client) return mockDb.addMessage(threadId, sender, body);

  const payload = {
    thread_id: threadId,
    sender_user_id: senderUserId,
    sender_role: sender,
    message_type: "system",
    body,
    original_language: "ja",
    translated_body_ja: body,
    translated_body_en: null,
    translated_body_company: null
  };

  const { data, error } = await client.from("messages").insert(payload).select("*").single();
  if (error || !data) return null;
  return toMessageRecord(data as Record<string, unknown>);
}

async function ensureDealRecordRow(client: SupabaseClient, threadId: string) {
  const { data: existing } = await client
    .from("deal_records")
    .select("*")
    .eq("thread_id", threadId)
    .maybeSingle();

  if (existing) return existing;

  const { data } = await client
    .from("deal_records")
    .insert({
      thread_id: threadId,
      status: "相談中",
      updated_by_role: "buyer"
    })
    .select("*")
    .single();

  return data ?? null;
}

export async function getDealByThread(threadId: string) {
  if (!isSupabaseConfigured()) return mockDb.getDeal(threadId);

  const client = serviceClient();
  if (!client) return mockDb.getDeal(threadId);
  const { data, error } = await client
    .from("deal_records")
    .select("*")
    .eq("thread_id", threadId)
    .maybeSingle();

  if (error || !data) return null;
  return toDealRecord(data as Record<string, unknown>);
}

export async function updateDealByThread(threadId: string, input: { status: DealStatus; updatedBy: "buyer" | "vendor"; title?: string }) {
  if (!isSupabaseConfigured()) return mockDb.upsertDeal(threadId, input);

  const client = serviceClient();
  if (!client) return mockDb.upsertDeal(threadId, input);
  const { data, error } = await client
    .from("deal_records")
    .upsert({
      thread_id: threadId,
      title: input.title ?? null,
      status: input.status,
      updated_at: new Date().toISOString(),
      updated_by_role: input.updatedBy
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return toDealRecord(data as Record<string, unknown>);
}

export async function proposeDealStatusChange(
  threadId: string,
  input: { status: DealStatus; updatedBy: "buyer" | "vendor"; title?: string; senderUserId: string }
) {
  if (!isSupabaseConfigured()) return { deal: mockDb.upsertDeal(threadId, { status: input.status, updatedBy: input.updatedBy, title: input.title }) };

  const client = serviceClient();
  if (!client) return { deal: mockDb.upsertDeal(threadId, { status: input.status, updatedBy: input.updatedBy, title: input.title }) };

  const currentRow = await ensureDealRecordRow(client, threadId);
  if (!currentRow) return { error: "案件ステータスを読み込めませんでした。" as const };
  const current = toDealRecord(currentRow as Record<string, unknown>);

  if (current.proposedStatus) {
    return { error: "既に確認待ちのステータス変更があります。" as const };
  }
  if (!canTransitionDealStatus(current.status, input.status, current.lockedAt)) {
    return { error: current.status === "完了" ? "完了した案件は変更できません。" as const : "このステータス変更はできません。" as const };
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("deal_records")
    .update({
      title: input.title ?? current.title ?? null,
      proposed_status: input.status,
      proposed_by_role: input.updatedBy,
      proposal_created_at: now,
      updated_at: now,
      updated_by_role: input.updatedBy
    })
    .eq("thread_id", threadId)
    .select("*")
    .single();

  if (error || !data) return { error: "ステータス提案を保存できませんでした。" as const };
  await addSystemMessageToThread(threadId, input.updatedBy, statusProposalMessage(input.status, input.updatedBy), input.senderUserId);
  return { deal: toDealRecord(data as Record<string, unknown>) };
}

export async function resolveDealStatusProposal(
  threadId: string,
  input: { action: "accept" | "reject"; updatedBy: "buyer" | "vendor"; senderUserId: string }
) {
  if (!isSupabaseConfigured()) {
    const current = mockDb.getDeal(threadId);
    if (!current?.proposedStatus) return { error: "確認待ちの提案がありません。" as const };
    if (current.proposedBy === input.updatedBy) return { error: "自分の提案は承認できません。" as const };
    const next = input.action === "accept"
      ? mockDb.upsertDeal(threadId, { status: current.proposedStatus, updatedBy: input.updatedBy, title: current.title })
      : {
          ...current,
          updatedAt: new Date().toISOString(),
          updatedBy: input.updatedBy,
          proposedStatus: null,
          proposedBy: null,
          proposalCreatedAt: null
        };
    return { deal: next };
  }

  const client = serviceClient();
  if (!client) return { error: "案件ステータスを更新できませんでした。" as const };

  const currentRow = await ensureDealRecordRow(client, threadId);
  if (!currentRow) return { error: "案件ステータスを読み込めませんでした。" as const };
  const current = toDealRecord(currentRow as Record<string, unknown>);

  if (!current.proposedStatus || !current.proposedBy) {
    return { error: "確認待ちのステータス変更がありません。" as const };
  }
  if (current.proposedBy === input.updatedBy) {
    return { error: "自分の提案は承認できません。" as const };
  }

  const now = new Date().toISOString();
  const accepted = input.action === "accept";
  const nextStatus = accepted ? current.proposedStatus : current.status;
  const { data, error } = await client
    .from("deal_records")
    .update({
      status: nextStatus,
      updated_at: now,
      updated_by_role: input.updatedBy,
      proposed_status: null,
      proposed_by_role: null,
      proposal_created_at: null,
      status_locked_at: accepted && current.proposedStatus === "完了" ? now : current.lockedAt ?? null
    })
    .eq("thread_id", threadId)
    .select("*")
    .single();

  if (error || !data) return { error: "ステータス提案を更新できませんでした。" as const };

  if (accepted) {
    await addSystemMessageToThread(threadId, input.updatedBy, statusAcceptedMessage(current.proposedStatus, input.updatedBy), input.senderUserId);
  } else {
    await addSystemMessageToThread(threadId, input.updatedBy, statusRejectedMessage(input.updatedBy), input.senderUserId);
  }

  return { deal: toDealRecord(data as Record<string, unknown>) };
}
