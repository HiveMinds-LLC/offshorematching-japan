"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Building2, ChevronDown, ChevronRight, FolderKanban, Languages, MessageSquareMore, Pencil, Sparkles, Star, Trash2, Users, Wallet } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { Textarea } from "@/components/ui/textarea";
import { SEED_PROJECT_HISTORY } from "@/lib/data/mockData";
import { PROJECT_FILTER_OPTIONS, TECH_FILTER_OPTIONS } from "@/lib/domain/service-catalog";
import type { BuyerCriteria, BuyerOrganization, Company, DealRecord, DealStatus, MatchResult, MessageRecord, PortfolioProject, ProjectHistoryRecord, VendorApplication, VendorBillingAccount, VendorPreferredLanguage } from "@/lib/domain/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MATCHING_PROJECT_TYPE_OPTIONS, emptyBuyerCriteria, inferBuyerCriteriaFromIntake, parseBudgetAnswer, parseDurationAnswer, parseProjectTypeAnswer, runTierAwareMatch } from "@/lib/matching";

type SessionRole = "guest" | "buyer" | "vendor";
type AppSectionKey =
  | "marketplace"
  | "auth"
  | "buyer-overview"
  | "buyer-matching"
  | "buyer-saved"
  | "buyer-messages"
  | "buyer-projects"
  | "vendor-overview"
  | "vendor-profile"
  | "vendor-messages"
  | "vendor-projects"
  | "vendor-history"
  | "vendor-billing";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

type SupabaseSessionPayload = {
  accessToken: string;
  refreshToken: string;
};

type BuyerThread = {
  id: string;
  buyerEmail: string;
  vendorCompanyId: string;
  createdAt: string;
  status?: DealStatus;
  lockedAt?: string | null;
  buyerCompanyName?: string;
  buyerContactName?: string;
  vendorCompanyName?: string;
  vendorContactName?: string;
  unreadCount?: number;
  notificationKind?: "new-chat" | "proposal-received" | "proposal-accepted" | null;
};

type ThreadOverview = {
  threadId: string;
  counterpartyLabel: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  status: DealStatus;
  proposedStatus?: DealStatus | null;
  proposedBy?: "buyer" | "vendor" | null;
  lockedAt?: string | null;
  unreadCount?: number;
  notificationKind?: "new-chat" | "proposal-received" | "proposal-accepted" | null;
};

const dealStatusOptions: DealStatus[] = ["相談中", "進行中", "完了"];

const MARKETPLACE_PAGE_SIZE = 9;

type MatchingStepKey = "projectGoal" | "projectTypes" | "budget" | "duration";
type MatchingAnswers = Partial<Record<MatchingStepKey, string>>;
const MATCHING_SESSION_STORAGE_KEY = "offshoredevelopment.matching-session.v1";

