export type PlanKey = "basic" | "translation";
export type VendorPreferredLanguage = "en" | "ja" | "vi" | "id" | "th" | "pl" | "ro" | "ko" | "hi" | "uk" | "et" | "es" | "ms" | "tl";
export type PortfolioProjectType =
  | "Webサービス"
  | "EC / マーケットプレイス"
  | "社内システム / 業務改善"
  | "モバイルアプリ"
  | "SaaS / 業務ツール"
  | "ERP / 基幹連携"
  | "AI / データ活用"
  | "VR / AR / 3D"
  | "保守 / 運用改善";

export type PortfolioProject = {
  id: string;
  title: string;
  projectType: PortfolioProjectType;
  summary: string;
  durationLabel: string;
  budgetLabel: string;
  technologies: string[];
  businessImpact: string;
};

export type Company = {
  id: string;
  name: string;
  country: string;
  plan: PlanKey;
  websiteUrl?: string;
  publicContactEmail?: string;
  publicContactPhone?: string;
  preferredLanguage?: VendorPreferredLanguage;
  summary: string;
  services: string[];
  portfolioProjects: PortfolioProject[];
  minRate: number;
  maxRate: number;
  teamSize: number;
  english: "basic" | "medium" | "high";
  japaneseSupport: "basic" | "medium" | "high";
};

export type PlanSetting = {
  label: string;
  jpLabel: string;
  monthlyFeeJpy: number;
  rankBonus: number;
  slotWeight: number;
  monthlyMatchExposure: string;
  support: string;
};

export type BoostPackage = {
  id: string;
  name: string;
  days: number;
  scoreBonus: number;
  priceJpy: number;
  description: string;
};

export type BoostState = Record<string, { endsAt: string; bonus: number }>;

export type BuyerCriteria = {
  technologies: string[];
  budgetCeiling: number | null;
  teamNeeded: number | null;
  englishRequired: boolean;
  japaneseRequired: boolean;
  durationMonths: number | null;
};

export type VendorApplicationStatus = "pending" | "approved" | "rejected";

export type VendorApplication = {
  id: string;
  company: Company;
  contactName: string;
  contactEmail: string;
  status: VendorApplicationStatus;
  submittedAt: string;
  reviewNote?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
};

export type BuyerOrganization = {
  id: string;
  companyName: string;
  industry: string;
  contactName: string;
  email: string;
  password: string;
};

export type MessageLang = "original" | "ja" | "en" | "company";

export type MessageTranslations = {
  ja?: string;
  en?: string;
  company?: string;
};

export type MessageRecord = {
  id: string;
  threadId: string;
  sender: "buyer" | "vendor";
  body: string;
  originalLanguage: string;
  translations: MessageTranslations;
  createdAt: string;
};

export type MatchResult = {
  company: Company;
  score: number;
  reasons: string[];
};

export type BillingStatus = "pending_checkout" | "active" | "paused" | "canceled";

export type VendorBillingAccount = {
  companyId: string;
  applicationId?: string;
  companyName: string;
  contactEmail: string;
  plan: PlanKey;
  translationEnabled: boolean;
  monthlyPriceJpy: number;
  status: BillingStatus;
  termsAcceptedAt?: string;
  termsVersion?: string;
  currentPeriodEnd?: string;
  pauseRequestedAt?: string;
  canceledAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

export type ProjectHistoryRecord = {
  id: string;
  buyerOrgId: string;
  buyerOrgName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  title: string;
  summary: string;
  technologies: string[];
  status: "completed" | "active";
  deliveredAt: string;
};

export type DealStatus = "相談中" | "進行中" | "完了";

export type DealRecord = {
  threadId: string;
  title?: string;
  status: DealStatus;
  updatedAt: string;
  updatedBy: "buyer" | "vendor";
};
