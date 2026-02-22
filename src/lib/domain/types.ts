export type PlanKey = "developer" | "pro" | "business" | "enterprise";

export type Company = {
  id: string;
  name: string;
  country: string;
  plan: PlanKey;
  websiteUrl?: string;
  publicContactEmail?: string;
  publicContactPhone?: string;
  summary: string;
  services: string[];
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
};

export type BuyerOrganization = {
  id: string;
  companyName: string;
  industry: string;
  contactName: string;
  email: string;
  password: string;
};