const EMPTY_VENDOR_PROFILE_FORM = {
  name: "",
  country: "",
  contactName: "",
  contactEmail: "",
  plan: "basic" as Company["plan"],
  websiteUrl: "",
  publicContactEmail: "",
  publicContactPhone: "",
  preferredLanguage: "en" as VendorPreferredLanguage,
  summary: "",
  summaryJa: "",
  servicesCsv: "",
  minRate: "20",
  maxRate: "40",
  teamSize: "10",
  english: "basic" as Company["english"],
  japaneseSupport: "basic" as Company["japaneseSupport"],
  portfolioProjects: [] as PortfolioProject[]
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function levelLabel(value: Company["english"]) {
  if (value === "native") return "ネイティブ";
  if (value === "high") return "上級";
  if (value === "medium") return "中級";
  return "初級";
}

function levelLabelForLocale(value: Company["english"], locale: "ja" | "en") {
  if (locale === "ja") return levelLabel(value);
  if (value === "native") return "Native";
  if (value === "high") return "Advanced";
  if (value === "medium") return "Intermediate";
  return "Beginner";
}

function dealStatusLabel(status: DealStatus, locale: "ja" | "en") {
  if (locale === "ja") return status;
  if (status === "相談中") return "Consulting";
  if (status === "進行中") return "In Progress";
  return "Completed";
}

function dealPartyLabel(role: "buyer" | "vendor", locale: "ja" | "en") {
  if (locale === "ja") return role === "buyer" ? "発注企業" : "開発会社";
  return role === "buyer" ? "Buyer" : "Vendor";
}

function nextDealProposalOptions(status: DealStatus) {
  if (status === "相談中") return ["進行中"] satisfies DealStatus[];
  if (status === "進行中") return ["相談中", "完了"] satisfies DealStatus[];
  return [] satisfies DealStatus[];
}

function planLabel(plan: Company["plan"]) {
  return plan === "translation" ? "翻訳付き" : "ベーシック";
}

function monthlyPriceLabel(plan: Company["plan"]) {
  return plan === "translation" ? "¥10,000/月" : "¥5,000/月";
}

function normalizePlan(plan: Company["plan"] | VendorBillingAccount["plan"] | undefined | null): Company["plan"] {
  return plan === "translation" ? "translation" : "basic";
}

function isPrimaryActionSection(key: AppSectionKey) {
  return key === "buyer-matching";
}

function languageLabel(language: VendorPreferredLanguage | undefined, locale: "ja" | "en" = "ja") {
  switch (language) {
    case "ja": return locale === "ja" ? "日本語" : "Japanese";
    case "vi": return locale === "ja" ? "ベトナム語" : "Vietnamese";
    case "id": return locale === "ja" ? "インドネシア語" : "Indonesian";
    case "th": return locale === "ja" ? "タイ語" : "Thai";
    case "pl": return locale === "ja" ? "ポーランド語" : "Polish";
    case "ro": return locale === "ja" ? "ルーマニア語" : "Romanian";
    case "ko": return locale === "ja" ? "韓国語" : "Korean";
    case "hi": return locale === "ja" ? "ヒンディー語" : "Hindi";
    case "uk": return locale === "ja" ? "ウクライナ語" : "Ukrainian";
    case "et": return locale === "ja" ? "エストニア語" : "Estonian";
    case "es": return locale === "ja" ? "スペイン語" : "Spanish";
    case "ms": return locale === "ja" ? "マレー語" : "Malay";
    case "tl": return locale === "ja" ? "タガログ語" : "Tagalog";
    case "en":
    default:
      return locale === "ja" ? "英語" : "English";
  }
}

const COUNTRY_LABELS: Record<string, { ja: string; en: string }> = {
  germany: { ja: "ドイツ", en: "Germany" },
  japan: { ja: "日本", en: "Japan" },
  vietnam: { ja: "ベトナム", en: "Vietnam" },
  indonesia: { ja: "インドネシア", en: "Indonesia" },
  thailand: { ja: "タイ", en: "Thailand" },
  poland: { ja: "ポーランド", en: "Poland" },
  romania: { ja: "ルーマニア", en: "Romania" },
  "south korea": { ja: "韓国", en: "South Korea" },
  korea: { ja: "韓国", en: "Korea" },
  india: { ja: "インド", en: "India" },
  ukraine: { ja: "ウクライナ", en: "Ukraine" },
  estonia: { ja: "エストニア", en: "Estonia" },
  spain: { ja: "スペイン", en: "Spain" },
  malaysia: { ja: "マレーシア", en: "Malaysia" },
  philippines: { ja: "フィリピン", en: "Philippines" },
  "united states": { ja: "アメリカ", en: "United States" },
  usa: { ja: "アメリカ", en: "USA" },
  singapore: { ja: "シンガポール", en: "Singapore" },
  taiwan: { ja: "台湾", en: "Taiwan" },
  china: { ja: "中国", en: "China" },
  france: { ja: "フランス", en: "France" },
  "united kingdom": { ja: "イギリス", en: "United Kingdom" },
  uk: { ja: "イギリス", en: "UK" },
  canada: { ja: "カナダ", en: "Canada" },
  australia: { ja: "オーストラリア", en: "Australia" }
};

function countryLabel(country: string | undefined, locale: "ja" | "en") {
  const trimmed = country?.trim() ?? "";
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  const mapped = COUNTRY_LABELS[normalized];
  if (mapped) return locale === "ja" ? mapped.ja : mapped.en;
  return trimmed;
}

function projectTypeLabel(projectType: PortfolioProject["projectType"], locale: "ja" | "en") {
  if (locale === "ja") return projectType;
  switch (projectType) {
    case "Webサービス": return "Web Service";
    case "EC / マーケットプレイス": return "E-commerce / Marketplace";
    case "社内システム / 業務改善": return "Internal System / Ops Improvement";
    case "モバイルアプリ": return "Mobile App";
    case "SaaS / 業務ツール": return "SaaS / Business Tool";
    case "ERP / 基幹連携": return "ERP / Core Integration";
    case "AI / データ活用": return "AI / Data";
    case "VR / AR / 3D": return "VR / AR / 3D";
    case "保守 / 運用改善": return "Maintenance / Operations";
    default: return projectType;
  }
}

function buildVendorProfileForm(company: Company | null, application: VendorApplication | null) {
  if (!company) return EMPTY_VENDOR_PROFILE_FORM;
  return {
    name: company.name,
    country: company.country,
    contactName: application?.contactName ?? company.contactName ?? "",
    contactEmail: application?.contactEmail ?? company.publicContactEmail ?? "",
    plan: company.plan,
    websiteUrl: company.websiteUrl ?? "",
    publicContactEmail: company.publicContactEmail ?? "",
    publicContactPhone: company.publicContactPhone ?? "",
    preferredLanguage: company.preferredLanguage ?? "en",
    summary: company.summary,
    summaryJa: company.summaryJa ?? "",
    servicesCsv: company.services.join(", "),
    minRate: String(company.minRate),
    maxRate: String(company.maxRate),
    teamSize: String(company.teamSize),
    english: company.english,
    japaneseSupport: company.japaneseSupport,
    portfolioProjects: company.portfolioProjects
  };
}

function isVendorProfileReadyForPublishing(company: Company | null) {
  if (!company) return false;
  return Boolean(
    company.name.trim() &&
    company.country.trim() &&
    company.contactName?.trim() &&
    company.summary.trim() &&
    company.services.length > 0 &&
    company.minRate > 0 &&
    company.maxRate >= company.minRate &&
    company.teamSize > 0
  );
}

function normalizeExternalUrl(url?: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatYenRateRange(minRate: number, maxRate: number, locale: "ja" | "en") {
  const min = `¥${minRate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  const max = `¥${maxRate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}`;
  return `${min}-${max}/${locale === "ja" ? "時" : "hr"}`;
}

function companySummaryForLocale(company: Company, locale: "ja" | "en") {
  return locale === "ja" ? company.summaryJa?.trim() || company.summary : company.summary;
}

function portfolioTitleForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? project.titleJa?.trim() || project.title : project.title;
}

function portfolioSummaryForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? project.summaryJa?.trim() || project.summary : project.summary;
}

function portfolioDurationForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? project.durationLabelJa?.trim() || project.durationLabel : project.durationLabel;
}

function portfolioBudgetForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? project.budgetLabelJa?.trim() || project.budgetLabel : project.budgetLabel;
}

function portfolioImpactForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? project.businessImpactJa?.trim() || project.businessImpact : project.businessImpact;
}

function portfolioTechnologiesForLocale(project: PortfolioProject, locale: "ja" | "en") {
  return locale === "ja" ? (project.technologiesJa?.length ? project.technologiesJa : project.technologies) : project.technologies;
}

function counterpartyDisplay(companyName?: string, contactName?: string) {
  if (companyName && contactName) return `${companyName} - ${contactName}`;
  return companyName || contactName || "";
}

function InlineLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center gap-3 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <span>{label}</span>
    </div>
  );
}

function threadStatusGroupLabel(status: DealStatus, locale: "ja" | "en") {
  if (locale === "ja") return status;
  if (status === "相談中") return "Consulting";
  if (status === "進行中") return "In Progress";
  return "Completed";
}

function threadStatusGroupStyle(status: DealStatus) {
  if (status === "相談中") {
    return {
      header: "bg-amber-50 text-amber-900 border-amber-200",
      badge: "bg-amber-100 text-amber-800",
      selected: "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
    };
  }
  if (status === "進行中") {
    return {
      header: "bg-blue-50 text-blue-900 border-blue-200",
      badge: "bg-blue-100 text-blue-800",
      selected: "bg-blue-100 text-blue-900 ring-1 ring-blue-200"
    };
  }
  return {
    header: "bg-emerald-50 text-emerald-900 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    selected: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
  };
}

function threadNotificationLabel(kind: BuyerThread["notificationKind"], locale: "ja" | "en", viewerRole: "buyer" | "vendor") {
  if (kind === "new-chat") {
    return locale === "ja" ? "新規チャット" : "New Chat";
  }
  if (kind === "proposal-received") {
    return locale === "ja"
      ? "進行提案あり"
      : (viewerRole === "buyer" ? "Vendor Proposed" : "Buyer Proposed");
  }
  if (kind === "proposal-accepted") {
    return locale === "ja"
      ? "提案承認"
      : (viewerRole === "buyer" ? "Vendor Accepted" : "Buyer Accepted");
  }
  return "";
}

function threadNotificationTone(kind: BuyerThread["notificationKind"]) {
  if (kind === "proposal-received") return "border-amber-200 bg-amber-50 text-amber-800";
  if (kind === "proposal-accepted") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (kind === "new-chat") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function matchingLabel(locale: "ja" | "en") {
  return locale === "ja" ? "案件マッチング" : "Project Matching";
}

function originalLabel(locale: "ja" | "en") {
  return locale === "ja" ? "原文" : "Original";
}

function isSubmitEnter(event: { key: string; shiftKey: boolean; ctrlKey?: boolean; metaKey?: boolean; nativeEvent?: { isComposing?: boolean } }) {
  return event.key === "Enter" && (Boolean(event.ctrlKey) || Boolean(event.metaKey)) && !event.nativeEvent?.isComposing;
}

function autosizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function emptyPortfolioProject(): PortfolioProject {
  return {
    id: makeId("portfolio"),
    title: "",
    titleJa: "",
    projectType: "Webサービス",
    summary: "",
    summaryJa: "",
    durationLabel: "",
    durationLabelJa: "",
    budgetLabel: "",
    budgetLabelJa: "",
    technologies: [],
    technologiesJa: [],
    businessImpact: ""
    ,
    businessImpactJa: ""
  };
}

function PortfolioProjectSummaryCard({ project }: { project: PortfolioProject }) {
  const { locale } = useLocale();
  return (
    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{portfolioTitleForLocale(project, locale)}</p>
        <Badge>{projectTypeLabel(project.projectType, locale)}</Badge>
      </div>
      <p className="text-sm leading-6 text-slate-700">{portfolioSummaryForLocale(project, locale)}</p>
      <div className="grid gap-1 text-xs text-slate-600">
        <p>{locale === "ja" ? "期間" : "Timeline"}: <span className="font-semibold text-slate-900">{portfolioDurationForLocale(project, locale)}</span></p>
        <p>{locale === "ja" ? "予算目安" : "Budget"}: <span className="font-semibold text-slate-900">{portfolioBudgetForLocale(project, locale)}</span></p>
        <p>{locale === "ja" ? "成果" : "Impact"}: <span className="font-semibold text-slate-900">{portfolioImpactForLocale(project, locale)}</span></p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {portfolioTechnologiesForLocale(project, locale).map((tech) => (
          <Badge key={`${project.id}-${tech}`}>{tech}</Badge>
        ))}
      </div>
    </Card>
  );
}

function CompanyCard({ company, score, locale = "ja" }: { company: Company; score?: number; locale?: "ja" | "en" }) {
  const primaryProjectType = company.portfolioProjects[0]?.projectType;

  return (
    <Link href={`/companies/${company.id}`} className="block h-full transition hover:-translate-y-0.5">
      <Card className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900">{company.name}</h4>
            <p className={`mt-0.5 text-xs font-semibold ${company.plan === "translation" ? "text-emerald-700" : "text-blue-700"}`}>{locale === "ja" ? "掲載プラン" : "Plan"}: {locale === "ja" ? planLabel(company.plan) : company.plan === "translation" ? "Translation" : "Basic"}（{monthlyPriceLabel(company.plan)}）</p>
          </div>
        </div>

        <p className="min-h-[96px] line-clamp-4 text-sm leading-6 text-slate-700">{companySummaryForLocale(company, locale)}</p>

        <div className="flex min-h-[64px] flex-wrap content-start gap-1.5">
          {company.services.slice(0, 4).map((service) => (
            <Badge key={service}>{service}</Badge>
          ))}
        </div>

        {primaryProjectType ? <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "主な実績" : "Primary Work"}: <span className="text-slate-900">{primaryProjectType}</span></p> : null}

        <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-slate-500" />
            {locale === "ja" ? "単価目安" : "Rate range"}: <span className="font-semibold text-slate-900">{formatYenRateRange(company.minRate, company.maxRate, locale)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {countryLabel(company.country, locale)} | {company.teamSize}{locale === "ja" ? "名体制" : locale === "en" ? " team members" : ""}
          </p>
          <p className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            {locale === "ja" ? "英語" : "English"} {levelLabelForLocale(company.english, locale)} / {locale === "ja" ? "日本語" : "Japanese"} {levelLabelForLocale(company.japaneseSupport, locale)}
          </p>
          <p className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            {locale === "ja" ? "会社言語" : "Company language"}: <span className="font-semibold text-slate-900">{languageLabel(company.preferredLanguage, locale)}</span>
          </p>
        </div>

        <div className="mt-auto grid gap-1">
          <p className="text-xs font-semibold text-blue-700 underline underline-offset-2">{locale === "ja" ? "会社プロフィールを見る" : "View company profile"}</p>
          {typeof score === "number" ? <p className="text-xs font-semibold text-emerald-700">{locale === "ja" ? "マッチスコア" : "Match score"}: {score.toFixed(1)}</p> : null}
        </div>
      </Card>
    </Link>
  );
}

export function OffshoreMatchApp({
  initialCompanies = [],
  initialMarketplaceStats = {
    listedVendorCount: 0,
    activeMatchCount: 0,
    completedJobCount: 0
  },
  initialBuyer = null,
  initialVendorCompany = null,
  initialVendorApplication = null,
  initialVendorBilling = null,
  initialAdminEmail = null,
  initialRole = "guest",
  initialSection = null,
  initialThreadId = "",
  initialFavoriteCompanyIds = []
}: {
  initialCompanies?: Company[];
  initialMarketplaceStats?: {
    listedVendorCount: number;
    activeMatchCount: number;
    completedJobCount: number;
  };
  initialBuyer?: BuyerOrganization | null;
  initialVendorCompany?: Company | null;
  initialVendorApplication?: VendorApplication | null;
  initialVendorBilling?: VendorBillingAccount | null;
  initialAdminEmail?: string | null;
  initialRole?: "guest" | "buyer" | "vendor" | "admin";
  initialSection?:
    | "marketplace"
    | "auth"
    | "buyer-overview"
    | "buyer-matching"
    | "buyer-saved"
    | "buyer-messages"
    | "buyer-projects"
    | "vendor-overview"
    | "vendor-profile"
    | "vendor-messages"
    | "vendor-projects"
    | "vendor-history"
    | "vendor-billing"
    | null;
  initialThreadId?: string;
  initialFavoriteCompanyIds?: string[];
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<AppSectionKey>(initialSection ?? "marketplace");
  const [sessionRole, setSessionRole] = useState<SessionRole>(initialRole === "buyer" ? "buyer" : initialRole === "vendor" ? "vendor" : "guest");
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [marketplaceStats, setMarketplaceStats] = useState(initialMarketplaceStats);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [adminEmail, setAdminEmail] = useState<string | null>(initialAdminEmail);

  const [query, setQuery] = useState("");
  const [techFilter, setTechFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [rateCap, setRateCap] = useState("");
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [favoriteCompanyIds, setFavoriteCompanyIds] = useState<string[]>(initialFavoriteCompanyIds);
  const [favoriteMutationLoading, setFavoriteMutationLoading] = useState(false);

  const [vendorLogoutLoading, setVendorLogoutLoading] = useState(false);
  const [activeVendorCompany, setActiveVendorCompany] = useState<Company | null>(initialVendorCompany);
  const [currentVendorApplication, setCurrentVendorApplication] = useState<VendorApplication | null>(initialVendorApplication);
  const [vendorProfileForm, setVendorProfileForm] = useState(EMPTY_VENDOR_PROFILE_FORM);
  const [vendorProfileEditing, setVendorProfileEditing] = useState(false);
  const [vendorProfileMessage, setVendorProfileMessage] = useState("");
  const [vendorProfileSaving, setVendorProfileSaving] = useState(false);
  const [editingPortfolioProjectId, setEditingPortfolioProjectId] = useState("");
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioProject | null>(null);
  const [portfolioTechnologiesInput, setPortfolioTechnologiesInput] = useState("");
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioDeletingId, setPortfolioDeletingId] = useState("");
  const [portfolioTranslationLoading, setPortfolioTranslationLoading] = useState(false);
  const [portfolioTranslationPreview, setPortfolioTranslationPreview] = useState<PortfolioProject | null>(null);
  const [portfolioTranslationPreviewOpen, setPortfolioTranslationPreviewOpen] = useState(false);
  const [vendorApplicationSubmitLoading, setVendorApplicationSubmitLoading] = useState(false);
  const [profileTranslationMessage, setProfileTranslationMessage] = useState("");
  const [profileTranslationLoading, setProfileTranslationLoading] = useState(false);
  const [profileTranslationPreview, setProfileTranslationPreview] = useState("");
  const [profileTranslationPreviewOpen, setProfileTranslationPreviewOpen] = useState(false);
  const [vendorBilling, setVendorBilling] = useState<VendorBillingAccount | null>(initialVendorBilling);
  const [vendorBillingMessage, setVendorBillingMessage] = useState("");
  const [billingActionLoading, setBillingActionLoading] = useState("");
  const [restartPlanSelection, setRestartPlanSelection] = useState<Company["plan"]>(initialVendorBilling?.plan === "translation" || initialVendorCompany?.plan === "translation" ? "translation" : "basic");
  const [billingCancelConfirmOpen, setBillingCancelConfirmOpen] = useState(false);
  const [billingDowngradeConfirmOpen, setBillingDowngradeConfirmOpen] = useState(false);
  const [pendingBuyerCompletionProposal, setPendingBuyerCompletionProposal] = useState(false);
  const [pendingVendorCompletionProposal, setPendingVendorCompletionProposal] = useState(false);
  const [pendingBuyerThreadDeletionId, setPendingBuyerThreadDeletionId] = useState("");
  const [pendingVendorThreadDeletionId, setPendingVendorThreadDeletionId] = useState("");

  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionHydrating, setSessionHydrating] = useState(true);
  const [adminLogoutLoading, setAdminLogoutLoading] = useState(false);
  const [buyerLogoutLoading, setBuyerLogoutLoading] = useState(false);
  const [activeBuyer, setActiveBuyer] = useState<BuyerOrganization | null>(initialBuyer);
  const [threads, setThreads] = useState<BuyerThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(initialThreadId);
  const [preferredBuyerThreadId, setPreferredBuyerThreadId] = useState(initialThreadId);
  const [threadMessages, setThreadMessages] = useState<MessageRecord[]>([]);
  const [pendingThreadMessages, setPendingThreadMessages] = useState<MessageRecord[]>([]);
  const [threadMessagesLoading, setThreadMessagesLoading] = useState(false);
  const [activeBuyerDeal, setActiveBuyerDeal] = useState<DealRecord | null>(null);
  const [buyerThreadOverview, setBuyerThreadOverview] = useState<ThreadOverview[]>([]);
  const [buyerThreadOverviewLoading, setBuyerThreadOverviewLoading] = useState(false);
  const [threadInput, setThreadInput] = useState("");
  const [threadMessageInfo, setThreadMessageInfo] = useState("");
  const [threadSending, setThreadSending] = useState(false);
  const [threadDeleting, setThreadDeleting] = useState(false);
  const [threadStartingVendorId, setThreadStartingVendorId] = useState("");
  const [collapsedBuyerThreadGroups, setCollapsedBuyerThreadGroups] = useState<Record<DealStatus, boolean>>({
    "相談中": false,
    "進行中": false,
    "完了": true
  });
  const [vendorThreads, setVendorThreads] = useState<BuyerThread[]>([]);
  const [vendorThreadsLoading, setVendorThreadsLoading] = useState(false);
  const [activeVendorThreadId, setActiveVendorThreadId] = useState(initialThreadId);
  const [preferredVendorThreadId, setPreferredVendorThreadId] = useState(initialThreadId);
  const [vendorThreadMessages, setVendorThreadMessages] = useState<MessageRecord[]>([]);
  const [pendingVendorThreadMessages, setPendingVendorThreadMessages] = useState<MessageRecord[]>([]);
  const [vendorThreadMessagesLoading, setVendorThreadMessagesLoading] = useState(false);
  const [activeVendorDeal, setActiveVendorDeal] = useState<DealRecord | null>(null);
  const [vendorThreadOverview, setVendorThreadOverview] = useState<ThreadOverview[]>([]);
  const [vendorThreadOverviewLoading, setVendorThreadOverviewLoading] = useState(false);
  const [vendorThreadInput, setVendorThreadInput] = useState("");
  const [vendorThreadMessageInfo, setVendorThreadMessageInfo] = useState("");
  const [vendorThreadSending, setVendorThreadSending] = useState(false);
  const [vendorThreadDeleting, setVendorThreadDeleting] = useState(false);
  const [collapsedVendorThreadGroups, setCollapsedVendorThreadGroups] = useState<Record<DealStatus, boolean>>({
    "相談中": false,
    "進行中": false,
    "完了": true
  });
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const buyerMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const vendorMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const buyerThreadInputRef = useRef<HTMLTextAreaElement | null>(null);
  const vendorThreadInputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastBuyerAutoScrollRef = useRef<{ threadId: string; lastMessageId: string }>({ threadId: "", lastMessageId: "" });
  const lastVendorAutoScrollRef = useRef<{ threadId: string; lastMessageId: string }>({ threadId: "", lastMessageId: "" });
  const loadedBuyerThreadIdsRef = useRef<Set<string>>(new Set());
  const loadedVendorThreadIdsRef = useRef<Set<string>>(new Set());
  const vendorBillingHydratedRef = useRef(Boolean(initialVendorBilling));

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    createInitialMatchingAssistantMessage(locale)
  ]);
  const [criteria, setCriteria] = useState<BuyerCriteria | null>(null);
  const [matchingDraftCriteria, setMatchingDraftCriteria] = useState<BuyerCriteria>(emptyBuyerCriteria());
  const [matchingAnswers, setMatchingAnswers] = useState<MatchingAnswers>({});
  const [matchingProjectGoal, setMatchingProjectGoal] = useState("");
  const [matchingStepIndex, setMatchingStepIndex] = useState(0);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingSessionReady, setMatchingSessionReady] = useState(false);
  const [browserSupabaseReady, setBrowserSupabaseReady] = useState(false);
  const buyerMessagingVisible = activeSection === "buyer-messages" || activeSection === "buyer-overview";
  const vendorMessagingVisible = activeSection === "vendor-messages" || activeSection === "vendor-overview";
  const billingReturnFlag = searchParams.get("billing_return");
  const activeVendorBillingCompanyId = vendorBilling?.companyId || activeVendorCompany?.id || "";

  useEffect(() => {
    if (!pathname) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("section", activeSection);

    const activeThreadParam =
      activeSection === "buyer-messages"
        ? activeThreadId
        : activeSection === "vendor-messages"
          ? activeVendorThreadId
          : "";

    if (activeThreadParam) {
      nextParams.set("thread", activeThreadParam);
    } else {
      nextParams.delete("thread");
    }

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [activeSection, activeThreadId, activeVendorThreadId, pathname, router, searchParams]);

  const readJson = useCallback(async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
    const response = await fetch(input, init);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: payload.error ?? (locale === "ja" ? "リクエストに失敗しました。" : "Request failed.") };
    return { ok: true, data: payload };
  }, [locale]);

  const syncSessionContext = useCallback(async function syncSessionContext() {
    const response = await readJson<{
      role: "guest" | "buyer" | "vendor" | "admin";
      buyer?: BuyerOrganization | null;
      vendor?: Company | null;
      admin?: { email: string } | null;
      supabaseSession?: SupabaseSessionPayload | null;
    }>("/api/auth/session", { cache: "no-store" });

    if (!response.ok || !response.data) {
      return null;
    }

    if (response.data.role === "buyer" && response.data.buyer) {
      setSessionRole("buyer");
      setActiveBuyer(response.data.buyer);
      setActiveVendorCompany(null);
      setAdminEmail(null);
      return response.data;
    }

    if (response.data.role === "vendor" && response.data.vendor) {
      setSessionRole("vendor");
      setActiveVendorCompany(response.data.vendor);
      setActiveBuyer(null);
      setAdminEmail(null);
      return response.data;
    }

    if (response.data.role === "admin" && response.data.admin) {
      setSessionRole("guest");
      setAdminEmail(response.data.admin.email);
      setActiveBuyer(null);
      setActiveVendorCompany(null);
      return response.data;
    }

    setSessionRole("guest");
    setAdminEmail(null);
    setActiveBuyer(null);
    setActiveVendorCompany(null);
    return response.data;
  }, [readJson]);

  const ensureBrowserSupabaseSession = useCallback(async function ensureBrowserSupabaseSession(sessionPayload?: SupabaseSessionPayload | null) {
    if (!supabase) {
      setBrowserSupabaseReady(true);
      return false;
    }

    let nextSession = sessionPayload ?? null;
    if (!nextSession) {
      const sessionData = await syncSessionContext();
      nextSession = sessionData?.supabaseSession ?? null;
    }

    if (!nextSession) {
      await supabase.auth.signOut();
      setBrowserSupabaseReady(true);
      return false;
    }

    const { error } = await supabase.auth.setSession({
      access_token: nextSession.accessToken,
      refresh_token: nextSession.refreshToken
    });
    if (!error) {
      supabase.realtime.setAuth(nextSession.accessToken);
    }
    setBrowserSupabaseReady(true);
    return !error;
  }, [supabase, syncSessionContext]);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshCompanies = useCallback(async function refreshCompanies() {
    const response = await readJson<{
      companies: Company[];
      stats?: { listedVendorCount: number; activeMatchCount: number; completedJobCount: number };
    }>("/api/vendors/companies");
    if (!response.ok || !response.data) return;
    setCompanies(response.data.companies);
    if (response.data.stats) setMarketplaceStats(response.data.stats);
  }, [readJson]);

  const refreshSavedCompanies = useCallback(async function refreshSavedCompanies() {
    const response = await readJson<{ companyIds: string[] }>("/api/buyers/saved-companies");
    if (!response.ok || !response.data) {
      setFavoriteCompanyIds([]);
      return;
    }
    setFavoriteCompanyIds(response.data.companyIds);
  }, [readJson]);

  const refreshThreads = useCallback(async function refreshThreads(preferredThreadId?: string) {
    setThreadsLoading((prev) => prev || threads.length === 0);
    const response = await readJson<{ threads: BuyerThread[] }>("/api/messages/threads");
    const data = response.data;
    if (!response.ok || !data) {
      setThreadsLoading(false);
      return;
    }
    setThreads(data.threads);
    setActiveThreadId((current) => {
      if (preferredThreadId && data.threads.some((thread) => thread.id === preferredThreadId)) {
        return preferredThreadId;
      }
      if (preferredBuyerThreadId && data.threads.some((thread) => thread.id === preferredBuyerThreadId)) {
        return preferredBuyerThreadId;
      }
      if (current && data.threads.some((thread) => thread.id === current)) return current;
      if (initialThreadId && data.threads.some((thread) => thread.id === initialThreadId)) return initialThreadId;
      return data.threads[0]?.id || "";
    });
    setThreadsLoading(false);
  }, [initialThreadId, preferredBuyerThreadId, readJson, threads.length]);

  const refreshThreadMessages = useCallback(async function refreshThreadMessages(threadId: string, options?: { markRead?: boolean }) {
    if (!threadId) return;
    setThreadMessagesLoading((prev) => prev || !loadedBuyerThreadIdsRef.current.has(threadId));
    const response = await readJson<{ messages: MessageRecord[] }>(
      `/api/messages/threads/${threadId}/messages${options?.markRead ? "?markRead=1" : ""}`
    );
    if (!response.ok || !response.data) {
      setThreadMessagesLoading(false);
      return;
    }
    setThreadMessages(response.data.messages);
    loadedBuyerThreadIdsRef.current.add(threadId);
    setPendingThreadMessages((prev) =>
      prev.filter(
        (pending) =>
          pending.threadId !== threadId ||
          !response.data!.messages.some(
            (message) =>
              message.sender === pending.sender &&
              message.body === pending.body &&
              Math.abs(new Date(message.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 15000
          )
      )
    );
    setThreadMessagesLoading(false);
    if (options?.markRead) {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? { ...thread, unreadCount: 0, notificationKind: null }
            : thread
        )
      );
      setBuyerThreadOverview((current) =>
        current.map((thread) =>
          thread.threadId === threadId
            ? { ...thread, unreadCount: 0, notificationKind: null }
            : thread
        )
      );
      void refreshThreads(threadId);
    }
  }, [readJson, refreshThreads]);

  const refreshBuyerDeal = useCallback(async function refreshBuyerDeal(threadId: string) {
    if (!threadId) return;
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/threads/${threadId}/deal`);
    if (!response.ok || !response.data) return;
    setActiveBuyerDeal(response.data.deal);
    setBuyerThreadOverview((current) =>
      current.map((thread) =>
        thread.threadId === threadId
          ? {
              ...thread,
              status: response.data!.deal?.status ?? "相談中",
              proposedStatus: response.data!.deal?.proposedStatus ?? null,
              proposedBy: response.data!.deal?.proposedBy ?? null,
              lockedAt: response.data!.deal?.lockedAt ?? null
            }
          : thread
      )
    );
  }, [readJson]);

  const refreshVendorThreads = useCallback(async function refreshVendorThreads(preferredThreadId?: string) {
    setVendorThreadsLoading((prev) => prev || vendorThreads.length === 0);
    const response = await readJson<{ threads: BuyerThread[] }>("/api/messages/vendor/threads");
    if (!response.ok || !response.data) {
      setVendorThreadsLoading(false);
      return;
    }
    setVendorThreads(response.data.threads);
    setActiveVendorThreadId((current) => {
      if (preferredThreadId && response.data!.threads.some((thread) => thread.id === preferredThreadId)) {
        return preferredThreadId;
      }
      if (preferredVendorThreadId && response.data!.threads.some((thread) => thread.id === preferredVendorThreadId)) {
        return preferredVendorThreadId;
      }
      if (current && response.data!.threads.some((thread) => thread.id === current)) return current;
      return response.data!.threads[0]?.id || "";
    });
    setVendorThreadsLoading(false);
  }, [preferredVendorThreadId, readJson, vendorThreads.length]);

  const refreshVendorApplication = useCallback(async function refreshVendorApplication() {
    const response = await readJson<{ application: VendorApplication | null; company: Company | null }>("/api/vendors/me/application");
    if (!response.ok || !response.data) return;
    setCurrentVendorApplication(response.data.application);
    if (response.data.company) {
      setActiveVendorCompany(response.data.company);
    }
  }, [readJson]);

  const refreshVendorBilling = useCallback(async function refreshVendorBilling(vendorCompanyId: string) {
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${vendorCompanyId}`, {
      cache: "no-store"
    });
    if (!response.ok || !response.data) return;
    setVendorBilling(response.data.billingAccount);
  }, [readJson]);

  const refreshVendorThreadMessages = useCallback(async function refreshVendorThreadMessages(threadId: string, vendorCompanyId: string, options?: { markRead?: boolean }) {
    if (!threadId || !vendorCompanyId) return;
    setVendorThreadMessagesLoading((prev) => prev || !loadedVendorThreadIdsRef.current.has(threadId));
    const response = await readJson<{ messages: MessageRecord[] }>(
      `/api/messages/vendor/threads/${threadId}/messages${options?.markRead ? "?markRead=1" : ""}`
    );
    if (!response.ok || !response.data) {
      setVendorThreadMessagesLoading(false);
      return;
    }
    setVendorThreadMessages(response.data.messages);
    loadedVendorThreadIdsRef.current.add(threadId);
    setPendingVendorThreadMessages((prev) =>
      prev.filter(
        (pending) =>
          pending.threadId !== threadId ||
          !response.data!.messages.some(
            (message) =>
              message.sender === pending.sender &&
              message.body === pending.body &&
              Math.abs(new Date(message.createdAt).getTime() - new Date(pending.createdAt).getTime()) < 15000
          )
      )
    );
    setVendorThreadMessagesLoading(false);
    if (options?.markRead) {
      setVendorThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? { ...thread, unreadCount: 0, notificationKind: null }
            : thread
        )
      );
      setVendorThreadOverview((current) =>
        current.map((thread) =>
          thread.threadId === threadId
            ? { ...thread, unreadCount: 0, notificationKind: null }
            : thread
        )
      );
      void refreshVendorThreads(threadId);
    }
  }, [readJson, refreshVendorThreads]);

  const refreshVendorDeal = useCallback(async function refreshVendorDeal(threadId: string, vendorCompanyId: string) {
    if (!threadId || !vendorCompanyId) return;
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/vendor/threads/${threadId}/deal`);
    if (!response.ok || !response.data) return;
    setActiveVendorDeal(response.data.deal);
    setVendorThreadOverview((current) =>
      current.map((thread) =>
        thread.threadId === threadId
          ? {
              ...thread,
              status: response.data!.deal?.status ?? "相談中",
              proposedStatus: response.data!.deal?.proposedStatus ?? null,
              proposedBy: response.data!.deal?.proposedBy ?? null,
              lockedAt: response.data!.deal?.lockedAt ?? null
            }
          : thread
      )
    );
  }, [readJson]);

  const buildBuyerThreadOverview = useCallback(async function buildBuyerThreadOverview(nextThreads: BuyerThread[]) {
    setBuyerThreadOverviewLoading(true);
    const overviews = await Promise.all(
      nextThreads.map(async (thread) => {
        const response = await readJson<{ messages: MessageRecord[] }>(`/api/messages/threads/${thread.id}/messages`);
        const messages = response.data?.messages ?? [];
        const latest = messages[messages.length - 1];
        const dealResponse = await readJson<{ deal: DealRecord | null }>(`/api/messages/threads/${thread.id}/deal`);
        const deal = dealResponse.data?.deal ?? null;
        return {
          threadId: thread.id,
          counterpartyLabel:
            thread.vendorCompanyName ??
            companies.find((company) => company.id === thread.vendorCompanyId)?.name ??
            (locale === "ja" ? "不明な開発会社" : "Unknown Vendor"),
          lastMessage: latest?.body ?? (locale === "ja" ? "まだメッセージはありません。" : "No messages yet."),
          lastMessageAt: latest?.createdAt ?? thread.createdAt,
          messageCount: messages.length,
          status: deal?.status ?? "相談中",
          proposedStatus: deal?.proposedStatus ?? null,
          proposedBy: deal?.proposedBy ?? null,
          lockedAt: deal?.lockedAt ?? null,
          unreadCount: thread.unreadCount ?? 0,
          notificationKind: thread.notificationKind ?? null
        } satisfies ThreadOverview;
      })
    );
    setBuyerThreadOverview(overviews.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
    setBuyerThreadOverviewLoading(false);
  }, [companies, locale, readJson]);

  const buildVendorThreadOverview = useCallback(async function buildVendorThreadOverview(nextThreads: BuyerThread[], vendorCompanyId: string) {
    setVendorThreadOverviewLoading(true);
    const overviews = await Promise.all(
      nextThreads.map(async (thread) => {
        const response = await readJson<{ messages: MessageRecord[] }>(
          `/api/messages/vendor/threads/${thread.id}/messages`
        );
        const messages = response.data?.messages ?? [];
        const latest = messages[messages.length - 1];
        const dealResponse = await readJson<{ deal: DealRecord | null }>(`/api/messages/vendor/threads/${thread.id}/deal`);
        const deal = dealResponse.data?.deal ?? null;
        return {
          threadId: thread.id,
          counterpartyLabel: thread.buyerCompanyName ?? thread.buyerEmail,
          lastMessage: latest?.body ?? (locale === "ja" ? "まだメッセージはありません。" : "No messages yet."),
          lastMessageAt: latest?.createdAt ?? thread.createdAt,
          messageCount: messages.length,
          status: deal?.status ?? "相談中",
          proposedStatus: deal?.proposedStatus ?? null,
          proposedBy: deal?.proposedBy ?? null,
          lockedAt: deal?.lockedAt ?? null,
          unreadCount: thread.unreadCount ?? 0,
          notificationKind: thread.notificationKind ?? null
        } satisfies ThreadOverview;
      })
    );
    setVendorThreadOverview(overviews.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
    setVendorThreadOverviewLoading(false);
  }, [locale, readJson]);

  useEffect(() => {
    void (async () => {
      const sessionData = await syncSessionContext();
      await ensureBrowserSupabaseSession(sessionData?.supabaseSession ?? null);
      await refreshCompanies();

      if (sessionData?.role === "buyer" && sessionData.buyer) {
        await refreshThreads();
        setSessionHydrating(false);
        return;
      }

      if (sessionData?.role === "vendor" && sessionData.vendor) {
        if (initialVendorApplication) {
          setCurrentVendorApplication(initialVendorApplication);
        } else {
          await refreshVendorApplication();
        }
        await refreshVendorThreads();
        setSessionHydrating(false);
        return;
      }

      if (sessionData?.role === "admin" && sessionData.admin) {
        setSessionHydrating(false);
        return;
      }

      if (initialRole === "buyer" && initialBuyer) {
        setSessionRole("buyer");
        setActiveBuyer(initialBuyer);
        await refreshThreads();
        setSessionHydrating(false);
        return;
      }
      if (initialRole === "vendor" && initialVendorCompany) {
        setSessionRole("vendor");
        setActiveVendorCompany(initialVendorCompany);
        if (initialVendorApplication) {
          setCurrentVendorApplication(initialVendorApplication);
        } else {
          await refreshVendorApplication();
        }
        await refreshVendorThreads();
        setSessionHydrating(false);
        return;
      }
      if (initialRole === "admin" && initialAdminEmail) {
        setAdminEmail(initialAdminEmail);
        setSessionRole("guest");
        setSessionHydrating(false);
        return;
      }
      setSessionRole("guest");
      setSessionHydrating(false);
    })();
  }, [ensureBrowserSupabaseSession, initialBuyer, initialVendorApplication, initialVendorCompany, initialAdminEmail, initialRole, refreshCompanies, refreshThreads, refreshVendorApplication, refreshVendorThreads, syncSessionContext]);

  useEffect(() => {
    if (!buyerMessagingVisible || !activeThreadId) {
      setThreadMessages([]);
      setPendingThreadMessages([]);
      setThreadMessagesLoading(false);
      setActiveBuyerDeal(null);
      return;
    }
    void refreshThreadMessages(activeThreadId, { markRead: true });
    void refreshBuyerDeal(activeThreadId);
  }, [activeThreadId, buyerMessagingVisible, refreshBuyerDeal, refreshThreadMessages]);

  useEffect(() => {
    if (!vendorMessagingVisible || !activeVendorThreadId || !activeVendorCompany) {
      setVendorThreadMessages([]);
      setPendingVendorThreadMessages([]);
      setVendorThreadMessagesLoading(false);
      setActiveVendorDeal(null);
      return;
    }
    void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id, { markRead: true });
    void refreshVendorDeal(activeVendorThreadId, activeVendorCompany.id);
  }, [activeVendorThreadId, activeVendorCompany, vendorMessagingVisible, refreshVendorDeal, refreshVendorThreadMessages]);

  useEffect(() => {
    if (!activeVendorCompany) {
      setVendorBilling(null);
      return;
    }
    if (vendorBillingHydratedRef.current && vendorBilling?.companyId === activeVendorCompany.id) {
      vendorBillingHydratedRef.current = false;
      return;
    }
    void refreshVendorBilling(activeVendorCompany.id);
  }, [activeVendorCompany, vendorBilling?.companyId, refreshVendorBilling]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) return;
    if (activeSection !== "vendor-billing" && activeSection !== "vendor-overview") return;
    void refreshVendorBilling(activeVendorCompany.id);
  }, [sessionRole, activeSection, activeVendorCompany, refreshVendorBilling]);

  useEffect(() => {
    if (sessionRole !== "buyer") {
      setBuyerThreadOverview([]);
      return;
    }
    if (activeSection !== "buyer-overview" && activeSection !== "buyer-projects") return;
    void buildBuyerThreadOverview(threads);
  }, [threads, sessionRole, companies, activeSection, buildBuyerThreadOverview]);

  useEffect(() => {
    if (activeSection !== "marketplace") return;
    const interval = window.setInterval(() => {
      void refreshCompanies();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [activeSection, refreshCompanies]);

  useEffect(() => {
    if (sessionRole !== "vendor") return;
    void refreshVendorApplication();
  }, [sessionRole, refreshVendorApplication]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) {
      setVendorThreadOverview([]);
      return;
    }
    if (activeSection !== "vendor-overview" && activeSection !== "vendor-history") return;
    void buildVendorThreadOverview(vendorThreads, activeVendorCompany.id);
  }, [vendorThreads, sessionRole, activeVendorCompany, activeSection, buildVendorThreadOverview]);

  useEffect(() => {
    if (!supabase || !browserSupabaseReady || sessionRole !== "buyer" || !activeBuyer) return;
    const channel = supabase
      .channel(`buyer-thread-list-${activeBuyer.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_threads", filter: `buyer_org_id=eq.${activeBuyer.id}` },
        () => {
          void refreshThreads(activeThreadId || undefined);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_records" },
        () => {
          void refreshThreads(activeThreadId || undefined);
          if (activeThreadId) void refreshBuyerDeal(activeThreadId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, browserSupabaseReady, sessionRole, activeBuyer, activeThreadId, refreshBuyerDeal, refreshThreads]);

  useEffect(() => {
    if (!supabase || !browserSupabaseReady || sessionRole !== "buyer" || !activeBuyer || !buyerMessagingVisible) return;
    const channel = supabase
      .channel(`buyer-open-thread-${activeBuyer.id}-${activeThreadId || "none"}`)
      .on(
        "postgres_changes",
        activeThreadId
          ? { event: "*", schema: "public", table: "messages", filter: `thread_id=eq.${activeThreadId}` }
          : { event: "*", schema: "public", table: "messages", filter: "thread_id=eq.__none__" },
        () => {
          if (activeThreadId) void refreshThreadMessages(activeThreadId, { markRead: true });
        }
      )
      .on(
        "postgres_changes",
        activeThreadId
          ? { event: "*", schema: "public", table: "deal_records", filter: `thread_id=eq.${activeThreadId}` }
          : { event: "*", schema: "public", table: "deal_records", filter: "thread_id=eq.__none__" },
        () => {
          if (activeThreadId) void refreshBuyerDeal(activeThreadId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, browserSupabaseReady, sessionRole, activeBuyer, activeThreadId, buyerMessagingVisible, refreshBuyerDeal, refreshThreadMessages]);

  useEffect(() => {
    if (!supabase || !browserSupabaseReady || sessionRole !== "vendor" || !activeVendorCompany) return;
    const channel = supabase
      .channel(`vendor-thread-list-${activeVendorCompany.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_threads", filter: `vendor_profile_id=eq.${activeVendorCompany.id}` },
        () => {
          void refreshVendorThreads(activeVendorThreadId || undefined);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_records" },
        () => {
          void refreshVendorThreads(activeVendorThreadId || undefined);
          if (activeVendorThreadId) void refreshVendorDeal(activeVendorThreadId, activeVendorCompany.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, browserSupabaseReady, sessionRole, activeVendorCompany, activeVendorThreadId, refreshVendorDeal, refreshVendorThreads]);

  useEffect(() => {
    if (!supabase || !browserSupabaseReady || sessionRole !== "vendor" || !activeVendorCompany || !vendorMessagingVisible) return;
    const channel = supabase
      .channel(`vendor-open-thread-${activeVendorCompany.id}-${activeVendorThreadId || "none"}`)
      .on(
        "postgres_changes",
        activeVendorThreadId
          ? { event: "*", schema: "public", table: "messages", filter: `thread_id=eq.${activeVendorThreadId}` }
          : { event: "*", schema: "public", table: "messages", filter: "thread_id=eq.__none__" },
        () => {
          if (activeVendorThreadId) void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id, { markRead: true });
        }
      )
      .on(
        "postgres_changes",
        activeVendorThreadId
          ? { event: "*", schema: "public", table: "deal_records", filter: `thread_id=eq.${activeVendorThreadId}` }
          : { event: "*", schema: "public", table: "deal_records", filter: "thread_id=eq.__none__" },
        () => {
          if (activeVendorThreadId) void refreshVendorDeal(activeVendorThreadId, activeVendorCompany.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, browserSupabaseReady, sessionRole, activeVendorCompany, activeVendorThreadId, vendorMessagingVisible, refreshVendorDeal, refreshVendorThreadMessages]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) return;
    if (activeSection !== "vendor-billing" && activeSection !== "vendor-overview") return;

    const refreshVendorBillingState = () => {
      if (document.visibilityState !== "visible") return;
      void refreshVendorBilling(activeVendorCompany.id);
      void refreshVendorApplication();
    };

    window.addEventListener("focus", refreshVendorBillingState);
    document.addEventListener("visibilitychange", refreshVendorBillingState);

    return () => {
      window.removeEventListener("focus", refreshVendorBillingState);
      document.removeEventListener("visibilitychange", refreshVendorBillingState);
    };
  }, [sessionRole, activeSection, activeVendorCompany, refreshVendorApplication, refreshVendorBilling]);

  useEffect(() => {
    if (sessionRole !== "vendor" || !activeVendorCompany) return;
    if (billingReturnFlag !== "1") return;

    let cancelled = false;
    const run = async () => {
      for (const delay of [0, 1000, 3000]) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
          if (cancelled) return;
        }
        await refreshVendorBilling(activeVendorCompany.id);
        await refreshVendorApplication();
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("billing_return");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [billingReturnFlag, sessionRole, activeVendorCompany, pathname, router, searchParams, refreshVendorApplication, refreshVendorBilling]);


  useEffect(() => {
    if (sessionRole === "guest" && (activeSection.startsWith("buyer-") || activeSection.startsWith("vendor-"))) {
      setActiveSection("auth");
      return;
    }
    if (activeSection !== "auth") return;
    if (sessionRole === "buyer" && activeBuyer) {
      setActiveSection("buyer-overview");
      return;
    }
    if (sessionRole === "vendor" && activeVendorCompany) {
      setActiveSection("vendor-overview");
    }
  }, [activeBuyer, activeVendorCompany, activeSection, sessionRole]);

  useEffect(() => {
    setVendorProfileForm(buildVendorProfileForm(activeVendorCompany, currentVendorApplication));
  }, [activeVendorCompany, currentVendorApplication]);

  const visibleSections = useMemo(() => {
    const guestSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "auth", label: locale === "ja" ? "ログイン" : "Login" }
    ];
    const adminSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" }
    ];
    const buyerSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "buyer-overview", label: locale === "ja" ? "概要" : "Overview" },
      { key: "buyer-saved", label: locale === "ja" ? "保存候補" : "Saved" },
      { key: "buyer-matching", label: matchingLabel(locale) },
      { key: "buyer-messages", label: locale === "ja" ? "メッセージ" : "Messages" },
      { key: "buyer-projects", label: locale === "ja" ? "過去案件" : "Projects" }
    ];
    const vendorSections: Array<{ key: AppSectionKey; label: string }> = [
      { key: "marketplace", label: locale === "ja" ? "マーケットプレイス" : "Marketplace" },
      { key: "vendor-overview", label: locale === "ja" ? "概要" : "Overview" },
      { key: "vendor-profile", label: locale === "ja" ? "会社プロフィール" : "Company Profile" },
      { key: "vendor-projects", label: locale === "ja" ? "ポートフォリオ" : "Portfolio" },
      { key: "vendor-history", label: locale === "ja" ? "過去案件" : "Past Projects" },
      { key: "vendor-messages", label: locale === "ja" ? "問い合わせ" : "Inbox" },
      { key: "vendor-billing", label: locale === "ja" ? "請求" : "Billing" }
    ];
    if (sessionRole === "buyer") return buyerSections;
    if (sessionRole === "vendor") return vendorSections;
    if (adminEmail) return adminSections;
    return guestSections;
  }, [adminEmail, locale, sessionRole]);

  const buyerUnreadChatCount = useMemo(
    () => threads.filter((thread) => (thread.unreadCount ?? 0) > 0 || Boolean(thread.notificationKind)).length,
    [threads]
  );

  const vendorUnreadChatCount = useMemo(
    () => vendorThreads.filter((thread) => (thread.unreadCount ?? 0) > 0 || Boolean(thread.notificationKind)).length,
    [vendorThreads]
  );

  const kpis = useMemo(() => {
    const avgRate = companies.length > 0 ? Math.round(companies.reduce((acc, c) => acc + c.minRate, 0) / companies.length) : 0;
    return [
      { label: locale === "ja" ? "公開開発会社" : "Listed Vendors", value: locale === "ja" ? `${marketplaceStats.listedVendorCount}社` : `${marketplaceStats.listedVendorCount}`, icon: BriefcaseBusiness },
      { label: locale === "ja" ? "進行中案件" : "Active Matches", value: locale === "ja" ? `${marketplaceStats.activeMatchCount}件` : `${marketplaceStats.activeMatchCount}`, icon: Sparkles },
      { label: locale === "ja" ? "完了案件" : "Past Jobs", value: locale === "ja" ? `${marketplaceStats.completedJobCount}件` : `${marketplaceStats.completedJobCount}`, icon: FolderKanban },
      { label: locale === "ja" ? "平均開始単価" : "Average Base Rate", value: `¥${avgRate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}/${locale === "ja" ? "時" : "hr"}`, icon: Wallet }
    ];
  }, [companies, locale, marketplaceStats]);

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => {
      const source = `${company.name} ${company.summary} ${company.services.join(" ")} ${company.portfolioProjects
        .map((project) => `${project.title} ${project.projectType} ${project.summary} ${project.businessImpact}`)
        .join(" ")}`.toLowerCase();
      if (query && !source.includes(query.toLowerCase())) return false;
      if (techFilter && !company.services.join(" ").toLowerCase().includes(techFilter)) return false;
      if (projectFilter && !company.portfolioProjects.some((project) => project.projectType === projectFilter)) return false;
      if (rateCap && company.minRate > Number(rateCap)) return false;
      return true;
    });
  }, [companies, projectFilter, query, rateCap, techFilter]);

  const totalMarketplacePages = Math.max(1, Math.ceil(visibleCompanies.length / MARKETPLACE_PAGE_SIZE));
  const favoriteCompanies = useMemo(
    () => companies.filter((company) => favoriteCompanyIds.includes(company.id)),
    [companies, favoriteCompanyIds]
  );
  const pagedVisibleCompanies = useMemo(() => {
    const start = (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE;
    return visibleCompanies.slice(start, start + MARKETPLACE_PAGE_SIZE);
  }, [visibleCompanies, marketplacePage]);

  useEffect(() => {
    setMarketplacePage(1);
  }, [query, techFilter, projectFilter, rateCap]);

  useEffect(() => {
    if (marketplacePage > totalMarketplacePages) {
      setMarketplacePage(totalMarketplacePages);
    }
  }, [marketplacePage, totalMarketplacePages]);

  const matchedResults = useMemo<MatchResult[]>(() => {
    if (!criteria) return [];
    return runTierAwareMatch(companies, criteria, {}, 6);
  }, [companies, criteria]);

  const matchingSteps = useMemo(
    () => [
      {
        key: "projectGoal" as MatchingStepKey,
        prompt:
          locale === "ja"
            ? "まず、何を作りたいのかを教えてください。例: 在庫管理を楽にしたい、顧客向けの予約アプリを作りたい"
            : "First, tell me what you want to build. Example: improve inventory workflows or launch a booking app for customers.",
        quickReplies:
          locale === "ja"
            ? ["ECサイトを作りたい", "社内業務を効率化したい", "顧客向けアプリを作りたい", "新しいSaaSを作りたい"]
            : ["Build an e-commerce product", "Improve internal operations", "Create a customer app", "Launch a new SaaS"]
      },
      {
        key: "projectTypes" as MatchingStepKey,
        prompt:
          locale === "ja"
            ? "次に、案件タイプとして近いものを選んでください。複数あればまとめて送ってください。"
            : "Next, choose the closest project type. If more than one applies, send them together.",
        quickReplies: [...MATCHING_PROJECT_TYPE_OPTIONS.slice(0, 5).map((option) => projectTypeLabel(option, locale)), locale === "ja" ? "未定" : "Not sure"] as string[]
      },
      {
        key: "duration" as MatchingStepKey,
        prompt:
          locale === "ja"
            ? "想定期間を月数で教えてください。例: 6"
            : "How many months do you expect the project to run? Example: 6",
        quickReplies: ["1", "3", "6", "12", locale === "ja" ? "未定" : "Not sure"]
      },
      {
        key: "budget" as MatchingStepKey,
        prompt:
          locale === "ja"
            ? "最後に、想定している総予算があれば教えてください。例: 3000000"
            : "If you already have a rough total budget, enter it here. Example: 3000000",
        quickReplies:
          locale === "ja"
            ? ["100万未満", "100万〜300万", "300万〜500万", "500万〜1000万", "1000万以上", "未定"]
            : ["1000000", "3000000", "5000000", "10000000", "Not sure"]
      }
    ],
    [locale]
  );

  const activeMatchingStep = matchingSteps[matchingStepIndex] ?? null;
  const displayedCriteria = useMemo(
    () =>
      criteria ??
      inferBuyerCriteriaFromIntake({
        projectGoal: matchingProjectGoal,
        selectedProjectTypes: matchingDraftCriteria.projectTypes,
        deliveryPreference: "",
        budgetCeiling: matchingDraftCriteria.budgetCeiling,
        durationMonths: matchingDraftCriteria.durationMonths,
        teamNeeded: null,
        englishRequired: false,
        japaneseRequired: false
      }),
    [criteria, matchingDraftCriteria, matchingProjectGoal]
  );

  const matchingSummaryItems = useMemo(
    () => [
      {
        key: "projectGoal" as MatchingStepKey,
        label: locale === "ja" ? "何を作りたいですか？" : "What do you want to build?"
      },
      {
        key: "projectTypes" as MatchingStepKey,
        label: locale === "ja" ? "近い案件タイプは？" : "Which project type is closest?"
      },
      {
        key: "duration" as MatchingStepKey,
        label: locale === "ja" ? "想定期間は？" : "What is the expected timeline?"
      },
      {
        key: "budget" as MatchingStepKey,
        label: locale === "ja" ? "総予算は？" : "What is the total budget?"
      }
    ]
      .map((item) => ({
        ...item,
        value: matchingAnswers[item.key]?.trim() || ""
      }))
      .filter((item) => item.value.length > 0),
    [locale, matchingAnswers]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.sessionStorage.getItem(MATCHING_SESSION_STORAGE_KEY);
    if (!raw) {
      setMatchingSessionReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        criteria?: BuyerCriteria | null;
        matchingDraftCriteria?: BuyerCriteria;
        matchingAnswers?: MatchingAnswers;
        matchingProjectGoal?: string;
        matchingStepIndex?: number;
        chatMessages?: ChatMessage[];
      };

      if (parsed.criteria) setCriteria(parsed.criteria);
      if (parsed.matchingDraftCriteria) setMatchingDraftCriteria(parsed.matchingDraftCriteria);
      if (parsed.matchingAnswers) setMatchingAnswers(parsed.matchingAnswers);
      if (typeof parsed.matchingProjectGoal === "string") setMatchingProjectGoal(parsed.matchingProjectGoal);
      if (typeof parsed.matchingStepIndex === "number") setMatchingStepIndex(parsed.matchingStepIndex);
      if (Array.isArray(parsed.chatMessages) && parsed.chatMessages.length > 0) setChatMessages(parsed.chatMessages);
    } catch {
      window.sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
    } finally {
      setMatchingSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!matchingSessionReady) return;

    window.sessionStorage.setItem(
      MATCHING_SESSION_STORAGE_KEY,
      JSON.stringify({
        criteria,
        matchingDraftCriteria,
        matchingAnswers,
        matchingProjectGoal,
        matchingStepIndex,
        chatMessages
      })
    );
  }, [chatMessages, criteria, matchingAnswers, matchingDraftCriteria, matchingProjectGoal, matchingSessionReady, matchingStepIndex]);

  const buyerProjects = useMemo<ProjectHistoryRecord[]>(
    () => (activeBuyer ? SEED_PROJECT_HISTORY.filter((project) => project.buyerOrgId === activeBuyer.id && project.status === "completed") : []),
    [activeBuyer]
  );

  const vendorProjects = useMemo<ProjectHistoryRecord[]>(
    () => (activeVendorCompany ? SEED_PROJECT_HISTORY.filter((project) => project.vendorCompanyId === activeVendorCompany.id && project.status === "completed") : []),
    [activeVendorCompany]
  );

  const vendorApplicationStatus = currentVendorApplication?.status ?? null;
  const visibleThreadMessages = useMemo(
    () =>
      [...threadMessages, ...pendingThreadMessages]
        .filter((message, index, collection) => collection.findIndex((entry) => entry.id === message.id) === index)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [threadMessages, pendingThreadMessages]
  );
  const visibleVendorThreadMessages = useMemo(
    () =>
      [...vendorThreadMessages, ...pendingVendorThreadMessages]
        .filter((message, index, collection) => collection.findIndex((entry) => entry.id === message.id) === index)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [vendorThreadMessages, pendingVendorThreadMessages]
  );
  const buyerThreadOverviewById = useMemo(
    () => new Map(buyerThreadOverview.map((thread) => [thread.threadId, thread])),
    [buyerThreadOverview]
  );
  const vendorThreadOverviewById = useMemo(
    () => new Map(vendorThreadOverview.map((thread) => [thread.threadId, thread])),
    [vendorThreadOverview]
  );
  const groupedBuyerThreads = useMemo(
    () =>
      dealStatusOptions.map((status) => ({
        status,
        threads: threads.filter((thread) => (thread.status ?? "相談中") === status)
      })),
    [threads]
  );
  const groupedVendorThreads = useMemo(
    () =>
      dealStatusOptions.map((status) => ({
        status,
        threads: vendorThreads.filter((thread) => (thread.status ?? "相談中") === status)
      })),
    [vendorThreads]
  );
  const buyerCompletedThreadProjects = useMemo<ProjectHistoryRecord[]>(
    () =>
      threads
        .filter((thread) => {
          const overview = buyerThreadOverviewById.get(thread.id);
          return overview?.status === "完了" && Boolean(overview.lockedAt);
        })
        .map((thread) => {
          const overview = buyerThreadOverviewById.get(thread.id);
          const vendorCompany = companies.find((company) => company.id === thread.vendorCompanyId);
          return {
            id: `thread-project-${thread.id}`,
            buyerOrgId: activeBuyer?.id ?? "",
            buyerOrgName: activeBuyer?.companyName ?? "",
            vendorCompanyId: thread.vendorCompanyId,
            vendorCompanyName: overview?.counterpartyLabel ?? vendorCompany?.name ?? "Unknown Vendor",
            title: `${overview?.counterpartyLabel ?? vendorCompany?.name ?? "Vendor"} ${locale === "ja" ? "案件" : "Project"}`,
            summary: overview?.lastMessage || (locale === "ja" ? "完了したやり取りです。" : "Completed conversation."),
            technologies: vendorCompany?.services ?? [],
            status: "completed",
            deliveredAt: overview?.lockedAt ?? overview?.lastMessageAt ?? thread.createdAt
          };
        }),
    [threads, buyerThreadOverviewById, companies, activeBuyer, locale]
  );
  const combinedBuyerProjects = useMemo<ProjectHistoryRecord[]>(
    () =>
      [...buyerProjects, ...buyerCompletedThreadProjects].sort(
        (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
      ),
    [buyerProjects, buyerCompletedThreadProjects]
  );

  const vendorCompletedThreadProjects = useMemo<ProjectHistoryRecord[]>(
    () =>
      vendorThreads
        .filter((thread) => {
          const overview = vendorThreadOverviewById.get(thread.id);
          return overview?.status === "完了" && Boolean(overview.lockedAt);
        })
        .map((thread) => {
          const overview = vendorThreadOverviewById.get(thread.id);
          return {
            id: `vendor-thread-project-${thread.id}`,
            buyerOrgId: "",
            buyerOrgName: thread.buyerCompanyName ?? thread.buyerEmail,
            vendorCompanyId: activeVendorCompany?.id ?? "",
            vendorCompanyName: activeVendorCompany?.name ?? "",
            title: `${thread.buyerCompanyName ?? thread.buyerEmail} ${locale === "ja" ? "案件" : "Project"}`,
            summary: overview?.lastMessage || (locale === "ja" ? "完了したやり取りです。" : "Completed conversation."),
            technologies: activeVendorCompany?.services ?? [],
            status: "completed",
            deliveredAt: overview?.lockedAt ?? overview?.lastMessageAt ?? thread.createdAt
          };
        }),
    [vendorThreads, vendorThreadOverviewById, activeVendorCompany, locale]
  );

  const combinedVendorProjects = useMemo<ProjectHistoryRecord[]>(
    () =>
      [...vendorProjects, ...vendorCompletedThreadProjects].sort(
        (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
      ),
    [vendorProjects, vendorCompletedThreadProjects]
  );

  useEffect(() => {
    const container = buyerMessagesContainerRef.current;
    if (!container) return;
    const nextLastMessageId = visibleThreadMessages[visibleThreadMessages.length - 1]?.id ?? "";
    const previous = lastBuyerAutoScrollRef.current;
    const threadChanged = previous.threadId !== activeThreadId;
    const newestMessageChanged = previous.lastMessageId !== nextLastMessageId;
    if (!threadChanged && !newestMessageChanged) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    lastBuyerAutoScrollRef.current = { threadId: activeThreadId, lastMessageId: nextLastMessageId };
  }, [visibleThreadMessages, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    const thread = threads.find((entry) => entry.id === activeThreadId);
    if (!thread) return;
    const status = thread.status ?? "相談中";
    setCollapsedBuyerThreadGroups((current) => ({ ...current, [status]: false }));
  }, [activeThreadId, threads]);

  useEffect(() => {
    const container = vendorMessagesContainerRef.current;
    if (!container) return;
    const nextLastMessageId = visibleVendorThreadMessages[visibleVendorThreadMessages.length - 1]?.id ?? "";
    const previous = lastVendorAutoScrollRef.current;
    const threadChanged = previous.threadId !== activeVendorThreadId;
    const newestMessageChanged = previous.lastMessageId !== nextLastMessageId;
    if (!threadChanged && !newestMessageChanged) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    lastVendorAutoScrollRef.current = { threadId: activeVendorThreadId, lastMessageId: nextLastMessageId };
  }, [visibleVendorThreadMessages, activeVendorThreadId]);

  useEffect(() => {
    if (!activeVendorThreadId) return;
    const thread = vendorThreads.find((entry) => entry.id === activeVendorThreadId);
    if (!thread) return;
    const status = thread.status ?? "相談中";
    setCollapsedVendorThreadGroups((current) => ({ ...current, [status]: false }));
  }, [activeVendorThreadId, vendorThreads]);

  useEffect(() => {
    if (buyerThreadInputRef.current) autosizeTextarea(buyerThreadInputRef.current);
  }, [threadInput]);

  useEffect(() => {
    if (vendorThreadInputRef.current) autosizeTextarea(vendorThreadInputRef.current);
  }, [vendorThreadInput]);

  const vendorBillingActive = vendorBilling?.status === "active";
  const vendorBillingCancelScheduled = Boolean(vendorBillingActive && vendorBilling?.canceledAt && vendorBilling?.currentPeriodEnd);
  const vendorBillingNeedsRecovery = sessionRole === "vendor" && vendorBilling?.status === "canceled";
  const vendorProfileReadyForPublishing = isVendorProfileReadyForPublishing(activeVendorCompany);
  const vendorIsPublished = Boolean(activeVendorCompany?.active && vendorBillingActive);
  const effectiveVendorPlan = normalizePlan(vendorBilling?.plan ?? activeVendorCompany?.plan);
  const logoutLoading = buyerLogoutLoading || vendorLogoutLoading || adminLogoutLoading;
  const vendorOnStandardPlan = vendorBilling?.plan === "basic" || (!vendorBilling && activeVendorCompany?.plan === "basic");
  const vendorDowngradeScheduled = vendorBilling?.pendingPlan === "basic" && Boolean(vendorBilling?.pendingPlanEffectiveAt);
  const isPortfolioEditing = Boolean(portfolioDraft);
  const vendorProfileChecklist = useMemo(() => {
    const company = activeVendorCompany;
    if (!company) return [];
    return [
      { done: Boolean(company.summary.trim()), label: locale === "ja" ? "会社紹介" : "Company summary" },
      { done: company.services.length > 0, label: locale === "ja" ? "技術スタック" : "Tech stack" },
      { done: company.minRate > 0 && company.maxRate >= company.minRate, label: locale === "ja" ? "単価レンジ" : "Rate range" },
      { done: company.teamSize > 0, label: locale === "ja" ? "チーム人数" : "Team size" }
    ];
  }, [activeVendorCompany, locale]);

  const showVendorProfilePrompt =
    sessionRole === "vendor" &&
    vendorBillingActive &&
    !vendorProfileReadyForPublishing &&
    !vendorIsPublished;

  useEffect(() => {
    setRestartPlanSelection(effectiveVendorPlan);
  }, [effectiveVendorPlan]);

function translatedTextForViewer(message: MessageRecord, target: "ja" | "en" | "company") {
  if (target === "ja") return message.translations.ja;
  if (target === "en") return message.translations.en;
  return message.translations.company;
}

function chatTranslationLabel(target: "ja" | "company", companyLanguage: VendorPreferredLanguage | undefined, locale: "ja" | "en") {
  if (target === "ja") return locale === "ja" ? "日本語訳" : "Japanese Translation";
  const language = languageLabel(companyLanguage, locale);
  return locale === "ja" ? `${language}訳` : `${language} Translation`;
}

function createInitialMatchingAssistantMessage(locale: "ja" | "en"): ChatMessage {
  return {
    id: makeId("chat"),
    role: "assistant",
    content:
      locale === "ja"
        ? "案件ヒアリングを始めます。まず、何を作りたいのかを教えてください。例: 社内向けの受発注管理システム、ECアプリ、新規SaaS など"
        : "Let's start the intake. First, tell me what you want to build. Example: an internal operations system, an e-commerce app, or a new SaaS product.",
    createdAt: new Date().toISOString()
  };
}

  async function toggleFavoriteCompany(companyId: string) {
    if (!activeBuyer || favoriteMutationLoading) return;
    const isSaved = favoriteCompanyIds.includes(companyId);
    setFavoriteMutationLoading(true);
    setFavoriteCompanyIds((current) =>
      isSaved ? current.filter((id) => id !== companyId) : [...current, companyId]
    );
    const response = await readJson<{ ok: boolean }>("/api/buyers/saved-companies", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId })
    });
    if (!response.ok) {
      setFavoriteCompanyIds((current) =>
        isSaved ? [...current, companyId] : current.filter((id) => id !== companyId)
      );
      toast({
        tone: "error",
        title: locale === "ja" ? "保存候補を更新できませんでした" : "Could not update saved vendors",
        description: response.error ?? ""
      });
      setFavoriteMutationLoading(false);
      return;
    }
    setFavoriteMutationLoading(false);
  }

  const getDealByThreadForBuyer = useCallback(async function getDealByThreadForBuyer(threadId: string) {
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/threads/${threadId}/deal`);
    return response.data?.deal ?? null;
  }, [readJson]);

  const getDealByThreadForVendor = useCallback(async function getDealByThreadForVendor(threadId: string, vendorCompanyId: string) {
    const response = await readJson<{ deal: DealRecord | null }>(`/api/messages/vendor/threads/${threadId}/deal`);
    return response.data?.deal ?? null;
  }, [readJson]);

  function applyBuyerDealToOverview(threadId: string, deal: DealRecord | null) {
    if (!deal) return;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              status: deal.status,
              lockedAt: deal.lockedAt ?? null,
              notificationKind:
                deal.proposedStatus && deal.proposedBy === "vendor"
                  ? "proposal-received"
                  : null
            }
          : thread
      )
    );
    setBuyerThreadOverview((current) =>
      current.map((thread) =>
        thread.threadId === threadId
          ? {
              ...thread,
              status: deal.status,
              proposedStatus: deal.proposedStatus ?? null,
              proposedBy: deal.proposedBy ?? null,
              lockedAt: deal.lockedAt ?? null
            }
          : thread
      )
    );
  }

  function applyVendorDealToOverview(threadId: string, deal: DealRecord | null) {
    if (!deal) return;
    setVendorThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              status: deal.status,
              lockedAt: deal.lockedAt ?? null,
              notificationKind:
                deal.proposedStatus && deal.proposedBy === "buyer"
                  ? "proposal-received"
                  : null
            }
          : thread
      )
    );
    setVendorThreadOverview((current) =>
      current.map((thread) =>
        thread.threadId === threadId
          ? {
              ...thread,
              status: deal.status,
              proposedStatus: deal.proposedStatus ?? null,
              proposedBy: deal.proposedBy ?? null,
              lockedAt: deal.lockedAt ?? null
            }
          : thread
      )
    );
  }

  async function handleBuyerDealProposal(status: DealStatus, options?: { skipConfirm?: boolean }) {
    if (!activeThreadId) return;
    if (status === "完了" && !options?.skipConfirm) {
      setPendingBuyerCompletionProposal(true);
      return;
    }

    const response = await readJson<{ deal: DealRecord }>(`/api/messages/threads/${activeThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", status })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: locale === "ja" ? "ステータス提案に失敗しました" : "Failed to propose status", description: response.error ?? "" });
      return;
    }
    setActiveBuyerDeal(response.data.deal);
    applyBuyerDealToOverview(activeThreadId, response.data.deal);
    await refreshThreadMessages(activeThreadId);
    await buildBuyerThreadOverview(threads);
  }

  async function handleBuyerDealProposalResponse(action: "accept" | "reject") {
    if (!activeThreadId) return;
    const response = await readJson<{ deal: DealRecord }>(`/api/messages/threads/${activeThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: locale === "ja" ? "ステータス更新に失敗しました" : "Failed to update status", description: response.error ?? "" });
      return;
    }
    setActiveBuyerDeal(response.data.deal);
    applyBuyerDealToOverview(activeThreadId, response.data.deal);
    await refreshThreadMessages(activeThreadId);
    await buildBuyerThreadOverview(threads);
  }

  async function confirmBuyerCompletionProposal() {
    setPendingBuyerCompletionProposal(false);
    await handleBuyerDealProposal("完了", { skipConfirm: true });
  }

  async function handleVendorDealProposal(status: DealStatus, options?: { skipConfirm?: boolean }) {
    if (!activeVendorThreadId || !activeVendorCompany) return;
    if (status === "完了" && !options?.skipConfirm) {
      setPendingVendorCompletionProposal(true);
      return;
    }

    const response = await readJson<{ deal: DealRecord }>(`/api/messages/vendor/threads/${activeVendorThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "propose", status })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: locale === "ja" ? "ステータス提案に失敗しました" : "Failed to propose status", description: response.error ?? "" });
      return;
    }
    setActiveVendorDeal(response.data.deal);
    applyVendorDealToOverview(activeVendorThreadId, response.data.deal);
    await refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
    await buildVendorThreadOverview(vendorThreads, activeVendorCompany.id);
  }

  async function handleVendorDealProposalResponse(action: "accept" | "reject") {
    if (!activeVendorThreadId || !activeVendorCompany) return;
    const response = await readJson<{ deal: DealRecord }>(`/api/messages/vendor/threads/${activeVendorThreadId}/deal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (!response.ok || !response.data) {
      toast({ tone: "error", title: locale === "ja" ? "ステータス更新に失敗しました" : "Failed to update status", description: response.error ?? "" });
      return;
    }
    setActiveVendorDeal(response.data.deal);
    applyVendorDealToOverview(activeVendorThreadId, response.data.deal);
    await refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
    await buildVendorThreadOverview(vendorThreads, activeVendorCompany.id);
  }

  async function confirmVendorCompletionProposal() {
    setPendingVendorCompletionProposal(false);
    await handleVendorDealProposal("完了", { skipConfirm: true });
  }

  async function handleUnifiedLogin() {
    setLoginLoading(true);
    const response = await readJson<{
      role: "buyer" | "vendor" | "admin";
      buyer?: BuyerOrganization;
      vendor?: Company;
      admin?: { email: string };
      supabaseSession?: SupabaseSessionPayload | null;
    }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });
    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? (locale === "ja" ? "ログインに失敗しました。" : "Login failed.");
      setLoginMessage(errorMessage);
      toast({ tone: "error", title: locale === "ja" ? "ログインに失敗しました" : "Login failed", description: errorMessage });
      setLoginLoading(false);
      return;
    }

    setLoginMessage(locale === "ja" ? "ログインしました。" : "Signed in.");
    setBrowserSupabaseReady(false);
    await ensureBrowserSupabaseSession(response.data.supabaseSession ?? null);

    if (response.data.role === "buyer" && response.data.buyer) {
      setActiveBuyer(response.data.buyer);
      setActiveVendorCompany(null);
      setSessionRole("buyer");
      toast({ tone: "success", title: locale === "ja" ? "ログインしました" : "Signed in", description: locale === "ja" ? "発注企業ワークスペースを表示します。" : "Opening the buyer workspace." });
      setActiveSection("buyer-overview");
      await refreshSavedCompanies();
      await refreshThreads();
      setLoginLoading(false);
      return;
    }

    if (response.data.role === "vendor" && response.data.vendor) {
      setActiveVendorCompany(response.data.vendor);
      setActiveBuyer(null);
      setFavoriteCompanyIds([]);
      setSessionRole("vendor");
      toast({ tone: "success", title: locale === "ja" ? "ログインしました" : "Signed in", description: locale === "ja" ? "開発会社ワークスペースを表示します。" : "Opening the vendor workspace." });
      setActiveSection("vendor-overview");
      await refreshVendorApplication();
      await refreshVendorThreads();
      setLoginLoading(false);
      return;
    }

    if (response.data.role === "admin" && response.data.admin) {
      setAdminEmail(response.data.admin.email);
      setActiveBuyer(null);
      setActiveVendorCompany(null);
      setFavoriteCompanyIds([]);
      setSessionRole("guest");
      toast({ tone: "success", title: locale === "ja" ? "ログインしました" : "Signed in", description: locale === "ja" ? "管理ダッシュボードへ移動できます。" : "Admin tools are available." });
      setActiveSection("marketplace");
      setLoginLoading(false);
      return;
    }

    setLoginLoading(false);
  }

  async function handleBuyerLogout() {
    setBuyerLogoutLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    if (supabase) {
      await supabase.auth.signOut();
    }
    setBrowserSupabaseReady(false);
    setSessionRole("guest");
    setActiveBuyer(null);
    setActiveVendorCompany(null);
    setCurrentVendorApplication(null);
    setThreads([]);
    setFavoriteCompanyIds([]);
    setActiveThreadId("");
    setThreadMessages([]);
    setLoginMessage(locale === "ja" ? "ログアウトしました。" : "Signed out.");
    toast({ tone: "info", title: locale === "ja" ? "ログアウトしました" : "Signed out" });
    setActiveSection("marketplace");
    setAdminEmail(null);
    setBuyerLogoutLoading(false);
  }

  async function handleAdminLogout() {
    setAdminLogoutLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    if (supabase) {
      await supabase.auth.signOut();
    }
    setBrowserSupabaseReady(false);
    setAdminEmail(null);
    setActiveBuyer(null);
    setActiveVendorCompany(null);
    setFavoriteCompanyIds([]);
    setCurrentVendorApplication(null);
    setSessionRole("guest");
    setLoginMessage(locale === "ja" ? "ログアウトしました。" : "Signed out.");
    toast({ tone: "info", title: locale === "ja" ? "ログアウトしました" : "Signed out" });
    setActiveSection("marketplace");
    setAdminLogoutLoading(false);
  }

  async function handleVendorLogout() {
    setVendorLogoutLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    if (supabase) {
      await supabase.auth.signOut();
    }
    setBrowserSupabaseReady(false);
    setActiveVendorCompany(null);
    setCurrentVendorApplication(null);
    setVendorThreads([]);
    setActiveVendorThreadId("");
    setVendorThreadMessages([]);
    setVendorThreadInput("");
    setVendorThreadMessageInfo("");
    setVendorProfileMessage("");
    setVendorBilling(null);
    setVendorBillingMessage("");
    setFavoriteCompanyIds([]);
    setSessionRole("guest");
    setLoginMessage(locale === "ja" ? "ログアウトしました。" : "Signed out.");
    toast({ tone: "info", title: locale === "ja" ? "ログアウトしました" : "Signed out" });
    setActiveSection("marketplace");
    setAdminEmail(null);
    setVendorLogoutLoading(false);
  }

  async function persistVendorProfile(nextForm = vendorProfileForm) {
    if (!activeVendorCompany || !nextForm.summary.trim()) {
      setVendorProfileMessage(locale === "ja" ? "会社紹介は必須です。" : "Company summary is required.");
      return false;
    }

    if (currentVendorApplication && !vendorIsPublished) {
      const response = await readJson<{ application: VendorApplication }>("/api/vendors/me/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextForm.name,
          country: nextForm.country,
          contactName: nextForm.contactName,
          contactEmail: nextForm.contactEmail,
          plan: nextForm.plan,
          websiteUrl: nextForm.websiteUrl,
          publicContactEmail: nextForm.publicContactEmail,
          publicContactPhone: nextForm.publicContactPhone,
          preferredLanguage: nextForm.preferredLanguage,
          summary: nextForm.summary,
          summaryJa: nextForm.summaryJa,
          servicesCsv: nextForm.servicesCsv,
          minRate: nextForm.minRate,
          maxRate: nextForm.maxRate,
          teamSize: nextForm.teamSize,
          english: nextForm.english,
          japaneseSupport: nextForm.japaneseSupport,
          portfolioProjects: nextForm.portfolioProjects
        })
      });
      if (!response.ok || !response.data) {
        setVendorProfileMessage(response.error ?? "更新に失敗しました。");
        return false;
      }
      setCurrentVendorApplication(response.data.application);
      setActiveVendorCompany(response.data.application.company);
      setVendorProfileForm(buildVendorProfileForm(response.data.application.company, response.data.application));
      setVendorProfileMessage(
        vendorBillingActive
          ? (locale === "ja" ? "プロフィールを更新しました。掲載状態を確認してください。" : "Profile updated. Please check your listing status.")
          : (locale === "ja" ? "プロフィール下書きを更新しました。" : "Profile draft updated.")
      );
      setVendorProfileEditing(false);
      setEditingPortfolioProjectId("");
      setPortfolioDraft(null);
      await Promise.all([refreshVendorApplication(), refreshCompanies()]);
      return true;
    }

    const response = await readJson<{ company: Company }>(`/api/vendors/companies/${activeVendorCompany.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextForm)
    });
    if (!response.ok || !response.data) {
      setVendorProfileMessage(response.error ?? (locale === "ja" ? "更新に失敗しました。" : "Failed to update the profile."));
      return false;
    }
    setActiveVendorCompany(response.data.company);
    setVendorProfileForm(buildVendorProfileForm(response.data.company, currentVendorApplication));
    setCompanies((prev) => {
      const exists = prev.some((entry) => entry.id === response.data!.company.id);
      if (exists) return prev.map((entry) => (entry.id === response.data!.company.id ? response.data!.company : entry));
      return [response.data!.company, ...prev];
    });
    setVendorProfileMessage(locale === "ja" ? "プロフィールを更新しました。" : "Profile updated.");
    setVendorProfileEditing(false);
    setEditingPortfolioProjectId("");
    setPortfolioDraft(null);
    await Promise.all([refreshVendorApplication(), refreshCompanies()]);
    return true;
  }

  async function handleSaveVendorProfile() {
    setVendorProfileSaving(true);
    try {
      await persistVendorProfile();
    } finally {
      setVendorProfileSaving(false);
    }
  }

  async function handleTranslateVendorProfile() {
    if (!activeVendorCompany || !vendorBilling?.translationEnabled) return;
    if (!vendorProfileForm.summary.trim()) {
      setProfileTranslationMessage(
        locale === "ja"
          ? "会社紹介を入力してから翻訳してください。"
          : "Enter a company summary before translating."
      );
      return;
    }
    setProfileTranslationLoading(true);
    setProfileTranslationMessage(
      locale === "ja"
        ? "会社紹介を日本語に翻訳しています..."
        : "Translating your company summary into Japanese..."
    );

    const response = await readJson<{ summary: string }>("/api/translate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetLanguage: "ja",
        summary: vendorProfileForm.summary
      })
    });

    setProfileTranslationLoading(false);
    if (!response.ok || !response.data) {
      setProfileTranslationMessage(
        response.error ?? (locale === "ja" ? "プロフィール翻訳に失敗しました。" : "Failed to translate the profile.")
      );
      return;
    }

    setProfileTranslationPreview(response.data.summary);
    setProfileTranslationPreviewOpen(true);
    setProfileTranslationMessage(
      locale === "ja"
        ? "日本語訳のプレビューを表示しています。内容を確認して採用してください。"
        : "Showing the Japanese preview. Review it and apply it if it looks right."
    );
  }

  function applyVendorProfileTranslationPreview() {
    setVendorProfileForm((current) => ({
      ...current,
      summaryJa: profileTranslationPreview
    }));
    setProfileTranslationPreviewOpen(false);
    setProfileTranslationMessage(
      locale === "ja"
        ? "日本語訳を公開プロフィール用に反映しました。保存すると公開表示へ使われます。"
        : "The Japanese translation has been applied. Save the profile to use it publicly."
    );
  }

  async function handleTranslatePortfolioDraft() {
    if (!portfolioDraft || !vendorBilling?.translationEnabled) return;
    if (!portfolioDraft.title.trim() && !portfolioDraft.summary.trim()) {
      setVendorProfileMessage(
        locale === "ja"
          ? "実績名または案件概要を入力してから翻訳してください。"
          : "Enter a project name or summary before translating."
      );
      return;
    }
    setPortfolioTranslationLoading(true);
    setVendorProfileMessage(
      locale === "ja"
        ? "実績を日本語に翻訳しています..."
        : "Translating your portfolio entry into Japanese..."
    );
    const response = await readJson<{ portfolioProject: PortfolioProject }>("/api/translate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetLanguage: "ja",
        portfolioProject: portfolioDraft
      })
    });
    setPortfolioTranslationLoading(false);
    if (!response.ok || !response.data) {
      setVendorProfileMessage(
        response.error ?? (locale === "ja" ? "実績翻訳に失敗しました。" : "Failed to translate the portfolio entry.")
      );
      return;
    }
    setPortfolioTranslationPreview(response.data.portfolioProject);
    setPortfolioTranslationPreviewOpen(true);
    setVendorProfileMessage(
      locale === "ja"
        ? "実績の日本語訳プレビューを表示しています。内容を確認して採用してください。"
        : "Showing the Japanese preview for this portfolio entry. Review it and apply it if it looks right."
    );
  }

  function applyPortfolioTranslationPreview() {
    if (!portfolioTranslationPreview) return;
    setPortfolioDraft(portfolioTranslationPreview);
    setPortfolioTechnologiesInput(portfolioTranslationPreview.technologies.join(", "));
    setPortfolioTranslationPreviewOpen(false);
    setVendorProfileMessage(
      locale === "ja"
        ? "日本語訳を実績に反映しました。保存すると公開表示へ使われます。"
        : "The Japanese translation has been applied to this portfolio item. Save it to use it publicly."
    );
  }

  function updatePortfolioDraft(patch: Partial<PortfolioProject>) {
    setPortfolioDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function addPortfolioProject() {
    const nextProject = emptyPortfolioProject();
    setEditingPortfolioProjectId(nextProject.id);
    setPortfolioDraft(nextProject);
    setPortfolioTechnologiesInput("");
  }

  async function removePortfolioProject(projectId: string) {
    setPortfolioDeletingId(projectId);
    const nextProjects = vendorProfileForm.portfolioProjects.filter((project) => project.id !== projectId);
    const nextForm = {
      ...vendorProfileForm,
      portfolioProjects: nextProjects
    };
    try {
      const saved = await persistVendorProfile(nextForm);
      if (!saved) return;
      setEditingPortfolioProjectId((current) => (current === projectId ? "" : current));
      setPortfolioDraft((current) => (current?.id === projectId ? null : current));
    } finally {
      setPortfolioDeletingId("");
    }
  }

  function startEditingPortfolioProject(projectId: string) {
    const project = vendorProfileForm.portfolioProjects.find((entry) => entry.id === projectId);
    if (!project) return;
    setEditingPortfolioProjectId(projectId);
    setPortfolioDraft({ ...project });
    setPortfolioTechnologiesInput(project.technologies.join(", "));
  }

  function cancelPortfolioEditing() {
    setEditingPortfolioProjectId("");
    setPortfolioDraft(null);
    setPortfolioTechnologiesInput("");
  }

  async function commitPortfolioDraft() {
    if (!portfolioDraft) return;
    setPortfolioSaving(true);
    const nextProjects = (() => {
      const currentProjects = vendorProfileForm.portfolioProjects;
      const existing = currentProjects.some((project) => project.id === portfolioDraft.id);
      return existing
        ? currentProjects.map((project) => (project.id === portfolioDraft.id ? portfolioDraft : project))
        : [...currentProjects, portfolioDraft];
    })();
    const nextForm = {
      ...vendorProfileForm,
      portfolioProjects: nextProjects
    };
    try {
      const saved = await persistVendorProfile(nextForm);
      if (!saved) return;
      setPortfolioTechnologiesInput("");
    } finally {
      setPortfolioSaving(false);
    }
  }

  async function performBillingAction(action: "pause" | "resume" | "cancel") {
    if (!activeVendorBillingCompanyId) return;
    setBillingActionLoading(action);
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${activeVendorBillingCompanyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    setBillingActionLoading("");
    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? "請求設定の更新に失敗しました。";
      setVendorBillingMessage(errorMessage);
      toast({
        tone: "error",
        title: locale === "ja" ? "請求設定を更新できませんでした" : "Could not update billing",
        description: errorMessage
      });
      return;
    }
    setVendorBilling(response.data.billingAccount);
    const successMessage =
      action === "pause"
        ? "請求を一時停止しました。"
        : action === "resume"
          ? vendorBillingCancelScheduled
            ? "解約予約を取り消しました。"
            : "請求を再開しました。"
          : response.data.billingAccount.currentPeriodEnd
            ? `現在の契約期間終了日（${new Date(response.data.billingAccount.currentPeriodEnd).toLocaleDateString("ja-JP")}）で解約されます。`
            : "現在の契約期間の終了時に解約されます。";
    setVendorBillingMessage(successMessage);
    toast({
      tone: action === "cancel" ? "info" : "success",
      title:
        action === "pause"
          ? (locale === "ja" ? "一時停止しました" : "Paused")
          : action === "resume"
            ? vendorBillingCancelScheduled
              ? (locale === "ja" ? "解約予約を取り消しました" : "Cancellation removed")
              : (locale === "ja" ? "再開しました" : "Resumed")
            : (locale === "ja" ? "解約を予約しました" : "Cancellation scheduled"),
      description: successMessage
    });
  }

  async function handleBillingAction(action: "pause" | "resume" | "cancel") {
    if (!activeVendorCompany) return;
    if (action === "cancel") {
      setBillingCancelConfirmOpen(true);
      return;
    }
    await performBillingAction(action);
  }

  async function confirmBillingCancellation() {
    setBillingCancelConfirmOpen(false);
    await performBillingAction("cancel");
  }

  async function handleUpgradeToTranslationPlan() {
    if (!activeVendorBillingCompanyId) return;
    setBillingActionLoading("upgrade");
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${activeVendorBillingCompanyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upgrade_translation" })
    });
    setBillingActionLoading("");

    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? "プラン変更に失敗しました。";
      setVendorBillingMessage(errorMessage);
      toast({
        tone: "error",
        title: locale === "ja" ? "アップグレードできませんでした" : "Could not upgrade",
        description: errorMessage
      });
      return;
    }

    setVendorBilling(response.data.billingAccount);
    await Promise.all([refreshVendorApplication(), activeVendorCompany ? refreshCompanies() : Promise.resolve()]);
    const successMessage = locale === "ja" ? "翻訳付きプランへアップグレードしました。差額はすぐに請求されます。" : "Upgraded to the translation plan. The prorated difference is billed immediately.";
    setVendorBillingMessage(successMessage);
    toast({
      tone: "success",
      title: locale === "ja" ? "翻訳付きプランへ変更しました" : "Upgraded to translation",
      description: successMessage
    });
  }

  async function handleDowngradeToStandardPlan() {
    if (!activeVendorBillingCompanyId) return;
    setBillingActionLoading("downgrade");
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${activeVendorBillingCompanyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "downgrade_basic" })
    });
    setBillingActionLoading("");

    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? "プラン変更に失敗しました。";
      setVendorBillingMessage(errorMessage);
      toast({
        tone: "error",
        title: locale === "ja" ? "ダウングレードできませんでした" : "Could not downgrade",
        description: errorMessage
      });
      return;
    }

    setVendorBilling(response.data.billingAccount);
    const effectiveDate = response.data.billingAccount.pendingPlanEffectiveAt
      ? new Date(response.data.billingAccount.pendingPlanEffectiveAt).toLocaleDateString("ja-JP")
      : null;
    const successMessage = effectiveDate
      ? `現在の翻訳付きプランは ${effectiveDate} まで利用でき、その後スタンダードへ切り替わります。`
      : "現在の契約期間が終わるまで翻訳付きプランを利用でき、その後スタンダードへ切り替わります。";
    setVendorBillingMessage(successMessage);
    toast({
      tone: "info",
      title: locale === "ja" ? "スタンダードへの変更を予約しました" : "Downgrade scheduled",
      description: successMessage
    });
  }

  function promptBillingDowngrade() {
    setBillingCancelConfirmOpen(false);
    setBillingDowngradeConfirmOpen(true);
  }

  async function confirmBillingDowngrade() {
    setBillingDowngradeConfirmOpen(false);
    await handleDowngradeToStandardPlan();
  }

  async function handleCancelScheduledDowngrade() {
    if (!activeVendorBillingCompanyId) return;
    setBillingActionLoading("cancel_downgrade");
    const response = await readJson<{ billingAccount: VendorBillingAccount }>(`/api/billing/vendor-account/${activeVendorBillingCompanyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_downgrade" })
    });
    setBillingActionLoading("");

    if (!response.ok || !response.data) {
      const errorMessage = response.error ?? "変更の取り消しに失敗しました。";
      setVendorBillingMessage(errorMessage);
      toast({
        tone: "error",
        title: locale === "ja" ? "ダウングレードを取り消せませんでした" : "Could not cancel downgrade",
        description: errorMessage
      });
      return;
    }

    setVendorBilling(response.data.billingAccount);
    const successMessage = locale === "ja"
      ? "スタンダードへの変更予約を取り消しました。現在の翻訳付きプランを継続利用できます。"
      : "Canceled the scheduled downgrade. Your translation plan remains active.";
    setVendorBillingMessage(successMessage);
    toast({
      tone: "success",
      title: locale === "ja" ? "ダウングレード予約を取り消しました" : "Downgrade canceled",
      description: successMessage
    });
  }

  async function handleOpenBillingPortal() {
    if (!activeVendorBillingCompanyId) return;
    const response = await readJson<{ url: string }>(`/api/billing/vendor-account/${activeVendorBillingCompanyId}/portal`, {
      method: "POST"
    });
    if (!response.ok || !response.data?.url) {
      setVendorBillingMessage(response.error ?? "請求ポータルを開けませんでした。");
      return;
    }
    window.location.href = response.data.url;
  }

  async function handleStartVendorCheckout() {
    if (!activeVendorCompany) return;
    setBillingActionLoading("checkout");
    setVendorBillingMessage("");
    const response = await readJson<{ url: string }>("/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: restartPlanSelection })
    });
    setBillingActionLoading("");
    if (!response.ok || !response.data?.url) {
      setVendorBillingMessage(response.error ?? "決済画面を開けませんでした。");
      return;
    }
    window.location.href = response.data.url;
  }

  async function handleSendChatMessage(raw?: string) {
    const text = (raw ?? chatInput).trim();
    if (!text) return;
    if (sessionRole !== "buyer") {
      const sessionData = await syncSessionContext();
      if (sessionData?.role !== "buyer" || !sessionData.buyer) {
        toast({
          tone: "error",
          title: locale === "ja" ? "発注企業ログインが必要です" : "Buyer login required",
          description: locale === "ja" ? "ログイン状態を確認してから、もう一度お試しください。" : "Please confirm your buyer session and try again."
        });
        setActiveSection("auth");
        return;
      }
    }

    if (!activeMatchingStep) {
      setChatMessages((prev) => [
        ...prev,
        { id: makeId("chat"), role: "assistant", content: locale === "ja" ? "このヒアリングは完了しています。新規相談を押して最初からやり直してください。" : "This intake is complete. Start a new session to begin again.", createdAt: new Date().toISOString() }
      ]);
      return;
    }

    setChatMessages((prev) => [...prev, { id: makeId("chat"), role: "user", content: text, createdAt: new Date().toISOString() }]);
    setChatInput("");
    let nextCriteria = matchingDraftCriteria;
    let nextAnswers = matchingAnswers;
    let invalidMessage = "";

    switch (activeMatchingStep.key) {
      case "projectGoal": {
        setMatchingProjectGoal(text);
        nextAnswers = { ...matchingAnswers, projectGoal: text };
        break;
      }
      case "projectTypes": {
        const normalized = text.trim().toLowerCase();
        const matchedByLabel = MATCHING_PROJECT_TYPE_OPTIONS.filter((option) => projectTypeLabel(option, locale).toLowerCase() === normalized);
        nextCriteria = { ...matchingDraftCriteria, projectTypes: matchedByLabel.length > 0 ? matchedByLabel : parseProjectTypeAnswer(text) };
        nextAnswers = { ...matchingAnswers, projectTypes: text };
        break;
      }
      case "budget": {
        const budget = parseBudgetAnswer(text);
        if (budget === null && !/未定|not sure|skip/i.test(text)) {
          invalidMessage = locale === "ja" ? "総予算は数字で入力してください。例: 3000000" : "Please enter the total budget as a number. Example: 3000000";
          break;
        }
        nextCriteria = { ...matchingDraftCriteria, budgetCeiling: budget };
        nextAnswers = { ...matchingAnswers, budget: text };
        break;
      }
      case "duration": {
        const duration = parseDurationAnswer(text);
        if (duration === null && !/未定|not sure|skip/i.test(text)) {
          invalidMessage = locale === "ja" ? "期間は月数で入力してください。例: 6" : "Please enter the duration in months. Example: 6";
          break;
        }
        nextCriteria = { ...matchingDraftCriteria, durationMonths: duration };
        nextAnswers = { ...matchingAnswers, duration: text };
        break;
      }
    }

    if (invalidMessage) {
      setChatMessages((prev) => [...prev, { id: makeId("chat"), role: "assistant", content: invalidMessage, createdAt: new Date().toISOString() }]);
      return;
    }

    setMatchingDraftCriteria(nextCriteria);
    setMatchingAnswers(nextAnswers);

    if (matchingStepIndex < matchingSteps.length - 1) {
      const nextStep = matchingSteps[matchingStepIndex + 1];
      setMatchingStepIndex((current) => current + 1);
      setChatMessages((prev) => [
        ...prev,
        { id: makeId("chat"), role: "assistant", content: nextStep.prompt, createdAt: new Date().toISOString() }
      ]);
      return;
    }

    setMatchingLoading(true);
    const response = await readJson<{ criteria: BuyerCriteria; matches: MatchResult[]; assistantMessage: string }>(
      "/api/matching/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: inferBuyerCriteriaFromIntake({
            projectGoal: activeMatchingStep.key === "projectGoal" ? text : matchingProjectGoal,
            selectedProjectTypes: nextCriteria.projectTypes,
            deliveryPreference: "",
            budgetCeiling: nextCriteria.budgetCeiling,
            durationMonths: nextCriteria.durationMonths,
            teamNeeded: null,
            englishRequired: false,
            japaneseRequired: false
          })
        })
      }
    );
    setMatchingLoading(false);
    const data = response.data;
    if (!response.ok || !data) {
      setChatMessages((prev) => [
        ...prev,
        { id: makeId("chat"), role: "assistant", content: response.error ?? (locale === "ja" ? "マッチングに失敗しました。" : "Matching failed."), createdAt: new Date().toISOString() }
      ]);
      return;
    }

    setCriteria(data.criteria);
    setMatchingStepIndex(matchingSteps.length);
    setChatMessages((prev) => [
      ...prev,
      { id: makeId("chat"), role: "assistant", content: data.assistantMessage, createdAt: new Date().toISOString() }
    ]);
  }

  function handleResetChat() {
    setCriteria(null);
    setMatchingDraftCriteria(emptyBuyerCriteria());
    setMatchingAnswers({});
    setMatchingProjectGoal("");
    setMatchingStepIndex(0);
    setChatInput("");
    setChatMessages([
      createInitialMatchingAssistantMessage(locale)
    ]);
  }

  async function handleStartThread(vendorCompanyId: string) {
    if (!activeBuyer) {
      const sessionData = await syncSessionContext();
      if (sessionData?.role !== "buyer" || !sessionData.buyer) {
        toast({
          tone: "error",
          title: locale === "ja" ? "発注企業ログインが必要です" : "Buyer login required",
          description: locale === "ja" ? "ログイン状態を確認してから、もう一度お試しください。" : "Please confirm your buyer session and try again."
        });
        setActiveSection("auth");
        return;
      }
    }
    setThreadStartingVendorId(vendorCompanyId);
    try {
      const reusableThread = threads.find((thread) => {
        if (thread.vendorCompanyId !== vendorCompanyId) return false;
        const overview = buyerThreadOverviewById.get(thread.id);
        const effectiveStatus = overview?.status ?? thread.status ?? "相談中";
        const effectiveLockedAt = overview?.lockedAt ?? thread.lockedAt ?? null;
        return effectiveStatus !== "完了" || !effectiveLockedAt;
      });

      if (reusableThread) {
        setActiveSection("buyer-messages");
        setActiveThreadId(reusableThread.id);
        setPreferredBuyerThreadId(reusableThread.id);
        setThreadMessageInfo(locale === "ja" ? "既存のメッセージスレッドを開きました。" : "Opened the existing inquiry thread.");
        return;
      }

      const response = await readJson<{ thread: BuyerThread }>("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorCompanyId })
      });
      if (!response.ok || !response.data) {
        setThreadMessageInfo(response.error ?? (locale === "ja" ? "スレッド作成に失敗しました。" : "Failed to create the thread."));
        toast({
          tone: "error",
          title: locale === "ja" ? "問い合わせを開始できませんでした" : "Could not start inquiry",
          description: response.error ?? (locale === "ja" ? "時間をおいて再度お試しください。" : "Please try again shortly.")
        });
        return;
      }
      setActiveSection("buyer-messages");
      setActiveThreadId(response.data.thread.id);
      setPreferredBuyerThreadId(response.data.thread.id);
      setThreads((current) =>
        current.some((thread) => thread.id === response.data!.thread.id) ? current : [response.data!.thread, ...current]
      );
      setThreadMessageInfo(locale === "ja" ? "メッセージスレッドを開始しました。" : "Inquiry thread started.");
      toast({
        tone: "success",
        title: locale === "ja" ? "問い合わせを開始しました" : "Inquiry started"
      });
      await refreshThreads(response.data.thread.id);
      await refreshThreadMessages(response.data.thread.id);
      await refreshBuyerDeal(response.data.thread.id);
    } finally {
      setThreadStartingVendorId("");
    }
  }

  async function handleSendThreadMessage() {
    if (!activeThreadId || !threadInput.trim()) return;
    const nextBody = threadInput.trim();
    const optimisticMessage: MessageRecord = {
      id: `temp-${makeId("msg")}`,
      threadId: activeThreadId,
      sender: "buyer",
      messageType: "text",
      body: nextBody,
      originalLanguage: "ja",
      translations: {},
      createdAt: new Date().toISOString()
    };
    setThreadSending(true);
    setPendingThreadMessages((prev) => [...prev, optimisticMessage]);
    setThreadInput("");
    const response = await readJson<{ message: MessageRecord }>(`/api/messages/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: nextBody })
    });
    if (!response.ok) {
      setPendingThreadMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setThreadInput(nextBody);
      setThreadMessageInfo(response.error ?? (locale === "ja" ? "メッセージ送信に失敗しました。" : "Failed to send the message."));
      setThreadSending(false);
      return;
    }
    if (response.data?.message) {
      setPendingThreadMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setThreadMessages((prev) =>
        prev.some((message) => message.id === response.data!.message.id) ? prev : [...prev, response.data!.message]
      );
    }
    setThreadMessageInfo("");
    setThreadSending(false);
    void refreshThreadMessages(activeThreadId);
  }

  async function handleDeleteBuyerThread(threadId = activeThreadId) {
    if (!threadId) return;
    setPendingBuyerThreadDeletionId(threadId);
  }

  async function confirmDeleteBuyerThread(threadId: string) {
    if (!threadId) return;

    setThreadDeleting(true);
    const deletingThreadId = threadId;
    const response = await readJson<{ ok: boolean }>(`/api/messages/threads/${deletingThreadId}`, {
      method: "DELETE"
    });
    setThreadDeleting(false);

    if (!response.ok) {
      const message = response.error ?? (locale === "ja" ? "チャットの削除に失敗しました。" : "Failed to delete the chat.");
      setThreadMessageInfo(message);
      toast({ tone: "error", title: locale === "ja" ? "削除できませんでした" : "Could not delete chat", description: message });
      return;
    }

    setPendingBuyerThreadDeletionId("");
    setThreads((prev) => prev.filter((thread) => thread.id !== deletingThreadId));
    setThreadMessages([]);
    setPendingThreadMessages([]);
    setActiveBuyerDeal(null);
    loadedBuyerThreadIdsRef.current.delete(deletingThreadId);
    setPreferredBuyerThreadId("");
    setActiveThreadId((prev) => {
      if (prev !== deletingThreadId) return prev;
      const nextThreads = threads.filter((thread) => thread.id !== deletingThreadId);
      return nextThreads[0]?.id || "";
    });
    setThreadMessageInfo("");
    toast({ tone: "info", title: locale === "ja" ? "チャットを削除しました" : "Chat deleted" });
    void refreshThreads();
  }

  async function handleSendVendorThreadMessage() {
    if (!activeVendorThreadId || !activeVendorCompany || !vendorThreadInput.trim()) return;
    const nextBody = vendorThreadInput.trim();
    const optimisticMessage: MessageRecord = {
      id: `temp-${makeId("msg")}`,
      threadId: activeVendorThreadId,
      sender: "vendor",
      messageType: "text",
      body: nextBody,
      originalLanguage: activeVendorCompany.preferredLanguage ?? "en",
      translations: {},
      createdAt: new Date().toISOString()
    };
    setVendorThreadSending(true);
    setPendingVendorThreadMessages((prev) => [...prev, optimisticMessage]);
    setVendorThreadInput("");
    const response = await readJson<{ message: MessageRecord }>(`/api/messages/vendor/threads/${activeVendorThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: nextBody })
    });
    if (!response.ok) {
      setPendingVendorThreadMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setVendorThreadInput(nextBody);
      setVendorThreadMessageInfo(response.error ?? (locale === "ja" ? "メッセージ送信に失敗しました。" : "Failed to send the message."));
      setVendorThreadSending(false);
      return;
    }
    if (response.data?.message) {
      setPendingVendorThreadMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setVendorThreadMessages((prev) =>
        prev.some((message) => message.id === response.data!.message.id) ? prev : [...prev, response.data!.message]
      );
    }
    setVendorThreadMessageInfo("");
    setVendorThreadSending(false);
    void refreshVendorThreadMessages(activeVendorThreadId, activeVendorCompany.id);
  }

  async function handleDeleteVendorThread(threadId = activeVendorThreadId) {
    if (!threadId) return;
    setPendingVendorThreadDeletionId(threadId);
  }

  async function confirmDeleteVendorThread(threadId: string) {
    if (!threadId) return;

    setVendorThreadDeleting(true);
    const deletingThreadId = threadId;
    const response = await readJson<{ ok: boolean }>(`/api/messages/vendor/threads/${deletingThreadId}`, {
      method: "DELETE"
    });
    setVendorThreadDeleting(false);

    if (!response.ok) {
      const message = response.error ?? (locale === "ja" ? "チャットの削除に失敗しました。" : "Failed to delete the chat.");
      setVendorThreadMessageInfo(message);
      toast({ tone: "error", title: locale === "ja" ? "削除できませんでした" : "Could not delete chat", description: message });
      return;
    }

    setPendingVendorThreadDeletionId("");
    setVendorThreads((prev) => prev.filter((thread) => thread.id !== deletingThreadId));
    setVendorThreadMessages([]);
    setPendingVendorThreadMessages([]);
    setActiveVendorDeal(null);
    loadedVendorThreadIdsRef.current.delete(deletingThreadId);
    setPreferredVendorThreadId("");
    setActiveVendorThreadId((prev) => {
      if (prev !== deletingThreadId) return prev;
      const nextThreads = vendorThreads.filter((thread) => thread.id !== deletingThreadId);
      return nextThreads[0]?.id || "";
    });
    setVendorThreadMessageInfo("");
    toast({ tone: "info", title: locale === "ja" ? "チャットを削除しました" : "Chat deleted" });
    void refreshVendorThreads();
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-10 pt-6 md:px-4 xl:px-5">
      {logoutLoading ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white p-5 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "ログアウト中..." : "Signing out..."}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {locale === "ja" ? "セッションを安全に終了しています。完了するまで他の操作はできません。" : "Ending your session safely. Other actions are blocked until this completes."}
            </p>
          </div>
        </div>
      ) : null}
      {pendingBuyerCompletionProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-700">{locale === "ja" ? "完了提案の確認" : "Confirm Completion Proposal"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "この案件を完了として提案しますか？" : "Propose this project as completed?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setPendingBuyerCompletionProposal(false)}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {locale === "ja" ? "承認されると過去案件にも反映され、このチャットは完了状態として固定されます。" : "Once accepted, this moves into past projects and the chat is locked as completed."}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === "ja" ? "完了後は元の進行状態へ戻せません。" : "After completion, it cannot be moved back to an active stage."}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingBuyerCompletionProposal(false)}>
                {locale === "ja" ? "やめる" : "Cancel"}
              </Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => void confirmBuyerCompletionProposal()}>
                {locale === "ja" ? "完了を提案する" : "Propose Completion"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingVendorCompletionProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-700">{locale === "ja" ? "完了提案の確認" : "Confirm Completion Proposal"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "この案件を完了として提案しますか？" : "Propose this project as completed?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setPendingVendorCompletionProposal(false)}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {locale === "ja" ? "承認されると過去案件にも反映され、このチャットは完了状態として固定されます。" : "Once accepted, this moves into past projects and the chat is locked as completed."}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === "ja" ? "完了後は元の進行状態へ戻せません。" : "After completion, it cannot be moved back to an active stage."}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingVendorCompletionProposal(false)}>
                {locale === "ja" ? "やめる" : "Cancel"}
              </Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => void confirmVendorCompletionProposal()}>
                {locale === "ja" ? "完了を提案する" : "Propose Completion"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingBuyerThreadDeletionId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-rose-700">{locale === "ja" ? "チャット削除の確認" : "Confirm Chat Deletion"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "このチャットを削除しますか？" : "Delete this chat?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setPendingBuyerThreadDeletionId("")}
                disabled={threadDeleting}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-slate-700">
              {locale === "ja" ? "メッセージと案件ステータスもこのスレッドから削除されます。" : "Messages and project status in this thread will also be removed."}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingBuyerThreadDeletionId("")} disabled={threadDeleting}>
                {locale === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void confirmDeleteBuyerThread(pendingBuyerThreadDeletionId)} disabled={threadDeleting}>
                {threadDeleting ? (locale === "ja" ? "削除中..." : "Deleting...") : (locale === "ja" ? "削除する" : "Delete Chat")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingVendorThreadDeletionId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-rose-700">{locale === "ja" ? "チャット削除の確認" : "Confirm Chat Deletion"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "このチャットを削除しますか？" : "Delete this chat?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setPendingVendorThreadDeletionId("")}
                disabled={vendorThreadDeleting}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-slate-700">
              {locale === "ja" ? "メッセージと案件ステータスもこのスレッドから削除されます。" : "Messages and project status in this thread will also be removed."}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingVendorThreadDeletionId("")} disabled={vendorThreadDeleting}>
                {locale === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void confirmDeleteVendorThread(pendingVendorThreadDeletionId)} disabled={vendorThreadDeleting}>
                {vendorThreadDeleting ? (locale === "ja" ? "削除中..." : "Deleting...") : (locale === "ja" ? "削除する" : "Delete Chat")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {billingCancelConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-rose-700">{locale === "ja" ? "解約の確認" : "Confirm Cancellation"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "この契約を解約予約しますか？" : "Schedule this subscription to end?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setBillingCancelConfirmOpen(false)}
                disabled={billingActionLoading === "cancel"}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {vendorBilling?.currentPeriodEnd
                  ? `${new Date(vendorBilling.currentPeriodEnd).toLocaleDateString("ja-JP")} までは現在の掲載と機能を利用できます。`
                  : locale === "ja"
                    ? "現在の契約期間が終わるまではご利用いただけます。"
                    : "Your current features remain available until the end of this billing period."}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === "ja"
                  ? "その後は掲載と有料機能が停止します。"
                  : "After that, your listing and paid features will stop."}
              </p>
            </div>
            {vendorBillingActive && vendorBilling?.plan === "translation" && !vendorDowngradeScheduled ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {locale === "ja" ? "プラン変更" : "Plan Option"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {locale === "ja" ? "解約よりもプラン変更はいかがですか？" : "Would a plan change work better than canceling?"}
                    </p>
                  </div>
                  <div className="whitespace-nowrap rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-semibold text-amber-800">
                    スタンダード ¥5,000/月
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    className="border border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                    onClick={() => {
                      promptBillingDowngrade();
                    }}
                    disabled={billingActionLoading === "downgrade" || billingActionLoading === "cancel"}
                  >
                    {billingActionLoading === "downgrade"
                      ? (locale === "ja" ? "変更を予約中..." : "Scheduling...")
                      : (locale === "ja" ? "次回更新日からスタンダードへ変更" : "Switch to Standard Next Cycle")}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setBillingCancelConfirmOpen(false)} disabled={billingActionLoading === "cancel"}>
                {locale === "ja" ? "やめる" : "Keep Subscription"}
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmBillingCancellation}
                disabled={billingActionLoading === "cancel"}
              >
                {billingActionLoading === "cancel" ? (locale === "ja" ? "解約処理中..." : "Scheduling...") : (locale === "ja" ? "解約を予約する" : "Schedule Cancellation")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {billingDowngradeConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-700">{locale === "ja" ? "プラン変更の確認" : "Confirm Plan Change"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "スタンダードへ変更しますか？" : "Switch to Standard?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setBillingDowngradeConfirmOpen(false)}
                disabled={billingActionLoading === "downgrade"}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {locale === "ja" ? "次回更新日からスタンダードプランへ切り替わります。" : "Your plan will switch to Standard at the next renewal."}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === "ja" ? "現在の翻訳付きプランは契約期間の終了までそのまま利用できます。返金はありません。" : "Your current translation plan remains active until the end of the current billing period. No refund is issued."}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setBillingDowngradeConfirmOpen(false)} disabled={billingActionLoading === "downgrade"}>
                {locale === "ja" ? "やめる" : "Keep Current Plan"}
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600"
                onClick={confirmBillingDowngrade}
                disabled={billingActionLoading === "downgrade"}
              >
                {billingActionLoading === "downgrade" ? (locale === "ja" ? "変更を予約中..." : "Scheduling...") : (locale === "ja" ? "スタンダードへ変更する" : "Schedule Downgrade")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {profileTranslationPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-cyan-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-700">{locale === "ja" ? "翻訳プレビュー" : "Translation Preview"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "日本語訳を公開プロフィールに使いますか？" : "Use this Japanese translation for your public profile?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setProfileTranslationPreviewOpen(false)}
                disabled={profileTranslationLoading}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{originalLabel(locale)}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{vendorProfileForm.summary}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{locale === "ja" ? "日本語訳" : "Japanese"}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{profileTranslationPreview}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setProfileTranslationPreviewOpen(false)}>
                {locale === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button className="bg-cyan-600 text-white hover:bg-cyan-700" onClick={applyVendorProfileTranslationPreview}>
                {locale === "ja" ? "この翻訳を使う" : "Use This Translation"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {portfolioTranslationPreviewOpen && portfolioTranslationPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-5xl rounded-[28px] border border-cyan-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-700">{locale === "ja" ? "実績翻訳プレビュー" : "Portfolio Translation Preview"}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                  {locale === "ja" ? "日本語訳をこの実績に使いますか？" : "Use this Japanese translation for this portfolio item?"}
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setPortfolioTranslationPreviewOpen(false)}
              >
                {locale === "ja" ? "閉じる" : "Close"}
              </button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{originalLabel(locale)}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "案件名:" : "Title:"}</span> {portfolioDraft?.title || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "期間:" : "Timeline:"}</span> {portfolioDraft?.durationLabel || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "予算:" : "Budget:"}</span> {portfolioDraft?.budgetLabel || "-"}</p>
                  <p className="whitespace-pre-wrap"><span className="font-semibold text-slate-900">{locale === "ja" ? "概要:" : "Summary:"}</span> {portfolioDraft?.summary || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "技術:" : "Tech:"}</span> {portfolioDraft?.technologies.join(", ") || "-"}</p>
                  <p className="whitespace-pre-wrap"><span className="font-semibold text-slate-900">{locale === "ja" ? "成果:" : "Impact:"}</span> {portfolioDraft?.businessImpact || "-"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{locale === "ja" ? "日本語訳" : "Japanese"}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-800">
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "案件名:" : "Title:"}</span> {portfolioTranslationPreview.titleJa || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "期間:" : "Timeline:"}</span> {portfolioTranslationPreview.durationLabelJa || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "予算:" : "Budget:"}</span> {portfolioTranslationPreview.budgetLabelJa || "-"}</p>
                  <p className="whitespace-pre-wrap"><span className="font-semibold text-slate-900">{locale === "ja" ? "概要:" : "Summary:"}</span> {portfolioTranslationPreview.summaryJa || "-"}</p>
                  <p><span className="font-semibold text-slate-900">{locale === "ja" ? "技術:" : "Tech:"}</span> {portfolioTranslationPreview.technologiesJa?.join(", ") || "-"}</p>
                  <p className="whitespace-pre-wrap"><span className="font-semibold text-slate-900">{locale === "ja" ? "成果:" : "Impact:"}</span> {portfolioTranslationPreview.businessImpactJa || "-"}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPortfolioTranslationPreviewOpen(false)}>
                {locale === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button className="bg-cyan-600 text-white hover:bg-cyan-700" onClick={applyPortfolioTranslationPreview}>
                {locale === "ja" ? "この翻訳を使う" : "Use This Translation"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="panel mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 py-7 text-white">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold">offshoredevelopment.com</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{locale === "ja" ? "日本企業とオフショア開発会社を、確実に結ぶ" : "Connect Japanese companies with offshore development vendors"}</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">{locale === "ja" ? "公開マーケットプレイス、開発会社登録、案件マッチング、企業間メッセージを1つに統合。" : "A single product that combines a public marketplace, vendor listings, project matching, and company-to-company messaging."}</p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="border-slate-100 bg-slate-50/80 p-3 shadow-none">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{kpi.value}</p>
              </Card>
            );
          })}
        </div>
      </header>

      {showVendorProfilePrompt ? (
        <div className="mb-5 rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-slate-900">
                {locale === "ja" ? "掲載を開始するにはプロフィール入力が必要です" : "Complete your profile to go live"}
              </p>
              <p className="mt-1 text-sm leading-7 text-slate-700">
                {locale === "ja"
                  ? "決済は完了しています。以下の項目を入力して保存すると、自動で公開ディレクトリに掲載されます。"
                  : "Billing is active. Complete the remaining items below and save your profile to publish automatically."}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {vendorProfileChecklist.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      item.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-white text-slate-700"
                    }`}
                  >
                    {item.done ? "✓ " : "• "}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setVendorProfileEditing(true);
                  setActiveSection("vendor-profile");
                }}
              >
                {locale === "ja" ? "プロフィールを更新する" : "Update Profile"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {vendorBillingNeedsRecovery ? (
        <div className="mb-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-rose-700">
                {locale === "ja" ? "掲載は停止中です" : "Listing is inactive"}
              </p>
              <p className="mt-1 text-sm leading-7 text-slate-700">
                {locale === "ja"
                  ? "サブスクリプションが終了したため、現在は公開ディレクトリへの掲載と有料機能が停止しています。請求情報を更新すると、再び掲載を再開できます。"
                  : "Your subscription has ended, so your public listing and paid features are disabled. Update billing to get listed again."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => setActiveSection("vendor-billing")}
              >
                {locale === "ja" ? "請求を更新する" : "Update Billing"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[220px,1fr] xl:gap-6">
      <aside className="panel sticky top-3 h-fit border-slate-300 bg-white/95 p-3">
        <nav className="grid gap-2">
          {visibleSections.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                activeSection === item.key
                  ? "border-blue-500 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm"
                  : isPrimaryActionSection(item.key)
                    ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 text-emerald-900 shadow-sm hover:border-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                {isPrimaryActionSection(item.key) ? <Sparkles className="h-4 w-4" /> : null}
                <span>{item.label}</span>
                </span>
                {item.key === "buyer-messages" && buyerUnreadChatCount > 0 ? (
                  <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeSection === item.key ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>
                    {buyerUnreadChatCount}
                  </span>
                ) : null}
                {item.key === "vendor-messages" && vendorUnreadChatCount > 0 ? (
                  <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeSection === item.key ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>
                    {vendorUnreadChatCount}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </nav>
        {adminEmail ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-xs font-semibold tracking-[0.14em] text-slate-500">ADMIN</p>
            <p className="mt-2 px-1 text-xs text-slate-500">{adminEmail}</p>
            <Link
              href="/app/admin"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {locale === "ja" ? "管理ダッシュボード" : "Admin Dashboard"}
            </Link>
            {sessionRole === "guest" ? (
              <Button className="mt-3 w-full" variant="ghost" onClick={handleAdminLogout} disabled={adminLogoutLoading}>
                {adminLogoutLoading ? (locale === "ja" ? "ログアウト中..." : "Signing out...") : (locale === "ja" ? "ログアウト" : "Logout")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {sessionRole === "buyer" ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-xs font-semibold tracking-[0.14em] text-slate-500">ACCOUNT</p>
            <p className="mt-2 px-1 text-sm font-semibold text-slate-900">{activeBuyer?.companyName}</p>
            <p className="mt-1 px-1 text-xs text-slate-500">{activeBuyer?.email}</p>
            <Button className="mt-3 w-full" variant="ghost" onClick={handleBuyerLogout} disabled={buyerLogoutLoading}>
              {buyerLogoutLoading ? (locale === "ja" ? "ログアウト中..." : "Signing out...") : (locale === "ja" ? "ログアウト" : "Logout")}
            </Button>
          </div>
        ) : null}
        {sessionRole === "vendor" ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-xs font-semibold tracking-[0.14em] text-slate-500">ACCOUNT</p>
            <p className="mt-2 px-1 text-sm font-semibold text-slate-900">{activeVendorCompany?.name}</p>
            <p className="mt-1 px-1 text-xs text-slate-500">{activeVendorCompany?.publicContactEmail ?? activeVendorCompany?.websiteUrl ?? ""}</p>
            <Button className="mt-3 w-full" variant="ghost" onClick={handleVendorLogout} disabled={vendorLogoutLoading}>
              {vendorLogoutLoading ? (locale === "ja" ? "ログアウト中..." : "Signing out...") : (locale === "ja" ? "ログアウト" : "Logout")}
            </Button>
          </div>
        ) : null}
      </aside>

      <div className="min-w-0">
      <AnimatePresence mode="wait">
        <motion.section
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4"
        >
          {activeSection === "marketplace" ? (
            <>
              <Card>
                <h2 className="section-title">{locale === "ja" ? "公開ディレクトリ" : "Public Directory"}</h2>
                <p className="section-subtitle">{locale === "ja" ? "発注企業はログイン不要で比較可能。技術スタックと実績カテゴリを分けて絞り込めます。" : "Buyers can compare vendors without logging in. Filter separately by tech stack and project category."}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={locale === "ja" ? "会社名・実績内容で検索" : "Search company names and project examples"} />
                  <select className="select-field" value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
                    <option value="">{locale === "ja" ? "技術スタック（すべて）" : "Tech Stack (All)"}</option>
                    {TECH_FILTER_OPTIONS.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                  <select className="select-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                    <option value="">{locale === "ja" ? "実績カテゴリ（すべて）" : "Project Category (All)"}</option>
                    {PROJECT_FILTER_OPTIONS.map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                  <select className="select-field" value={rateCap} onChange={(e) => setRateCap(e.target.value)}>
                    <option value="">{locale === "ja" ? "単価上限（指定なし）" : "Rate Cap (Any)"}</option>
                    <option value="3000">{locale === "ja" ? "¥3,000/時 以下" : "Up to ¥3,000/hr"}</option>
                    <option value="5000">{locale === "ja" ? "¥5,000/時 以下" : "Up to ¥5,000/hr"}</option>
                    <option value="8000">{locale === "ja" ? "¥8,000/時 以下" : "Up to ¥8,000/hr"}</option>
                  </select>
                </div>
              </Card>
              {pagedVisibleCompanies.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {pagedVisibleCompanies.map((company) => (
                    <div key={company.id} className="grid h-full gap-3">
                      <CompanyCard company={company} locale={locale} />
                      {sessionRole !== "vendor" ? (
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            className="h-11 w-full"
                            disabled={sessionRole !== "buyer"}
                            onClick={() => toggleFavoriteCompany(company.id)}
                          >
                            {sessionRole === "buyer"
                              ? (favoriteCompanyIds.includes(company.id) ? (locale === "ja" ? "保存済み" : "Saved") : (locale === "ja" ? "候補に保存" : "Save"))
                              : (locale === "ja" ? "ログインで保存" : "Login to Save")}
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-11 w-full"
                            disabled={sessionRole !== "buyer" || threadStartingVendorId !== ""}
                            onClick={() => {
                              if (sessionRole === "buyer") {
                                void handleStartThread(company.id);
                              }
                            }}
                          >
                            {sessionRole !== "buyer"
                              ? (locale === "ja" ? "ログインで相談" : "Login to Contact")
                              : threadStartingVendorId === company.id
                              ? (locale === "ja" ? "開始中..." : "Starting...")
                              : (locale === "ja" ? "問い合わせへ" : "Contact")}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {locale === "ja" ? "まだ公開中の開発会社がありません" : "No public vendor profiles yet"}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {locale === "ja"
                      ? "開発会社が決済を完了し、必須プロフィール項目を入力するとここに表示されます。まずは開発会社として登録し、掲載準備を進めてください。"
                      : "Vendor profiles appear here after payment and required profile completion. Register as a vendor to get listed."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Link href="/app/register/vendor" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      {locale === "ja" ? "開発会社登録へ" : "Register as Vendor"}
                    </Link>
                  </div>
                </Card>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  {locale === "ja" ? `${visibleCompanies.length}社中 ` : `${visibleCompanies.length} total, `}
                  {visibleCompanies.length === 0 ? 0 : (marketplacePage - 1) * MARKETPLACE_PAGE_SIZE + 1} -{" "}
                  {Math.min(marketplacePage * MARKETPLACE_PAGE_SIZE, visibleCompanies.length)} {locale === "ja" ? "件を表示" : "shown"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.max(1, p - 1))}
                    disabled={marketplacePage === 1}
                  >
                    {locale === "ja" ? "前へ" : "Prev"}
                  </Button>
                  <span className="text-xs font-semibold text-slate-700">
                    {marketplacePage} / {totalMarketplacePages}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setMarketplacePage((p) => Math.min(totalMarketplacePages, p + 1))}
                    disabled={marketplacePage >= totalMarketplacePages}
                  >
                    {locale === "ja" ? "次へ" : "Next"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {activeSection === "auth" ? (
            <Card className="grid gap-5 p-6 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="grid content-start gap-4">
                <div>
                  <h2 className="section-title">{locale === "ja" ? "ログイン" : "Login"}</h2>
                  <p className="section-subtitle">
                    {locale === "ja"
                      ? "発注企業・開発会社・管理者は共通フォームからログインします。ログイン後に役割に応じたワークスペースを表示します。"
                      : "Buyers, vendors, and admins use one login form. After sign-in, the workspace adapts to the user role."}
                  </p>
                </div>
                <div className="grid min-h-[86px] gap-3 sm:grid-cols-2">
                  <Field label={locale === "ja" ? "メール" : "Email"}>
                    <Input className="h-11" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </Field>
                  <Field label={locale === "ja" ? "パスワード" : "Password"}>
                    <Input className="h-11" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleUnifiedLogin} disabled={loginLoading}>
                    {loginLoading ? (locale === "ja" ? "ログイン中..." : "Signing in...") : (locale === "ja" ? "ログイン" : "Login")}
                  </Button>
                </div>
                {loginMessage ? <p className="text-sm text-slate-600">{loginMessage}</p> : null}
              </div>

              <div className="grid content-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "新規登録" : "New Registration"}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {locale === "ja"
                      ? "サインアップは役割ごとに分かれています。発注企業はすぐに利用開始でき、開発会社はアカウント作成後に決済とプロフィール設定へ進みます。"
                      : "Sign-up remains role-specific. Buyers can start immediately, and vendors proceed to billing and profile setup after account creation."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/app/register/buyer" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {locale === "ja" ? "発注企業として新規登録" : "Register as Buyer"}
                  </Link>
                  <Link href="/app/register/vendor" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {locale === "ja" ? "開発会社として新規登録" : "Register as Vendor"}
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          {activeSection.startsWith("buyer-") ? (
            <Card className="grid gap-4">
              <h2 className="section-title">{locale === "ja" ? "発注企業ワークスペース" : "Buyer Workspace"}</h2>
              {sessionHydrating ? (
                <Card className="border-blue-100 bg-blue-50 p-6">
                  <InlineLoadingState label={locale === "ja" ? "ログイン状態を確認中..." : "Checking your session..."} />
                </Card>
              ) : sessionRole !== "buyer" || !activeBuyer ? (
                <Card className="border-blue-100 bg-blue-50 p-6">
                  <p className="text-sm text-slate-700">{locale === "ja" ? "この機能は発注企業ログイン後に利用できます。" : "This area is available after buyer login."}</p>
                  <div className="mt-3"><Button onClick={() => setActiveSection("auth")}>{locale === "ja" ? "ログイン / 登録へ" : "Go to Login / Register"}</Button></div>
                </Card>
              ) : (
                <>
                  {activeSection === "buyer-overview" ? (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                    <Card className="grid gap-4 border-slate-100 bg-white p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "発注企業プロフィール" : "Buyer Profile"}</p>
                          <p className="text-sm text-slate-600">{locale === "ja" ? "保存候補、実績、過去チャットをここから把握できます。" : "Review saved vendors, project history, and recent chats."}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会社名" : "Company"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{activeBuyer.companyName}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "業種" : "Industry"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{activeBuyer.industry}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "保存候補" : "Saved Vendors"}</p>
                          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{favoriteCompanies.length}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "過去案件" : "Projects"}</p>
                          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{combinedBuyerProjects.length}</p>
                        </Card>
                      </div>
                    </Card>

                    <Card className="grid gap-3 border-slate-100 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-5 shadow-none">
                      <div className="flex items-center gap-2 text-slate-900">
                        <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                          <MessageSquareMore className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold">{locale === "ja" ? "最近のチャット概要" : "Recent Chats"}</p>
                      </div>
                      <div className="grid gap-2">
                        {buyerThreadOverview.slice(0, 3).map((thread) => (
                          <div key={thread.threadId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{thread.counterpartyLabel}</p>
                              <div className="flex items-center gap-2">
                                {thread.notificationKind ? (
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${threadNotificationTone(thread.notificationKind)}`}>
                                    {threadNotificationLabel(thread.notificationKind, locale, "buyer")}
                                  </span>
                                ) : null}
                                {(thread.unreadCount ?? 0) > 0 ? (
                                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                    {locale === "ja" ? `未読 ${thread.unreadCount}` : `${thread.unreadCount} unread`}
                                  </span>
                                ) : null}
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">{dealStatusLabel(thread.status, locale)}</span>
                                <p className="text-[11px] text-slate-500">{new Date(thread.lastMessageAt).toLocaleDateString("ja-JP")}</p>
                              </div>
                            </div>
                            <p className="mt-2 text-xs leading-6 text-slate-600">{thread.lastMessage}</p>
                          </div>
                        ))}
                        {buyerThreadOverview.length === 0 ? <p className="text-xs text-slate-500">{locale === "ja" ? "まだチャット履歴はありません。" : "No chat history yet."}</p> : null}
                      </div>
                    </Card>
                  </div>
                  ) : null}

                  {activeSection === "buyer-overview" ? (
                  <Card className="overflow-hidden border-emerald-200 p-0">
                    <div className="grid gap-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-700 px-6 py-6 text-white lg:grid-cols-[1fr,auto] lg:items-center">
                      <div>
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                          <Sparkles className="h-3.5 w-3.5" />
                          {matchingLabel(locale)}
                        </p>
                        <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold">{locale === "ja" ? "まずは案件マッチングで候補会社を絞り込む" : "Start with project matching to shortlist vendors"}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-cyan-50">
                          {locale === "ja" ? "作りたい内容、案件タイプ、想定期間、総予算を順番に整理しながら候補会社を絞り込みます。最初にここを使うのが最短です。" : "Describe what you want to build, the project type, the timeline, and the budget to narrow down the strongest vendor candidates. This is the fastest way to start."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setActiveSection("buyer-matching")}>
                          {locale === "ja" ? "案件マッチングを開く" : "Open Project Matching"}
                        </Button>
                        <Button variant="ghost" className="border border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => setActiveSection("marketplace")}>
                          {locale === "ja" ? "マーケットプレイスを見る" : "View Marketplace"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                  ) : null}

                  {activeSection === "buyer-overview" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <h3 className="font-semibold text-slate-900">{locale === "ja" ? "保存した候補会社" : "Saved Vendors"}</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {favoriteCompanies.slice(0, 4).map((company) => (
                          <div key={company.id} className="grid h-full gap-3">
                            <CompanyCard company={company} locale={locale} />
                            <div className="mt-auto grid grid-cols-2 gap-2">
                              <Button variant="ghost" className="h-11 w-full" onClick={() => toggleFavoriteCompany(company.id)}>
                                {locale === "ja" ? "保存解除" : "Remove"}
                              </Button>
                              <Button variant="secondary" className="h-11 w-full" disabled={threadStartingVendorId !== ""} onClick={() => void handleStartThread(company.id)}>
                                {threadStartingVendorId === company.id
                                  ? (locale === "ja" ? "開始中..." : "Starting...")
                                  : (locale === "ja" ? "問い合わせ開始" : "Start Inquiry")}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {favoriteCompanies.length === 0 ? <p className="text-sm text-slate-600">{locale === "ja" ? "マーケットプレイスで候補を保存すると、ここにまとまります。" : "Saved vendors from the marketplace will appear here."}</p> : null}
                      </div>
                    </Card>

                    <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-blue-700" />
                        <h3 className="font-semibold text-slate-900">{locale === "ja" ? "過去の発注案件" : "Past Projects"}</h3>
                      </div>
                      <div className="grid gap-3">
                        {combinedBuyerProjects.map((project) => (
                          <div key={project.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                              <Badge className={project.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                                {project.status === "completed" ? (locale === "ja" ? "完了" : "Completed") : (locale === "ja" ? "進行中" : "In Progress")}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">{locale === "ja" ? "委託先" : "Vendor"}: {project.vendorCompanyName} / {new Date(project.deliveredAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  ) : null}

                  {activeSection === "buyer-saved" ? (
                  <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <h3 className="font-semibold text-slate-900">{locale === "ja" ? "保存した候補会社" : "Saved Vendors"}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {favoriteCompanies.slice(0, 4).map((company) => (
                        <div key={company.id} className="grid h-full gap-3">
                          <CompanyCard company={company} locale={locale} />
                          <div className="mt-auto grid grid-cols-2 gap-2">
                            <Button variant="ghost" className="h-11 w-full" onClick={() => toggleFavoriteCompany(company.id)}>
                              {locale === "ja" ? "保存解除" : "Remove"}
                            </Button>
                            <Button variant="secondary" className="h-11 w-full" disabled={threadStartingVendorId !== ""} onClick={() => void handleStartThread(company.id)}>
                              {threadStartingVendorId === company.id
                                ? (locale === "ja" ? "開始中..." : "Starting...")
                                : (locale === "ja" ? "問い合わせ開始" : "Start Inquiry")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {favoriteCompanies.length === 0 ? <p className="text-sm text-slate-600">{locale === "ja" ? "マーケットプレイスで候補を保存すると、ここにまとまります。" : "Saved vendors from the marketplace will appear here."}</p> : null}
                    </div>
                  </Card>
                  ) : null}

                  {activeSection === "buyer-projects" ? (
                  <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-blue-700" />
                      <h3 className="font-semibold text-slate-900">{locale === "ja" ? "過去の発注案件" : "Past Projects"}</h3>
                    </div>
                    <div className="grid gap-3">
                      {buyerThreadOverviewLoading ? <InlineLoadingState label={locale === "ja" ? "過去案件を読み込み中..." : "Loading past projects..."} /> : null}
                      {!buyerThreadOverviewLoading && combinedBuyerProjects.map((project) => (
                        <div key={project.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                            <Badge className={project.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                              {project.status === "completed" ? (locale === "ja" ? "完了" : "Completed") : (locale === "ja" ? "進行中" : "In Progress")}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">{locale === "ja" ? "委託先" : "Vendor"}: {project.vendorCompanyName} / {new Date(project.deliveredAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}</p>
                        </div>
                      ))}
                      {!buyerThreadOverviewLoading && combinedBuyerProjects.length === 0 ? (
                        <p className="text-sm text-slate-600">{locale === "ja" ? "完了した案件がここに表示されます。" : "Completed projects will appear here."}</p>
                      ) : null}
                    </div>
                  </Card>
                  ) : null}

                  {activeSection === "buyer-overview" || activeSection === "buyer-matching" ? (
                  <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr] xl:items-stretch">
                    <Card className="grid h-full gap-4 border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">{matchingLabel(locale)}</h3>
                        <Button variant="ghost" onClick={handleResetChat}>{locale === "ja" ? "新規相談" : "New Session"}</Button>
                      </div>
                      <p className="text-sm text-slate-600">{locale === "ja" ? "作りたい内容、案件タイプ、想定期間、総予算を整理しながら、相性のよい会社を絞り込みます。" : "We’ll use your project type, timeline, and overall budget to narrow down the best vendor candidates."}</p>

                      <div className="max-h-[460px] min-h-[260px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-4 md:min-h-[360px]">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-6 ${msg.role === "assistant" ? "bg-blue-50 text-slate-800" : "ml-auto bg-slate-900 text-white"}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>

                      {activeMatchingStep ? (
                      <div className="grid gap-2">
                        <p className="text-xs font-semibold text-slate-500">
                          {locale === "ja"
                            ? `質問 ${matchingStepIndex + 1} / ${matchingSteps.length}`
                            : `Question ${matchingStepIndex + 1} / ${matchingSteps.length}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                        {activeMatchingStep.quickReplies.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => handleSendChatMessage(prompt)}
                            className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            {prompt}
                          </button>
                        ))}
                        </div>
                      </div>
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                          {locale === "ja" ? "ヒアリングは完了しました。必要なら新規相談でやり直せます。" : "The intake is complete. Start a new session if you want to run it again."}
                        </div>
                      )}

                      <Field label={locale === "ja" ? "回答入力" : "Answer"}>
                        <Textarea
                          rows={4}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={activeMatchingStep?.prompt ?? (locale === "ja" ? "新規相談で最初から開始してください。" : "Start a new session to begin again.")}
                        />
                      </Field>
                      <Button onClick={() => handleSendChatMessage()} disabled={matchingLoading}>
                        <Sparkles className="h-4 w-4" />
                        {matchingLoading ? (locale === "ja" ? "スコア計算中..." : "Scoring vendors...") : (activeMatchingStep ? (locale === "ja" ? "回答を送信" : "Send Answer") : (locale === "ja" ? "ヒアリング完了" : "Intake Complete"))}
                      </Button>
                    </Card>

                    <div className="grid h-full gap-4">
                      <Card className="border-slate-100 bg-white p-4">
                        <h3 className="mb-3 text-sm font-semibold text-slate-900">{locale === "ja" ? "回答済みの内容" : "Answered Questions"}</h3>
                        {matchingSummaryItems.length > 0 ? (
                          <div className="grid gap-3">
                            {matchingSummaryItems.map((item) => (
                              <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-900">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            {locale === "ja" ? "回答すると、ここに順番に表示されます。" : "Your answers will appear here as you go."}
                          </div>
                        )}
                      </Card>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {matchedResults.map(({ company, score, reasons }) => (
                          <div key={company.id} className="grid h-full gap-3">
                            <CompanyCard company={company} score={score} locale={locale} />
                            <div className="flex flex-wrap gap-1.5">
                              {reasons.slice(0, 3).map((reason) => (
                                <Badge key={`${company.id}-${reason}`} className="bg-emerald-50 text-emerald-700">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                            <Button variant="ghost" className="mt-auto h-11 w-full" disabled={threadStartingVendorId !== ""} onClick={() => void handleStartThread(company.id)}>
                              {threadStartingVendorId === company.id
                                ? (locale === "ja" ? "開始中..." : "Starting...")
                                : (locale === "ja" ? "この会社へ問い合わせ" : "Contact This Vendor")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {activeSection === "buyer-overview" || activeSection === "buyer-messages" ? (
                  <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                    <h3 className="font-semibold text-slate-900">{locale === "ja" ? "企業メッセージ" : "Messages"}</h3>
                    <div className="grid gap-3 md:grid-cols-[220px,1fr]">
                      <div className="max-h-80 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                        {threadsLoading ? <InlineLoadingState label={locale === "ja" ? "スレッドを読み込み中..." : "Loading threads..."} /> : null}
                        {!threadsLoading && groupedBuyerThreads.map((group) => (
                          <div key={group.status} className="space-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedBuyerThreadGroups((current) => ({ ...current, [group.status]: !current[group.status] }))
                              }
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${threadStatusGroupStyle(group.status).header}`}
                            >
                              <span className="flex items-center gap-2">
                                {collapsedBuyerThreadGroups[group.status] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="text-xs font-semibold tracking-[0.08em]">{threadStatusGroupLabel(group.status, locale)}</span>
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${threadStatusGroupStyle(group.status).badge}`}>
                                {group.threads.length}
                              </span>
                            </button>
                            {!collapsedBuyerThreadGroups[group.status] && group.threads.length === 0 ? (
                              <p className="px-2 py-1 text-xs text-slate-400">
                                {locale === "ja" ? "該当するチャットはありません。" : "No chats in this stage."}
                              </p>
                            ) : null}
                            {!collapsedBuyerThreadGroups[group.status] && group.threads.length > 0 ? (
                              group.threads.map((thread) => {
                                const vendorName =
                                  thread.vendorCompanyName ??
                                  companies.find((c) => c.id === thread.vendorCompanyId)?.name ??
                                  (locale === "ja" ? "不明な開発会社" : "Unknown Vendor");
                                return (
                                  <div
                                    key={thread.id}
                                    className={`flex items-center gap-1 rounded-lg px-1 py-1 ${
                                      activeThreadId === thread.id ? threadStatusGroupStyle(group.status).selected : "hover:bg-slate-100"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreferredBuyerThreadId(thread.id);
                                        setActiveThreadId(thread.id);
                                      }}
                                      className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-xs font-semibold"
                                    >
                                      <span className="block truncate">{vendorName}</span>
                                      <span className="mt-1 flex flex-wrap items-center gap-1">
                                        {thread.notificationKind ? (
                                          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${threadNotificationTone(thread.notificationKind)}`}>
                                            {threadNotificationLabel(thread.notificationKind, locale, "buyer")}
                                          </span>
                                        ) : null}
                                        {(thread.unreadCount ?? 0) > 0 ? (
                                          <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                            {locale === "ja" ? `未読 ${thread.unreadCount}` : `${thread.unreadCount} unread`}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveThreadId(thread.id);
                                        void handleDeleteBuyerThread(thread.id);
                                      }}
                                      disabled={threadDeleting}
                                      aria-label={locale === "ja" ? `${vendorName}とのチャットを削除` : `Delete chat with ${vendorName}`}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                );
                              })
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.plan ?? "basic") === "translation"
                            ? (locale === "ja"
                              ? `この開発会社は翻訳付きプランです。原文と ${languageLabel(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.preferredLanguage, locale)} 翻訳を表示します。`
                              : `This vendor uses the translation plan. The chat shows the original text plus a ${languageLabel(companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId)?.preferredLanguage, locale)} translation.`)
                            : (locale === "ja" ? "このチャットは原文表示です。" : "This chat shows original text only.")}
                        </div>
                        <div ref={buyerMessagesContainerRef} className="max-h-[520px] min-h-[300px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[380px]">
                          {threadMessagesLoading ? <InlineLoadingState label={locale === "ja" ? "メッセージを読み込み中..." : "Loading messages..."} /> : null}
                          {!threadMessagesLoading && visibleThreadMessages.map((msg) => (
                            msg.messageType === "system" ? (
                              <div key={msg.id} className="mx-auto max-w-[92%] rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900">
                                {msg.body}
                              </div>
                            ) : (
                            (() => {
                              const vendorCompany = companies.find((company) => company.id === threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyId);
                              const isBuyerMessage = msg.sender === "buyer";
                              const secondaryTranslation = translatedTextForViewer(msg, isBuyerMessage ? "company" : "ja");
                              const showSecondaryTranslation = Boolean(secondaryTranslation && secondaryTranslation !== msg.body);
                              const primaryBody = isBuyerMessage ? msg.body : (secondaryTranslation || msg.body);
                              const secondaryBody = isBuyerMessage ? secondaryTranslation : (secondaryTranslation ? msg.body : null);
                              const secondaryLabel = isBuyerMessage
                                ? chatTranslationLabel("company", msg.translations.companyLanguage ?? vendorCompany?.preferredLanguage, locale)
                                : originalLabel(locale);

                              return (
                            <div
                              key={msg.id}
                              className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                                msg.sender === "buyer" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                              }`}
                            >
                              {msg.sender !== "buyer" ? (
                                <p className="mb-1 text-[11px] font-semibold text-slate-500">
                                  {counterpartyDisplay(
                                    threads.find((thread) => thread.id === activeThreadId)?.vendorCompanyName ??
                                      vendorCompany?.name,
                                    threads.find((thread) => thread.id === activeThreadId)?.vendorContactName
                                  )}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap">{primaryBody}</p>
                              {(vendorCompany?.plan ?? "basic") === "translation" && showSecondaryTranslation && secondaryBody ? (
                                <div className={`mt-2 rounded-md px-2 py-2 text-xs ${msg.sender === "buyer" ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}>
                                <p className="mb-1 font-semibold">{secondaryLabel}</p>
                                  <p className="whitespace-pre-wrap">{secondaryBody}</p>
                                </div>
                              ) : null}
                              <p className={`mt-1 text-[10px] ${msg.sender === "buyer" ? "text-slate-300" : "text-slate-500"}`}>
                                {locale === "ja" ? "原文" : "Original"}: {msg.originalLanguage.toUpperCase()}
                              </p>
                            </div>
                              );
                            })()
                            )
                          ))}
                          {!threadMessagesLoading && visibleThreadMessages.length === 0 ? <p className="text-xs text-slate-500">{locale === "ja" ? "スレッドを選択してメッセージを開始してください。" : "Select a thread to start messaging."}</p> : null}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{locale === "ja" ? "案件ステータス" : "Project Status"}</span>
                            <Badge className={threadStatusGroupStyle(activeBuyerDeal?.status ?? "相談中").badge}>
                              {dealStatusLabel(activeBuyerDeal?.status ?? "相談中", locale)}
                            </Badge>
                            {activeBuyerDeal?.lockedAt ? (
                              <span className="text-xs text-slate-500">
                                {locale === "ja" ? "完了済みのため変更不可" : "Locked after completion"}
                              </span>
                            ) : null}
                          </div>
                          {activeBuyerDeal?.proposedStatus ? (
                            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              <p className="font-semibold">
                                {locale === "ja"
                                  ? `確認待ち: ${dealPartyLabel(activeBuyerDeal.proposedBy ?? "buyer", locale)}が「${dealStatusLabel(activeBuyerDeal.proposedStatus, locale)}」を提案`
                                  : `Pending: ${dealPartyLabel(activeBuyerDeal.proposedBy ?? "buyer", locale)} proposed ${dealStatusLabel(activeBuyerDeal.proposedStatus, locale)}`}
                              </p>
                              {activeBuyerDeal.proposedBy === "vendor" ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button className="h-9 px-3 text-xs" onClick={() => void handleBuyerDealProposalResponse("accept")}>
                                    {locale === "ja" ? "承認する" : "Accept"}
                                  </Button>
                                  <Button className="h-9 px-3 text-xs" variant="ghost" onClick={() => void handleBuyerDealProposalResponse("reject")}>
                                    {locale === "ja" ? "却下する" : "Reject"}
                                  </Button>
                                </div>
                              ) : (
                                <p className="mt-2 text-[11px] text-amber-700">{locale === "ja" ? "相手の確認待ちです。" : "Waiting for the other party."}</p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {nextDealProposalOptions(activeBuyerDeal?.status ?? "相談中").map((status) => (
                                <Button key={status} className="h-9 px-3 text-xs" variant="ghost" onClick={() => void handleBuyerDealProposal(status)} disabled={!activeThreadId}>
                                  {locale === "ja" ? `「${dealStatusLabel(status, locale)}」へ提案` : `Propose ${dealStatusLabel(status, locale)}`}
                                </Button>
                              ))}
                            </div>
                          )}
                          <p className="mt-2 text-[11px] text-slate-500">
                            {locale === "ja" ? "最終更新" : "Last updated"}: {activeBuyerDeal ? `${dealPartyLabel(activeBuyerDeal.updatedBy, locale)} / ${new Date(activeBuyerDeal.updatedAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}` : (locale === "ja" ? "未設定" : "Not set")}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-end gap-2">
                            <Textarea
                              ref={buyerThreadInputRef}
                              rows={1}
                              className="min-w-0 resize-none overflow-hidden"
                              value={threadInput}
                              onChange={(e) => setThreadInput(e.target.value)}
                              onInput={(e) => autosizeTextarea(e.currentTarget)}
                              onKeyDown={(e) => {
                                if (!isSubmitEnter(e)) return;
                                e.preventDefault();
                                void handleSendThreadMessage();
                              }}
                              placeholder={locale === "ja" ? "メッセージを入力" : "Enter a message"}
                            />
                            <Button className="min-w-20 shrink-0 whitespace-nowrap" onClick={handleSendThreadMessage} disabled={threadSending}>
                              {threadSending ? (locale === "ja" ? "送信中..." : "Sending...") : locale === "ja" ? "送信" : "Send"}
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {locale === "ja"
                              ? "改行は Enter、送信は Cmd/Ctrl + Enter"
                              : "Press Enter for a new line. Use Cmd/Ctrl + Enter to send."}
                          </p>
                        </div>
                        {threadMessageInfo ? <p className="text-xs text-slate-600">{threadMessageInfo}</p> : null}
                      </div>
                    </div>
                  </Card>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          {activeSection.startsWith("vendor-") ? (
            <div className="grid gap-4">
              <Card className="grid gap-4">
                <h2 className="section-title">{locale === "ja" ? "開発会社ワークスペース" : "Vendor Workspace"}</h2>
                {sessionRole !== "vendor" || !activeVendorCompany ? (
                  <Card className="border-blue-100 bg-blue-50 p-6">
                    <p className="text-sm text-slate-700">{locale === "ja" ? "この機能は開発会社ログイン後に利用できます。" : "This area is available after vendor login."}</p>
                    <div className="mt-3"><Button onClick={() => setActiveSection("auth")}>{locale === "ja" ? "ログイン / 登録へ" : "Go to Login / Register"}</Button></div>
                  </Card>
                ) : (
                  <>
                {activeSection === "vendor-overview" ? (
                <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                  <Card className="grid gap-4 border-slate-100 bg-white p-5 shadow-none">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "開発会社プロフィールダッシュボード" : "Vendor Profile Dashboard"}</p>
                        <p className="text-sm text-slate-600">{locale === "ja" ? "掲載状態、受注実績、過去チャット、請求状況を横断して確認できます。" : "Review listing status, delivery history, past chats, and billing in one place."}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "国" : "Country"}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{activeVendorCompany.country}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "サービス数" : "Services"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{activeVendorCompany.services.length}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "過去案件" : "Projects"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{vendorProjects.length}</p>
                      </Card>
                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会話中スレッド" : "Active Threads"}</p>
                        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{vendorThreads.length}</p>
                      </Card>
                    </div>
                  </Card>

                  <Card className="grid gap-3 border-slate-100 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-5 shadow-none">
                    <div className="flex items-center gap-2 text-slate-900">
                      <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                        <MessageSquareMore className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold">{locale === "ja" ? "過去チャット概要" : "Recent Chats"}</p>
                    </div>
                    <div className="grid gap-2">
                      {vendorThreadOverview.slice(0, 3).map((thread) => (
                        <div key={thread.threadId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{thread.counterpartyLabel}</p>
                            <div className="flex items-center gap-2">
                              {thread.notificationKind ? (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${threadNotificationTone(thread.notificationKind)}`}>
                                  {threadNotificationLabel(thread.notificationKind, locale, "vendor")}
                                </span>
                              ) : null}
                              {(thread.unreadCount ?? 0) > 0 ? (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  {locale === "ja" ? `未読 ${thread.unreadCount}` : `${thread.unreadCount} unread`}
                                </span>
                              ) : null}
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">{dealStatusLabel(thread.status, locale)}</span>
                              <p className="text-[11px] text-slate-500">{new Date(thread.lastMessageAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-600">{thread.lastMessage}</p>
                        </div>
                      ))}
                      {vendorThreadOverview.length === 0 ? <p className="text-xs text-slate-500">{locale === "ja" ? "まだ問い合わせ履歴はありません。" : "No inquiry history yet."}</p> : null}
                    </div>
                  </Card>
                </div>
                ) : null}
                {activeSection === "vendor-overview" ? (
                <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
                  <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "掲載ステータス" : "Listing Status"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          vendorIsPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : vendorBillingCancelScheduled
                              ? "bg-orange-50 text-orange-700"
                            : vendorBilling?.status === "paused"
                              ? "bg-amber-50 text-amber-700"
                              : vendorBilling?.status === "canceled"
                                ? "bg-rose-50 text-rose-700"
                                : vendorBillingActive
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                        }
                      >
                        {vendorIsPublished
                          ? (locale === "ja" ? "掲載中" : "Live")
                          : vendorBillingCancelScheduled
                            ? (locale === "ja" ? "終了予定" : "Ending Soon")
                          : vendorBilling?.status === "paused"
                            ? (locale === "ja" ? "掲載停止中" : "Paused")
                            : vendorBilling?.status === "canceled"
                              ? (locale === "ja" ? "解約済み" : "Canceled")
                              : vendorBillingActive
                                ? (locale === "ja" ? "プロフィール入力待ち" : "Profile Setup Required")
                                : (locale === "ja" ? "決済待ち" : "Payment Pending")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {vendorIsPublished
                        ? (locale === "ja"
                          ? "決済と必須プロフィール入力が揃っているため、公開プロフィールとして掲載中です。"
                          : "Your listing is live because payment is active and the required profile fields are complete.")
                        : vendorBillingCancelScheduled
                          ? locale === "ja"
                            ? `解約は予約済みです。${vendorBilling?.currentPeriodEnd ? new Date(vendorBilling.currentPeriodEnd).toLocaleDateString("ja-JP") : "現在の契約期間の終了日"}まで掲載を継続します。`
                            : `Cancellation is scheduled. Your listing will remain active until ${vendorBilling?.currentPeriodEnd ? new Date(vendorBilling.currentPeriodEnd).toLocaleDateString("en-US") : "the end of the current billing period"}.`
                        : vendorBilling?.status === "paused"
                          ? (locale === "ja"
                            ? "一時停止中のため、新規掲載は停止されています。再開すると公開状態へ戻ります。"
                            : "Your listing is paused. Restart billing to make it public again.")
                          : vendorBilling?.status === "canceled"
                            ? (locale === "ja"
                              ? "サブスクリプションが解約済みのため掲載は停止中です。再度決済すると公開を再開できます。"
                              : "Your subscription has ended, so the listing is offline. Start billing again to relist your company.")
                            : vendorBillingActive
                              ? (locale === "ja"
                                ? "決済は完了しています。会社情報を埋めると自動で掲載開始になります。"
                                : "Payment is complete. Finish the company profile and the listing will go live automatically.")
                              : (locale === "ja"
                                ? "まずは請求セクションで月額プランの決済を完了してください。"
                                : "Complete payment in the billing section first.")}
                    </p>
                    {!vendorIsPublished && vendorBillingActive && !vendorProfileReadyForPublishing ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                        {locale === "ja"
                          ? "会社紹介、技術スタック、単価、チーム人数などの必須項目が揃うと自動で公開されます。"
                          : "Your company will be published automatically once the required fields like summary, tech stack, pricing, and team size are completed."}
                      </div>
                    ) : null}
                    {!vendorBillingActive ? (
                      <p className="mt-2 text-xs text-amber-700">
                        {locale === "ja"
                          ? "決済完了後に、会社プロフィールの入力状況に応じて自動で掲載が開始されます。"
                          : "After payment, your listing will go live automatically once the company profile is complete."}
                      </p>
                    ) : null}
                  </Card>
                  <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "掲載プラン" : "Plan"}</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{locale === "ja" ? planLabel(effectiveVendorPlan) : effectiveVendorPlan === "translation" ? "Translation" : "Standard"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {locale === "ja"
                        ? `${monthlyPriceLabel(effectiveVendorPlan)} で会社情報を掲載できます。`
                        : `Your company is listed on ${monthlyPriceLabel(effectiveVendorPlan)}.`}
                    </p>
                  </Card>
                  <Card className="h-full border-slate-100 bg-slate-50 p-4 shadow-none">
                    <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "翻訳設定" : "Translation Settings"}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {effectiveVendorPlan === "translation"
                        ? locale === "ja"
                          ? `優先言語 ${languageLabel(activeVendorCompany.preferredLanguage, locale)} にチャット翻訳を表示できます。`
                          : `Chat translation is available in your preferred language: ${languageLabel(activeVendorCompany.preferredLanguage, locale)}.`
                        : locale === "ja"
                          ? "ベーシックでは通常チャットのみ利用できます。"
                          : "The standard plan includes regular chat only."}
                    </p>
                  </Card>
                </div>
                ) : null}
                {activeSection === "vendor-overview" ? (
                <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
                  <Card className="border-slate-100 bg-white p-5 shadow-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "公開プロフィールの見え方" : "Public Profile Preview"}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {locale === "ja"
                            ? "発注企業から見える会社情報のプレビューです。編集は「公開プロフィール」と「実績」で行います。"
                            : "This is how your company appears to buyers. Update it from Company Profile and Portfolio."}
                        </p>
                      </div>
                      <Link href={`/companies/${activeVendorCompany.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        {locale === "ja" ? "公開ページを見る" : "View Public Page"}
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{activeVendorCompany.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{countryLabel(activeVendorCompany.country, locale)} / {locale === "ja" ? planLabel(effectiveVendorPlan) : effectiveVendorPlan === "translation" ? "Translation" : "Standard"}</p>
                      </div>
                      <p className="text-sm leading-7 text-slate-700">{companySummaryForLocale(activeVendorCompany, locale)}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "公開連絡先" : "Public Contact"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{activeVendorCompany.publicContactEmail ?? "-"}</p>
                          <p className="mt-1 text-sm text-slate-700">{activeVendorCompany.publicContactPhone ?? "-"}</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {activeVendorCompany.websiteUrl ? (
                              <a
                                className="font-semibold text-blue-700 underline underline-offset-2"
                                href={normalizeExternalUrl(activeVendorCompany.websiteUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {activeVendorCompany.websiteUrl}
                              </a>
                            ) : (
                              "-"
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "掲載条件" : "Listing Details"}</p>
                          <p className="mt-2 text-sm text-slate-700">{locale === "ja" ? "単価目安" : "Rate Range"}: <span className="font-semibold text-slate-900">{formatYenRateRange(activeVendorCompany.minRate, activeVendorCompany.maxRate, locale)}</span></p>
                          <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "チーム人数" : "Team Size"}: <span className="font-semibold text-slate-900">{activeVendorCompany.teamSize}{locale === "ja" ? "名" : ""}</span></p>
                          <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "優先言語" : "Preferred Language"}: <span className="font-semibold text-slate-900">{languageLabel(activeVendorCompany.preferredLanguage, locale)}</span></p>
                          <p className="mt-1 text-sm text-slate-700">{locale === "ja" ? "英語" : "English"}: <span className="font-semibold text-slate-900">{levelLabelForLocale(activeVendorCompany.english, locale)}</span> / {locale === "ja" ? "日本語" : "Japanese"}: <span className="font-semibold text-slate-900">{levelLabelForLocale(activeVendorCompany.japaneseSupport, locale)}</span></p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeVendorCompany.services.map((service) => (
                          <Badge key={service}>{service}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card className="border-slate-100 bg-slate-50 p-5 shadow-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "掲載実績プレビュー" : "Portfolio Preview"}</p>
                        <p className="mt-1 text-sm text-slate-600">{locale === "ja" ? "登録済みポートフォリオを発注企業目線で確認できます。" : "Preview your saved portfolio from the buyer's perspective."}</p>
                      </div>
                      <Button variant="ghost" onClick={() => setActiveSection("vendor-projects")}>{locale === "ja" ? "実績を編集" : "Edit Portfolio"}</Button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {activeVendorCompany.portfolioProjects.slice(0, 3).map((project) => (
                        <PortfolioProjectSummaryCard key={project.id} project={project} />
                      ))}
                      {activeVendorCompany.portfolioProjects.length === 0 ? (
                        <p className="text-sm text-slate-600">{locale === "ja" ? "まだ実績はありません。「実績」セクションで案件を追加できます。" : "No portfolio items yet. You can add one from the Portfolio section."}</p>
                      ) : null}
                    </div>
                  </Card>
                </div>
                ) : null}
                {activeSection === "vendor-profile" ? (
                <Card className="border-slate-100 bg-white p-4 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{vendorIsPublished ? (locale === "ja" ? "公開中プロフィール" : "Live Profile") : (locale === "ja" ? "掲載準備中プロフィール" : "Profile Setup")}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {vendorProfileEditing
                          ? (locale === "ja" ? "必要な項目を更新して保存してください。" : "Update the fields you need and save your changes.")
                          : (locale === "ja" ? "現在のプロフィール内容を確認できます。必要なときだけ編集モードに切り替えます。" : "Review the current profile here and switch into edit mode only when needed.")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!vendorProfileEditing ? (
                        <Button onClick={() => {
                          setVendorProfileMessage("");
                          setVendorProfileEditing(true);
                        }}>
                          {locale === "ja" ? "プロフィールを編集" : "Edit Profile"}
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleSaveVendorProfile} disabled={vendorProfileSaving}>
                            {vendorProfileSaving ? (locale === "ja" ? "保存中..." : "Saving...") : (locale === "ja" ? "プロフィールを保存" : "Save Profile")}
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={vendorProfileSaving}
                            onClick={() => {
                              setVendorProfileForm(buildVendorProfileForm(activeVendorCompany, currentVendorApplication));
                              setVendorProfileMessage("");
                              setProfileTranslationMessage("");
                              setVendorProfileEditing(false);
                            }}
                          >
                            {locale === "ja" ? "キャンセル" : "Cancel"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {!vendorProfileEditing ? (
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会社名" : "Company Name"}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{vendorProfileForm.name || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "国" : "Country"}</p>
                          <p className="mt-2 text-sm text-slate-700">{countryLabel(vendorProfileForm.country, locale) || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "担当者名" : "Contact Person"}</p>
                          <p className="mt-2 text-sm text-slate-700">{vendorProfileForm.contactName || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "会社言語" : "Company Language"}</p>
                          <p className="mt-2 text-sm text-slate-700">{languageLabel(vendorProfileForm.preferredLanguage, locale)}</p>
                        </Card>
                        <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "連絡先メール" : "Contact Email"}</p>
                          <p className="mt-2 text-sm text-slate-700">{vendorProfileForm.contactEmail || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "公開メール" : "Public Email"}</p>
                          <p className="mt-2 text-sm text-slate-700">{vendorProfileForm.publicContactEmail || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "公開電話" : "Public Phone"}</p>
                          <p className="mt-2 text-sm text-slate-700">{vendorProfileForm.publicContactPhone || "-"}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-500">{locale === "ja" ? "Webサイト" : "Website"}</p>
                          {vendorProfileForm.websiteUrl ? (
                            <a
                              href={normalizeExternalUrl(vendorProfileForm.websiteUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm font-semibold text-blue-700 underline underline-offset-2"
                            >
                              {vendorProfileForm.websiteUrl}
                            </a>
                          ) : (
                            <p className="mt-2 text-sm text-slate-700">-</p>
                          )}
                        </Card>
                      </div>

                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "開発体制" : "Delivery Setup"}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "技術スタック" : "Tech Stack"}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {vendorProfileForm.servicesCsv.split(",").map((service) => service.trim()).filter(Boolean).map((service) => (
                                <Badge key={service}>{service}</Badge>
                              ))}
                              {vendorProfileForm.servicesCsv.trim() === "" ? <p className="text-sm text-slate-700">-</p> : null}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "単価目安" : "Rate Range"}</p>
                            <p className="mt-2 text-sm text-slate-700">{formatYenRateRange(Number(vendorProfileForm.minRate || 0), Number(vendorProfileForm.maxRate || 0), locale)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "チーム人数" : "Team Size"}</p>
                            <p className="mt-2 text-sm text-slate-700">{vendorProfileForm.teamSize || "-"}{locale === "ja" ? "名" : ""}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "言語対応" : "Language Support"}</p>
                            <p className="mt-2 text-sm text-slate-700">{locale === "ja" ? "英語" : "English"}: {levelLabel(vendorProfileForm.english)} / {locale === "ja" ? "日本語" : "Japanese"}: {levelLabel(vendorProfileForm.japaneseSupport)}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                        <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "会社紹介" : "Company Summary"}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{vendorProfileForm.summary || "-"}</p>
                      </Card>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" onClick={() => setActiveSection("vendor-projects")}>{locale === "ja" ? "実績を編集" : "Edit Portfolio"}</Button>
                        {vendorIsPublished ? (
                          <Link href={`/companies/${activeVendorCompany.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            {locale === "ja" ? "公開ページを確認" : "View Public Page"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label={locale === "ja" ? "会社名" : "Company Name"}>
                          <Input
                            value={vendorProfileForm.name}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "国" : "Country"}>
                          <Input
                            value={vendorProfileForm.country}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, country: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "担当者名" : "Contact Person"}>
                          <Input
                            value={vendorProfileForm.contactName}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, contactName: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "連絡先メール" : "Contact Email"}>
                          <Input
                            value={vendorProfileForm.contactEmail}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, contactEmail: e.target.value }))}
                            disabled
                          />
                        </Field>
                        <Field label={locale === "ja" ? "WebサイトURL" : "Website URL"}>
                          <Input
                            value={vendorProfileForm.websiteUrl}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                            placeholder="https://example.com"
                          />
                        </Field>
                        <Field label={locale === "ja" ? "公開メール" : "Public Email"}>
                          <Input
                            value={vendorProfileForm.publicContactEmail}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, publicContactEmail: e.target.value }))}
                            placeholder="sales@company.com"
                            disabled
                          />
                        </Field>
                        <Field label={locale === "ja" ? "公開電話" : "Public Phone"}>
                          <Input
                            value={vendorProfileForm.publicContactPhone}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, publicContactPhone: e.target.value }))}
                            placeholder="+81-3-xxxx-xxxx"
                          />
                        </Field>
                        <Field label={locale === "ja" ? "チャット優先言語" : "Preferred Chat Language"}>
                          <select
                            className="select-field"
                            value={vendorProfileForm.preferredLanguage}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, preferredLanguage: e.target.value as VendorPreferredLanguage }))}
                          >
                            <option value="en">English</option>
                            <option value="ja">Japanese</option>
                            <option value="vi">Vietnamese</option>
                            <option value="id">Indonesian</option>
                            <option value="th">Thai</option>
                            <option value="pl">Polish</option>
                            <option value="ro">Romanian</option>
                            <option value="ko">Korean</option>
                            <option value="hi">Hindi</option>
                            <option value="uk">Ukrainian</option>
                            <option value="et">Estonian</option>
                            <option value="es">Spanish</option>
                            <option value="ms">Malay</option>
                            <option value="tl">Tagalog</option>
                          </select>
                        </Field>
                        <Field label={locale === "ja" ? "技術スタック（カンマ区切り）" : "Tech Stack (comma separated)"}>
                          <Input
                            value={vendorProfileForm.servicesCsv}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, servicesCsv: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "最低単価（円/時）" : "Minimum Rate (JPY/hr)"}>
                          <Input
                            value={vendorProfileForm.minRate}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, minRate: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "最高単価（円/時）" : "Maximum Rate (JPY/hr)"}>
                          <Input
                            value={vendorProfileForm.maxRate}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, maxRate: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "チーム人数" : "Team Size"}>
                          <Input
                            value={vendorProfileForm.teamSize}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, teamSize: e.target.value }))}
                          />
                        </Field>
                        <Field label={locale === "ja" ? "英語対応レベル" : "English Support Level"}>
                          <select
                            className="select-field"
                            value={vendorProfileForm.english}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, english: e.target.value as Company["english"] }))}
                          >
                            <option value="basic">初級 / Beginner</option>
                            <option value="medium">中級 / Intermediate</option>
                            <option value="high">上級 / Advanced</option>
                            <option value="native">ネイティブ / Native</option>
                          </select>
                        </Field>
                        <Field label={locale === "ja" ? "日本語対応レベル" : "Japanese Support Level"}>
                          <select
                            className="select-field"
                            value={vendorProfileForm.japaneseSupport}
                            onChange={(e) => setVendorProfileForm((p) => ({ ...p, japaneseSupport: e.target.value as Company["japaneseSupport"] }))}
                          >
                            <option value="basic">初級 / Beginner</option>
                            <option value="medium">中級 / Intermediate</option>
                            <option value="high">上級 / Advanced</option>
                            <option value="native">ネイティブ / Native</option>
                          </select>
                        </Field>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {locale === "ja"
                          ? "連絡先メールと公開メールは登録情報として固定され、ここでは変更できません。"
                          : "Contact email and public email are fixed account fields and cannot be changed here."}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === "ja"
                          ? "翻訳付きプランでは、この設定言語を基準にプロフィール翻訳とチャット翻訳を行います。"
                          : "On the translation plan, this language is used as the base for profile and chat translation."}
                      </p>
                      <Field label={locale === "ja" ? "会社紹介" : "Company Summary"}>
                        <Textarea rows={4} value={vendorProfileForm.summary} onChange={(e) => setVendorProfileForm((p) => ({ ...p, summary: e.target.value }))} />
                      </Field>
                      {vendorBilling?.translationEnabled ? (
                        <Field label="Company Summary / 会社紹介（日本語公開用）">
                          <Textarea rows={4} value={vendorProfileForm.summaryJa} readOnly className="bg-slate-50 text-slate-700" />
                        </Field>
                      ) : null}
                      {vendorBilling?.translationEnabled ? (
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "プロフィール翻訳" : "Profile Translation"}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {locale === "ja"
                                  ? "入力した会社紹介を日本語へ翻訳し、公開プロフィール用の紹介文として保存できます。"
                                  : "Translate the company summary into Japanese and save it for the public profile."}
                              </p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">{locale === "ja" ? "翻訳付きプラン" : "Translation Plan"}</Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                              {locale === "ja" ? "翻訳先:" : "Target:"} <span className="font-semibold text-slate-900">{locale === "ja" ? "日本語" : "Japanese"}</span>
                            </div>
                            {profileTranslationLoading ? (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                                <span>{locale === "ja" ? "翻訳を準備しています" : "Preparing translation"}</span>
                              </div>
                            ) : null}
                            <Button onClick={handleTranslateVendorProfile} disabled={profileTranslationLoading}>
                              {profileTranslationLoading ? (locale === "ja" ? "翻訳中..." : "Translating...") : (locale === "ja" ? "この内容を翻訳" : "Translate This Summary")}
                            </Button>
                          </div>
                          {profileTranslationMessage ? <p className="mt-4 text-sm text-slate-700">{profileTranslationMessage}</p> : null}
                        </div>
                      ) : null}
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button variant="ghost" onClick={() => setActiveSection("vendor-projects")}>{locale === "ja" ? "実績を編集" : "Edit Portfolio"}</Button>
                        {vendorIsPublished ? (
                          <Link href={`/companies/${activeVendorCompany.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            {locale === "ja" ? "公開ページを確認" : "View Public Page"}
                          </Link>
                        ) : null}
                      </div>
                    </>
                  )}
                  {vendorProfileMessage ? <p className="mt-4 text-sm text-slate-700">{vendorProfileMessage}</p> : null}
                </Card>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-billing" ? (
                <Card className="grid gap-4 border-slate-100 bg-white p-5 shadow-none">
                  <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "アカウントと請求" : "Billing"}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {vendorIsPublished
                          ? (locale === "ja" ? "月額掲載料、契約状態、請求操作を管理します。" : "Manage your monthly listing fee, subscription status, and billing actions.")
                          : (locale === "ja" ? "決済状態を確認し、掲載開始前の準備を進めます。" : "Check payment status and complete the steps needed before your listing goes live.")}
                      </p>
                    </div>
                    <Badge
                      className={
                        vendorBillingCancelScheduled
                          ? "bg-rose-50 text-rose-700"
                          : vendorBilling?.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : vendorBilling?.status === "paused"
                              ? "bg-amber-50 text-amber-700"
                              : vendorBilling?.status === "canceled"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                      }
                    >
                      {vendorBillingCancelScheduled
                        ? (locale === "ja" ? "終了予定" : "Ending Soon")
                        : vendorBilling?.status === "active"
                        ? (locale === "ja" ? "稼働中" : "Active")
                        : vendorBilling?.status === "paused"
                          ? (locale === "ja" ? "停止中" : "Paused")
                          : vendorBilling?.status === "canceled"
                            ? (locale === "ja" ? "解約済み" : "Canceled")
                            : (locale === "ja" ? "決済待ち" : "Payment Pending")}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Plan</p>
                      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                        {effectiveVendorPlan === "translation" ? "Translation" : "Standard"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {monthlyPriceLabel(effectiveVendorPlan)}
                      </p>
                    </Card>
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Billing</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 break-all">{vendorBilling?.contactEmail ?? activeVendorCompany?.publicContactEmail ?? "-"}</p>
                      <p className="mt-2 text-xs text-slate-500">{locale === "ja" ? "請求先メール" : "Billing Email"}</p>
                    </Card>
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Translation</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {vendorBilling?.translationEnabled
                          ? (locale === "ja"
                            ? `有効 (${languageLabel(activeVendorCompany.preferredLanguage, locale)})`
                            : `Enabled (${languageLabel(activeVendorCompany.preferredLanguage, locale)})`)
                          : (locale === "ja" ? "無効" : "Disabled")}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{locale === "ja" ? "会社言語ベースで適用" : "Applied from your company language"}</p>
                    </Card>
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cycle</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {vendorBilling?.currentPeriodEnd ? new Date(vendorBilling.currentPeriodEnd).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US") : (locale === "ja" ? "未設定" : "Not Set")}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {vendorDowngradeScheduled
                          ? (locale === "ja"
                            ? `次回更新時に ${vendorBilling?.pendingPlan === "basic" ? "スタンダード" : "翻訳付き"} へ変更`
                            : `Changes to ${vendorBilling?.pendingPlan === "basic" ? "Standard" : "Translation"} at next renewal`)
                          : (locale === "ja" ? "次回の契約更新タイミング" : "Next renewal timing")}
                      </p>
                      {vendorDowngradeScheduled ? (
                        <button
                          type="button"
                          className="mt-3 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800"
                          onClick={handleCancelScheduledDowngrade}
                          disabled={billingActionLoading === "cancel_downgrade"}
                        >
                          {billingActionLoading === "cancel_downgrade"
                            ? (locale === "ja" ? "変更を取り消し中..." : "Cancelling change...")
                            : (locale === "ja" ? "この変更を取り消す" : "Cancel This Change")}
                        </button>
                      ) : null}
                    </Card>
                  </div>
                  {vendorBillingCancelScheduled ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-rose-700">{locale === "ja" ? "解約は予約済みです" : "Cancellation Scheduled"}</p>
                      <p className="mt-2 leading-7">
                        {vendorBilling?.currentPeriodEnd
                          ? (locale === "ja"
                            ? `${new Date(vendorBilling.currentPeriodEnd).toLocaleDateString("ja-JP")} までは掲載と有料機能を継続利用できます。`
                            : `Your listing and paid features remain active until ${new Date(vendorBilling.currentPeriodEnd).toLocaleDateString("en-US")}.`)
                          : (locale === "ja"
                            ? "現在の契約期間が終わるまでは掲載と有料機能を継続利用できます。"
                            : "Your listing and paid features remain active until the current billing period ends.")}
                      </p>
                      <p className="mt-2 text-slate-600">{locale === "ja" ? "継続したい場合は、「解約を取り消す」からすぐに元へ戻せます。" : "If you want to continue, you can undo the cancellation right away."}</p>
                    </div>
                  ) : null}
                  {vendorDowngradeScheduled ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-amber-700">{locale === "ja" ? "スタンダードプランへの変更を予約済みです" : "Downgrade to Standard Scheduled"}</p>
                      <p className="mt-2 leading-7">
                        {vendorBilling?.pendingPlanEffectiveAt
                          ? (locale === "ja"
                            ? `${new Date(vendorBilling.pendingPlanEffectiveAt).toLocaleDateString("ja-JP")} までは翻訳付きプランを継続利用でき、その後スタンダードへ切り替わります。`
                            : `Your translation plan remains active until ${new Date(vendorBilling.pendingPlanEffectiveAt).toLocaleDateString("en-US")}, then switches to Standard.`)
                          : (locale === "ja"
                            ? "現在の契約期間が終わるまでは翻訳付きプランを継続利用でき、その後スタンダードへ切り替わります。"
                            : "Your translation plan remains active until the current billing period ends, then switches to Standard.")}
                      </p>
                      <p className="mt-2 text-slate-600">{locale === "ja" ? "ダウングレードによる返金はありません。今の契約期間が終わるまでは現在の機能をそのまま使えます。" : "There is no refund for the downgrade. You keep your current features until the end of this billing period."}</p>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="ghost"
                          className="border border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                          onClick={handleCancelScheduledDowngrade}
                          disabled={billingActionLoading === "cancel_downgrade"}
                        >
                          {billingActionLoading === "cancel_downgrade" ? (locale === "ja" ? "取り消し中..." : "Cancelling...") : (locale === "ja" ? "変更を取り消す" : "Cancel Change")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {vendorBillingNeedsRecovery ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-rose-700">{locale === "ja" ? "掲載を再開するには決済の更新が必要です" : "Billing Update Required to Relist"}</p>
                      <p className="mt-2 leading-7">{locale === "ja" ? "現在は公開ディレクトリへの掲載と有料機能が停止しています。決済を完了すると再び掲載を再開できます。" : "Your public listing and paid features are currently stopped. Complete billing to relist your company."}</p>
                    </div>
                  ) : null}
                  {!vendorBillingActive ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "再開するプランを選択" : "Choose the Plan to Restart"}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {locale === "ja"
                              ? "停止中のアカウントは、再開時にスタンダードまたは翻訳付きのどちらでも選べます。"
                              : "When reactivating an inactive account, you can restart on either Standard or Translation."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setRestartPlanSelection("basic")}
                          className={`rounded-2xl border p-4 text-left transition ${restartPlanSelection === "basic" ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "スタンダード" : "Standard"}</p>
                          <p className="mt-1 text-xl font-bold text-slate-900">¥5,000<span className="ml-1 text-sm font-medium text-slate-500">/{locale === "ja" ? "月" : "mo"}</span></p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {locale === "ja"
                              ? "通常掲載とチャット機能を利用できます。"
                              : "Includes the standard listing and regular chat features."}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestartPlanSelection("translation")}
                          className={`rounded-2xl border p-4 text-left transition ${restartPlanSelection === "translation" ? "border-cyan-600 bg-cyan-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "翻訳付き" : "Translation"}</p>
                          <p className="mt-1 text-xl font-bold text-slate-900">¥10,000<span className="ml-1 text-sm font-medium text-slate-500">/{locale === "ja" ? "月" : "mo"}</span></p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {locale === "ja"
                              ? "通常掲載に加え、プロフィールとチャットの翻訳機能を利用できます。"
                              : "Adds profile and chat translation on top of the standard listing."}
                          </p>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {vendorBillingActive && vendorOnStandardPlan && !vendorBillingCancelScheduled ? (
                    <div className="rounded-[28px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 text-sm text-slate-700 shadow-sm">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),300px] xl:items-start">
                        <div className="max-w-3xl">
                          <p className="text-sm font-semibold text-blue-700">{locale === "ja" ? "翻訳付きプランのおすすめ" : "Recommended Upgrade"}</p>
                          <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-slate-900">{locale === "ja" ? "海外開発会社でも、日本企業に伝わる見せ方へ引き上げます。" : "Make your company easier for Japanese buyers to understand."}</h3>
                          <p className="mt-2 leading-7">{locale === "ja" ? "翻訳付きプランでは、問い合わせ時の言語ハードルを下げながら、公開プロフィールも日本企業向けに見やすく整えられます。" : "The translation plan lowers language friction in inquiries and makes your public profile easier for Japanese buyers to compare."}</p>
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                                  <Languages className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "問い合わせを日本語で受けやすく" : "Handle buyer inquiries more smoothly"}</p>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-600">{locale === "ja" ? "チャットでのやり取りを会社言語ベースで補助し、日本企業との初回コミュニケーションをスムーズにします。" : "Chat translation supports your company language and makes the first conversation with Japanese buyers much easier."}</p>
                            </div>
                            <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "比較で選ばれやすいプロフィールへ" : "A profile buyers can compare faster"}</p>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-600">{locale === "ja" ? "公開プロフィールの日本語表示で、発注企業が内容を理解しやすくなり、比較検討の段階で離脱しにくくなります。" : "A Japanese public profile helps buyers understand your company faster and reduces drop-off during comparison."}</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[24px] border border-cyan-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Translation Plan</p>
                              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">¥10,000</p>
                              <p className="text-sm text-slate-500">{locale === "ja" ? "月額 / 即時反映" : "Monthly / Immediate access"}</p>
                            </div>
                            <Badge className="bg-cyan-100 text-cyan-800">{locale === "ja" ? "おすすめ" : "Recommended"}</Badge>
                          </div>
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-600">
                            {locale === "ja" ? "現在のスタンダードプランとの差額をアップグレード時に即時請求します。" : "Only the prorated difference from your current standard plan is billed immediately."}
                          </div>
                          <Button
                            className="mt-4 w-full bg-cyan-600 text-white hover:bg-cyan-700"
                            onClick={handleUpgradeToTranslationPlan}
                            disabled={!vendorBillingActive || billingActionLoading === "upgrade"}
                          >
                            {billingActionLoading === "upgrade" ? (locale === "ja" ? "アップグレード中..." : "Upgrading...") : (locale === "ja" ? "翻訳付きプランへ変更する" : "Upgrade to Translation")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),320px]">
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract</p>
                      <div className="mt-3 grid gap-3">
                        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3">
                          <p className="text-xs font-semibold text-slate-500">{locale === "ja" ? "契約メモ" : "Contract Notes"}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {vendorBillingCancelScheduled
                              ? (locale === "ja" ? "現在の契約期間が終わるまでは掲載と有料機能を継続利用できます。" : "Your listing and paid features remain active until the current billing period ends.")
                              : vendorDowngradeScheduled
                                ? (locale === "ja" ? "ダウングレードは次回更新タイミングから反映されます。" : "The downgrade takes effect at your next renewal.")
                                : (locale === "ja" ? "プラン変更や解約は、契約状態に応じて次回更新タイミングまたは即時で反映されます。" : "Plan changes and cancellations take effect immediately or at the next renewal depending on the action.")}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Card className="border-slate-100 bg-slate-50 p-4 shadow-none">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Policy</p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        {vendorBillingCancelScheduled
                          ? (locale === "ja" ? "解約予約中は期間終了日まで掲載と機能を継続利用できます。" : "If cancellation is scheduled, your listing and features remain available until the period end date.")
                          : (locale === "ja" ? "解約すると現在の契約期間の終了日にサブスクリプションが停止します。" : "If you cancel, the subscription ends on the current period end date.")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {vendorBilling?.translationEnabled
                          ? (locale === "ja" ? "翻訳付きプランでは、翻訳機能を有効なまま利用できます。" : "Your translation features remain available while the translation plan is active.")
                          : (locale === "ja" ? "翻訳機能を使う場合は、翻訳付きプランへの変更が必要です。" : "Upgrade to the translation plan to use translation features.")}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-blue-700">
                        <Link href="/legal/terms" className="underline underline-offset-2">{locale === "ja" ? "利用規約" : "Terms"}</Link>
                        <Link href="/legal/privacy" className="underline underline-offset-2">{locale === "ja" ? "プライバシー" : "Privacy"}</Link>
                        <Link href="/legal/commercial-transactions" className="underline underline-offset-2">{locale === "ja" ? "販売条件" : "Commercial Terms"}</Link>
                      </div>
                    </Card>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "請求アクション" : "Billing Actions"}</p>
                      <p className="mt-1 text-sm text-slate-500">{locale === "ja" ? "決済方法の更新は請求ポータル、契約の変更は下の操作から行えます。" : "Use the billing portal to update payment details, and use the actions below to change your subscription."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {vendorBillingActive ? (
                      <Button variant="secondary" onClick={handleOpenBillingPortal}>{locale === "ja" ? "請求ポータル" : "Billing Portal"}</Button>
                    ) : (
                      <Button variant="secondary" onClick={handleStartVendorCheckout} disabled={billingActionLoading === "checkout"}>
                        {billingActionLoading === "checkout"
                          ? (locale === "ja" ? "決済画面を準備中..." : "Preparing checkout...")
                          : restartPlanSelection === "translation"
                            ? (locale === "ja" ? "翻訳付きで決済を開始" : "Start Translation Checkout")
                            : (locale === "ja" ? "スタンダードで決済を開始" : "Start Standard Checkout")}
                      </Button>
                    )}
                    {vendorBillingCancelScheduled ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleBillingAction("resume")}
                        disabled={!vendorBillingActive || billingActionLoading === "resume" || vendorBilling?.status === "canceled"}
                      >
                        {billingActionLoading === "resume" ? (locale === "ja" ? "更新中..." : "Updating...") : (locale === "ja" ? "解約を取り消す" : "Undo Cancellation")}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => handleBillingAction("cancel")}
                      disabled={!vendorBillingActive || vendorBillingCancelScheduled || billingActionLoading === "cancel" || vendorBilling?.status === "canceled"}
                    >
                      {billingActionLoading === "cancel" ? (locale === "ja" ? "解約処理中..." : "Scheduling cancellation...") : vendorBillingCancelScheduled ? (locale === "ja" ? "解約予約済み" : "Cancellation Scheduled") : (locale === "ja" ? "解約する" : "Cancel")}
                    </Button>
                    {vendorBillingActive && vendorBilling?.plan === "translation" && !vendorBillingCancelScheduled && !vendorDowngradeScheduled ? (
                      <Button
                        variant="ghost"
                        className="text-amber-800 hover:bg-amber-50"
                        onClick={promptBillingDowngrade}
                        disabled={billingActionLoading === "downgrade" || billingActionLoading === "cancel"}
                      >
                        {billingActionLoading === "downgrade" ? (locale === "ja" ? "変更を予約中..." : "Scheduling...") : (locale === "ja" ? "スタンダードへ変更" : "Switch to Standard")}
                      </Button>
                    ) : null}
                    </div>
                  </div>
                  {vendorBillingMessage ? <p className="text-sm text-slate-700">{vendorBillingMessage}</p> : null}
                  </>
                </Card>
                ) : null}
                {activeSection === "vendor-projects" ? (
                <Card className="grid gap-4 border-slate-100 bg-white p-5 shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-blue-700" />
                      <div>
                        <h3 className="font-semibold text-slate-900">{locale === "ja" ? "ポートフォリオ実績" : "Portfolio Projects"}</h3>
                        <p className="text-sm text-slate-600">{locale === "ja" ? "非技術者にも伝わるよう、作ったもの・期間・予算・成果を整理して掲載します。" : "Organize what was built, how long it took, the budget, and the business outcome in a client-friendly format."}</p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={addPortfolioProject} disabled={portfolioSaving || !!portfolioDeletingId}>{locale === "ja" ? "実績を追加" : "Add Project"}</Button>
                  </div>
                  {portfolioDraft ? (
                    <Card className="grid gap-3 border-blue-200 bg-blue-50 p-4 shadow-none">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {editingPortfolioProjectId && vendorProfileForm.portfolioProjects.some((project) => project.id === editingPortfolioProjectId)
                            ? (locale === "ja" ? "実績を編集中" : "Editing Project")
                            : (locale === "ja" ? "新しい実績を追加" : "Add New Project")}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button onClick={commitPortfolioDraft} disabled={portfolioSaving || !!portfolioDeletingId}>
                            {portfolioSaving ? (locale === "ja" ? "保存中..." : "Saving...") : (locale === "ja" ? "この実績を保存" : "Save This Project")}
                          </Button>
                          <Button variant="ghost" onClick={cancelPortfolioEditing} disabled={portfolioSaving || !!portfolioDeletingId}>
                            {locale === "ja" ? "キャンセル" : "Cancel"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={locale === "ja" ? "案件名" : "Project Name"}>
                          <Input value={portfolioDraft.title} onChange={(e) => updatePortfolioDraft({ title: e.target.value })} />
                        </Field>
                        <Field label={locale === "ja" ? "実績カテゴリ" : "Project Category"}>
                          <select className="select-field" value={portfolioDraft.projectType} onChange={(e) => updatePortfolioDraft({ projectType: e.target.value as PortfolioProject["projectType"] })}>
                            {PROJECT_FILTER_OPTIONS.map((option) => (
                              <option key={option} value={option}>{projectTypeLabel(option, locale)}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label={locale === "ja" ? "期間" : "Timeline"}>
                          <Input value={portfolioDraft.durationLabel} onChange={(e) => updatePortfolioDraft({ durationLabel: e.target.value })} placeholder={locale === "ja" ? "例: 4ヶ月" : "Example: 4 months"} />
                        </Field>
                        <Field label={locale === "ja" ? "予算目安" : "Budget Range"}>
                          <Input value={portfolioDraft.budgetLabel} onChange={(e) => updatePortfolioDraft({ budgetLabel: e.target.value })} placeholder={locale === "ja" ? "例: 300万〜500万円" : "Example: JPY 3M-5M"} />
                        </Field>
                      </div>
                      <Field label={locale === "ja" ? "案件概要" : "Project Summary"}>
                        <Textarea rows={3} value={portfolioDraft.summary} onChange={(e) => updatePortfolioDraft({ summary: e.target.value })} />
                      </Field>
                      <Field label={locale === "ja" ? "技術スタック（カンマ区切り）" : "Tech Stack (comma separated)"}>
                        <Input
                          value={portfolioTechnologiesInput}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setPortfolioTechnologiesInput(nextValue);
                            updatePortfolioDraft({
                              technologies: nextValue.split(",").map((item) => item.trim()).filter(Boolean)
                            });
                          }}
                        />
                      </Field>
                      <Field label={locale === "ja" ? "成果 / ビジネス効果" : "Outcome / Business Impact"}>
                        <Textarea rows={2} value={portfolioDraft.businessImpact} onChange={(e) => updatePortfolioDraft({ businessImpact: e.target.value })} />
                      </Field>
                      {vendorBilling?.translationEnabled ? (
                        <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{locale === "ja" ? "実績翻訳" : "Portfolio Translation"}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {locale === "ja"
                                  ? "この実績の日本語訳を作成し、公開プロフィール向けに保存できます。"
                                  : "Create a Japanese version of this portfolio item for the public profile."}
                              </p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">{locale === "ja" ? "翻訳付きプラン" : "Translation Plan"}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                              {locale === "ja" ? "翻訳先:" : "Target:"} <span className="font-semibold text-slate-900">{locale === "ja" ? "日本語" : "Japanese"}</span>
                            </div>
                            {portfolioTranslationLoading ? (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                                <span>{locale === "ja" ? "翻訳を準備しています" : "Preparing translation"}</span>
                              </div>
                            ) : null}
                            <Button onClick={handleTranslatePortfolioDraft} disabled={portfolioTranslationLoading || portfolioSaving}>
                              {portfolioTranslationLoading ? (locale === "ja" ? "翻訳中..." : "Translating...") : (locale === "ja" ? "この実績を翻訳" : "Translate This Project")}
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Project Name / 案件名（日本語公開用）">
                              <Input value={portfolioDraft.titleJa ?? ""} readOnly className="bg-white text-slate-700" />
                            </Field>
                            <Field label="Timeline / 期間（日本語公開用）">
                              <Input value={portfolioDraft.durationLabelJa ?? ""} readOnly className="bg-white text-slate-700" />
                            </Field>
                            <Field label="Budget / 予算（日本語公開用）">
                              <Input value={portfolioDraft.budgetLabelJa ?? ""} readOnly className="bg-white text-slate-700" />
                            </Field>
                            <Field label="Tech Stack / 技術（日本語公開用）">
                              <Input value={(portfolioDraft.technologiesJa ?? []).join(", ")} readOnly className="bg-white text-slate-700" />
                            </Field>
                          </div>
                          <Field label="Project Summary / 案件概要（日本語公開用）">
                            <Textarea rows={3} value={portfolioDraft.summaryJa ?? ""} readOnly className="bg-white text-slate-700" />
                          </Field>
                          <Field label="Outcome / 成果（日本語公開用）">
                            <Textarea rows={2} value={portfolioDraft.businessImpactJa ?? ""} readOnly className="bg-white text-slate-700" />
                          </Field>
                        </div>
                      ) : null}
                    </Card>
                  ) : null}
                  {!portfolioDraft ? (
                  <div className="grid gap-4">
                      {vendorProfileForm.portfolioProjects.map((project) => (
                        <Card key={project.id} className="grid gap-3 border-slate-200 bg-slate-50 p-4 shadow-none">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{portfolioTitleForLocale(project, locale) || (locale === "ja" ? "新しい実績" : "New Project")}</p>
                              <p className="mt-1 text-xs text-slate-500">{projectTypeLabel(project.projectType, locale)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                onClick={() => startEditingPortfolioProject(project.id)}
                                aria-label={locale === "ja" ? "編集" : "Edit"}
                                disabled={portfolioSaving || !!portfolioDeletingId}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => removePortfolioProject(project.id)}
                                aria-label={locale === "ja" ? "削除" : "Remove"}
                                disabled={portfolioSaving || (!!portfolioDeletingId && portfolioDeletingId !== project.id)}
                              >
                                {portfolioDeletingId === project.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">{portfolioSummaryForLocale(project, locale) || (locale === "ja" ? "案件概要を追加してください。" : "Add a project summary.")}</p>
                          <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
                            <p>{locale === "ja" ? "期間" : "Timeline"}: <span className="font-semibold text-slate-900">{portfolioDurationForLocale(project, locale) || "-"}</span></p>
                            <p>{locale === "ja" ? "予算目安" : "Budget"}: <span className="font-semibold text-slate-900">{portfolioBudgetForLocale(project, locale) || "-"}</span></p>
                            <p>{locale === "ja" ? "成果" : "Impact"}: <span className="font-semibold text-slate-900">{portfolioImpactForLocale(project, locale) || "-"}</span></p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {portfolioTechnologiesForLocale(project, locale).length > 0 ? (
                              portfolioTechnologiesForLocale(project, locale).map((tech) => <Badge key={`${project.id}-${tech}`}>{tech}</Badge>)
                            ) : (
                              <p className="text-xs text-slate-500">{locale === "ja" ? "技術スタック未設定" : "No tech stack yet"}</p>
                            )}
                          </div>
                        </Card>
                      ))}
                    {vendorProfileForm.portfolioProjects.length === 0 ? (
                      <p className="text-sm text-slate-600">{locale === "ja" ? "まずは代表的な案件を2〜3件登録すると、発注企業が比較しやすくなります。" : "Adding two or three representative projects makes comparison easier for buyers."}</p>
                    ) : null}
                  </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => setActiveSection("vendor-profile")} disabled={portfolioSaving || !!portfolioDeletingId}>{locale === "ja" ? "プロフィールへ戻る" : "Back to Profile"}</Button>
                  </div>
                  {!isPortfolioEditing ? (
                    <p className="text-sm text-slate-500">{locale === "ja" ? "実績の追加・編集・削除は各カードごとにそのまま保存されます。" : "Add, edit, and delete actions save directly per portfolio card."}</p>
                  ) : null}
                  {vendorProfileMessage ? <p className="text-sm text-slate-700">{vendorProfileMessage}</p> : null}
                </Card>
                ) : null}
                {activeSection === "vendor-history" ? (
                <Card className="grid gap-3 border-slate-100 bg-white p-5 shadow-none">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-emerald-700" />
                    <h3 className="font-semibold text-slate-900">{locale === "ja" ? "過去案件" : "Past Projects"}</h3>
                  </div>
                  <div className="grid gap-3">
                    {vendorThreadOverviewLoading ? <InlineLoadingState label={locale === "ja" ? "過去案件を読み込み中..." : "Loading past projects..."} /> : null}
                    {!vendorThreadOverviewLoading && combinedVendorProjects.map((project) => (
                      <div key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                          <Badge className={project.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}>
                            {project.status === "completed" ? (locale === "ja" ? "完了" : "Completed") : (locale === "ja" ? "進行中" : "In Progress")}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {locale === "ja" ? "発注企業" : "Buyer"}: {project.buyerOrgName} / {new Date(project.deliveredAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}
                        </p>
                      </div>
                    ))}
                    {!vendorThreadOverviewLoading && combinedVendorProjects.length === 0 ? (
                      <p className="text-sm text-slate-600">{locale === "ja" ? "完了した案件がここに表示されます。" : "Completed engagements will appear here."}</p>
                    ) : null}
                  </div>
                </Card>
                ) : null}
                {activeSection === "vendor-overview" || activeSection === "vendor-messages" ? (
                <Card className="grid gap-3 border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">{locale === "ja" ? "発注企業とのメッセージ" : "Messages with Buyers"}</h3>
                  {!vendorIsPublished ? (
                    <p className="text-sm text-slate-600">{locale === "ja" ? "メッセージ機能は掲載開始後に利用できます。まずは決済を完了し、必須プロフィール項目を入力してください。" : "Messaging becomes available after your listing goes live. Complete billing and the required profile fields first."}</p>
                  ) : (
                    <>
                  <div className="grid gap-3 md:grid-cols-[240px,1fr]">
                    <div className="max-h-80 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                      {vendorThreadsLoading ? <InlineLoadingState label={locale === "ja" ? "スレッドを読み込み中..." : "Loading threads..."} /> : null}
                      {!vendorThreadsLoading && groupedVendorThreads.map((group) => (
                        <div key={group.status} className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedVendorThreadGroups((current) => ({ ...current, [group.status]: !current[group.status] }))
                            }
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${threadStatusGroupStyle(group.status).header}`}
                          >
                            <span className="flex items-center gap-2">
                              {collapsedVendorThreadGroups[group.status] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span className="text-xs font-semibold tracking-[0.08em]">{threadStatusGroupLabel(group.status, locale)}</span>
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${threadStatusGroupStyle(group.status).badge}`}>
                              {group.threads.length}
                            </span>
                          </button>
                          {!collapsedVendorThreadGroups[group.status] && group.threads.length === 0 ? (
                            <p className="px-2 py-1 text-xs text-slate-400">
                              {locale === "ja" ? "該当するチャットはありません。" : "No chats in this stage."}
                            </p>
                          ) : null}
                          {!collapsedVendorThreadGroups[group.status] && group.threads.length > 0 ? (
                            group.threads.map((thread) => (
                              <div
                                key={thread.id}
                                className={`flex items-center gap-1 rounded-lg px-1 py-1 ${
                                  activeVendorThreadId === thread.id ? threadStatusGroupStyle(group.status).selected : "hover:bg-slate-100"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreferredVendorThreadId(thread.id);
                                    setActiveVendorThreadId(thread.id);
                                  }}
                                  className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-xs font-semibold"
                                >
                                  <span className="block truncate">{thread.buyerCompanyName ?? thread.buyerEmail}</span>
                                  <span className="mt-1 flex flex-wrap items-center gap-1">
                                    {thread.notificationKind ? (
                                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${threadNotificationTone(thread.notificationKind)}`}>
                                        {threadNotificationLabel(thread.notificationKind, locale, "vendor")}
                                      </span>
                                    ) : null}
                                    {(thread.unreadCount ?? 0) > 0 ? (
                                      <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                        {locale === "ja" ? `未読 ${thread.unreadCount}` : `${thread.unreadCount} unread`}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveVendorThreadId(thread.id);
                                    void handleDeleteVendorThread(thread.id);
                                  }}
                                  disabled={vendorThreadDeleting}
                                  aria-label={locale === "ja" ? `${thread.buyerCompanyName ?? thread.buyerEmail}とのチャットを削除` : `Delete chat with ${thread.buyerCompanyName ?? thread.buyerEmail}`}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          ) : null}
                        </div>
                      ))}
                      {!vendorThreadsLoading && vendorThreads.length === 0 ? <p className="px-2 py-1 text-xs text-slate-500">{locale === "ja" ? "まだ問い合わせはありません。" : "No inquiries yet."}</p> : null}
                    </div>

                    <div className="grid gap-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {vendorBilling?.translationEnabled
                          ? (locale === "ja"
                            ? `翻訳付きプランが有効です。原文と ${languageLabel(activeVendorCompany.preferredLanguage, locale)} / 日本語の翻訳表示を行います。`
                            : `Translation is enabled for this vendor. The chat shows the original text plus ${languageLabel(activeVendorCompany.preferredLanguage, locale)} and Japanese translations.`)
                          : (locale === "ja" ? "このチャットは原文表示です。" : "This chat shows original text only.")}
                      </div>
                      <div ref={vendorMessagesContainerRef} className="max-h-[520px] min-h-[300px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 md:min-h-[380px]">
                        {vendorThreadMessagesLoading ? <InlineLoadingState label={locale === "ja" ? "メッセージを読み込み中..." : "Loading messages..."} /> : null}
                        {!vendorThreadMessagesLoading && visibleVendorThreadMessages.map((msg) => (
                          msg.messageType === "system" ? (
                            <div key={msg.id} className="mx-auto max-w-[92%] rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900">
                              {msg.body}
                            </div>
                          ) : (
                          (() => {
                            const isVendorMessage = msg.sender === "vendor";
                            const secondaryTranslation = translatedTextForViewer(msg, isVendorMessage ? "ja" : "company");
                            const showSecondaryTranslation = Boolean(secondaryTranslation && secondaryTranslation !== msg.body);
                            const primaryBody = isVendorMessage ? msg.body : (secondaryTranslation || msg.body);
                            const secondaryBody = isVendorMessage ? secondaryTranslation : (secondaryTranslation ? msg.body : null);
                            const secondaryLabel = isVendorMessage
                              ? chatTranslationLabel("ja", activeVendorCompany.preferredLanguage, locale)
                              : originalLabel(locale);

                            return (
                          <div
                            key={msg.id}
                            className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${
                              msg.sender === "vendor" ? "ml-auto bg-slate-900 text-white" : "bg-blue-50 text-slate-800"
                            }`}
                          >
                            {msg.sender !== "vendor" ? (
                              <p className="mb-1 text-[11px] font-semibold text-slate-500">
                                {counterpartyDisplay(
                                  vendorThreads.find((thread) => thread.id === activeVendorThreadId)?.buyerCompanyName ??
                                    vendorThreads.find((thread) => thread.id === activeVendorThreadId)?.buyerEmail,
                                  vendorThreads.find((thread) => thread.id === activeVendorThreadId)?.buyerContactName
                                )}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap">{primaryBody}</p>
                            {vendorBilling?.translationEnabled && showSecondaryTranslation && secondaryBody ? (
                              <div className={`mt-2 rounded-md px-2 py-2 text-xs ${msg.sender === "vendor" ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}>
                                <p className="mb-1 font-semibold">{secondaryLabel}</p>
                                <p className="whitespace-pre-wrap">{secondaryBody}</p>
                              </div>
                            ) : null}
                            <p className={`mt-1 text-[10px] ${msg.sender === "vendor" ? "text-slate-300" : "text-slate-500"}`}>
                              {locale === "ja" ? "原文" : "Original"}: {msg.originalLanguage.toUpperCase()}
                            </p>
                          </div>
                            );
                          })()
                          )
                        ))}
                        {!vendorThreadMessagesLoading && visibleVendorThreadMessages.length === 0 ? <p className="text-xs text-slate-500">{locale === "ja" ? "スレッドを選択して返信できます。" : "Select a thread to reply."}</p> : null}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{locale === "ja" ? "案件ステータス" : "Project Status"}</span>
                          <Badge className={threadStatusGroupStyle(activeVendorDeal?.status ?? "相談中").badge}>
                            {dealStatusLabel(activeVendorDeal?.status ?? "相談中", locale)}
                          </Badge>
                          {activeVendorDeal?.lockedAt ? (
                            <span className="text-xs text-slate-500">
                              {locale === "ja" ? "完了済みのため変更不可" : "Locked after completion"}
                            </span>
                          ) : null}
                        </div>
                        {activeVendorDeal?.proposedStatus ? (
                          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <p className="font-semibold">
                              {locale === "ja"
                                ? `確認待ち: ${dealPartyLabel(activeVendorDeal.proposedBy ?? "buyer", locale)}が「${dealStatusLabel(activeVendorDeal.proposedStatus, locale)}」を提案`
                                : `Pending: ${dealPartyLabel(activeVendorDeal.proposedBy ?? "buyer", locale)} proposed ${dealStatusLabel(activeVendorDeal.proposedStatus, locale)}`}
                            </p>
                            {activeVendorDeal.proposedBy === "buyer" ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button className="h-9 px-3 text-xs" onClick={() => void handleVendorDealProposalResponse("accept")}>
                                  {locale === "ja" ? "承認する" : "Accept"}
                                </Button>
                                <Button className="h-9 px-3 text-xs" variant="ghost" onClick={() => void handleVendorDealProposalResponse("reject")}>
                                  {locale === "ja" ? "却下する" : "Reject"}
                                </Button>
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-amber-700">{locale === "ja" ? "相手の確認待ちです。" : "Waiting for the other party."}</p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {nextDealProposalOptions(activeVendorDeal?.status ?? "相談中").map((status) => (
                              <Button key={status} className="h-9 px-3 text-xs" variant="ghost" onClick={() => void handleVendorDealProposal(status)} disabled={!activeVendorThreadId}>
                                {locale === "ja" ? `「${dealStatusLabel(status, locale)}」へ提案` : `Propose ${dealStatusLabel(status, locale)}`}
                              </Button>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-slate-500">
                          {locale === "ja" ? "最終更新" : "Last updated"}: {activeVendorDeal ? `${dealPartyLabel(activeVendorDeal.updatedBy, locale)} / ${new Date(activeVendorDeal.updatedAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}` : (locale === "ja" ? "未設定" : "Not set")}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-end gap-2">
                          <Textarea
                            ref={vendorThreadInputRef}
                            rows={1}
                            className="min-w-0 resize-none overflow-hidden"
                            value={vendorThreadInput}
                            onChange={(e) => setVendorThreadInput(e.target.value)}
                            onInput={(e) => autosizeTextarea(e.currentTarget)}
                            onKeyDown={(e) => {
                                if (!isSubmitEnter(e)) return;
                                e.preventDefault();
                              void handleSendVendorThreadMessage();
                            }}
                            placeholder={locale === "ja" ? "返信メッセージを入力" : "Enter a reply"}
                          />
                          <Button className="min-w-20 shrink-0 whitespace-nowrap" onClick={handleSendVendorThreadMessage} disabled={vendorThreadSending}>
                            {vendorThreadSending ? (locale === "ja" ? "送信中..." : "Sending...") : (locale === "ja" ? "送信" : "Send")}
                          </Button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {locale === "ja"
                            ? "改行は Enter、送信は Cmd/Ctrl + Enter"
                            : "Press Enter for a new line. Use Cmd/Ctrl + Enter to send."}
                        </p>
                      </div>
                      {vendorThreadMessageInfo ? <p className="text-xs text-slate-600">{vendorThreadMessageInfo}</p> : null}
                    </div>
                  </div>
                    </>
                  )}
                </Card>
                ) : null}
                </>
                )}
              </Card>
            </div>
          ) : null}

        </motion.section>
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
