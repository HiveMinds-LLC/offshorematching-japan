import { PROJECT_FILTER_OPTIONS, SERVICE_CATEGORIES } from "@/lib/domain/service-catalog";
import type { BuyerCriteria, Company, MatchResult, PortfolioProjectType } from "@/lib/domain/types";

const NORMALIZED_SERVICE_OPTIONS = Array.from(
  new Set([
    ...SERVICE_CATEGORIES.flatMap((category) => category.services),
    "React",
    "Node.js",
    "Java",
    "Python",
    "Go",
    "Vue",
    "AWS",
    "DevOps",
    "Mobile",
    "Flutter",
    "ERP/CRM",
    "Security",
    "Data Engineering",
    "SRE",
    "Blockchain",
    "Unity",
    "Unreal",
    "Legacy Modernization",
    "基幹システム",
    "社内業務ソフト"
  ])
);

const YES_WORDS = ["yes", "y", "必要", "はい", "required", "need", "needed", "must", "あり"];
const NO_WORDS = ["no", "n", "不要", "いいえ", "not needed", "none", "なし"];

export const MATCHING_SERVICE_OPTIONS = NORMALIZED_SERVICE_OPTIONS;
export const MATCHING_PROJECT_TYPE_OPTIONS = [...PROJECT_FILTER_OPTIONS];
export const MATCHING_DELIVERY_OPTIONS = ["Web browser", "Mobile app", "Internal operations", "Web + Mobile", "Existing system integration"] as const;

export function emptyBuyerCriteria(): BuyerCriteria {
  return {
    technologies: [],
    projectTypes: [],
    budgetCeiling: null,
    teamNeeded: null,
    englishRequired: false,
    japaneseRequired: false,
    durationMonths: null
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function containsWord(source: string, candidates: string[]) {
  return candidates.some((candidate) => source.includes(candidate));
}

function containsPattern(source: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(source));
}

export function parseYesNoAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized) return null;
  if (containsWord(normalized, YES_WORDS)) return true;
  if (containsWord(normalized, NO_WORDS)) return false;
  return null;
}

export function parseTechnologyAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized || containsWord(normalized, ["skip", "later", "not sure", "未定", "なし"])) return [] as string[];

  const hits = NORMALIZED_SERVICE_OPTIONS.filter((option) => normalized.includes(option.toLowerCase()));
  if (hits.length > 0) return hits;

  return input
    .split(/[,/\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseProjectTypeAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized || containsWord(normalized, ["skip", "later", "not sure", "未定", "なし"])) return [] as PortfolioProjectType[];
  return PROJECT_FILTER_OPTIONS.filter((option) => normalized.includes(option.toLowerCase())) as PortfolioProjectType[];
}

export function parseBudgetAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized || containsWord(normalized, ["skip", "later", "not sure", "未定", "相談", "なし"])) return null;

  const fullWidthNormalized = normalized.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  const numbers = Array.from(fullWidthNormalized.matchAll(/(\d[\d,]*)/g)).map((match) => Number(match[1].replace(/,/g, "")));
  if (numbers.length === 0) return null;

  const usesManUnit = fullWidthNormalized.includes("万");
  if (numbers.length >= 2) {
    const upper = numbers[numbers.length - 1];
    return usesManUnit ? upper * 10000 : upper;
  }

  const amount = numbers[0];
  if (usesManUnit) {
    return amount * 10000;
  }

  return amount;
}

export function parseTeamSizeAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized || containsWord(normalized, ["skip", "later", "not sure", "未定", "なし"])) return null;
  const match = normalized.match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

export function parseDurationAnswer(input: string) {
  const normalized = normalizeText(input);
  if (!normalized || containsWord(normalized, ["ongoing", "continuous", "unsure", "未定", "なし"])) return null;
  const match = normalized.match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferProjectTypesFromGoal(projectGoal: string, selectedProjectTypes: PortfolioProjectType[], deliveryPreference: string) {
  const normalized = normalizeText(projectGoal);
  const inferred = [...selectedProjectTypes];

  const pushType = (projectType: PortfolioProjectType) => {
    if (!inferred.includes(projectType)) inferred.push(projectType);
  };

  if (containsPattern(normalized, [/\bec\b/, /\be-?commerce\b/, /\bshop\b/, /\bstore\b/, /\bmarketplace\b/])) {
    pushType("EC / マーケットプレイス");
  }
  if (containsPattern(normalized, [/\binternal\b/, /\bback office\b/, /\bworkflow\b/, /\bapproval\b/]) || normalized.includes("社内") || normalized.includes("業務")) {
    pushType("社内システム / 業務改善");
  }
  if (containsPattern(normalized, [/\bsaas\b/, /\bportal\b/, /\bdashboards?\b/, /\btools?\b/])) {
    pushType("SaaS / 業務ツール");
  }
  if (containsPattern(normalized, [/\berp\b/, /\bcrm\b/, /\bintegration\b/, /\bsap\b/, /\boracle\b/])) {
    pushType("ERP / 基幹連携");
  }
  if (containsPattern(normalized, [/\bai\b/, /\banalytics?\b/, /\bdata\b/, /\bmachine learning\b/])) {
    pushType("AI / データ活用");
  }
  if (containsPattern(normalized, [/\bvr\b/, /\bar\b/, /\b3d\b/])) {
    pushType("VR / AR / 3D");
  }
  if (containsPattern(normalized, [/\bmaintenance\b/, /\bmigration\b/, /\bmodernization\b/, /\brefactor\b/]) || normalized.includes("保守") || normalized.includes("運用")) {
    pushType("保守 / 運用改善");
  }
  if (containsPattern(normalized, [/\bmobile\b/, /\bios\b/, /\bandroid\b/]) || deliveryPreference === "mobile" || deliveryPreference === "both") {
    pushType("モバイルアプリ");
  }
  if (deliveryPreference === "web" || deliveryPreference === "both") {
    pushType("Webサービス");
  }

  if (inferred.length === 0) {
    pushType(deliveryPreference === "mobile" ? "モバイルアプリ" : "Webサービス");
  }

  return inferred;
}

function inferTechnologiesFromIntake(projectGoal: string, projectTypes: PortfolioProjectType[], deliveryPreference: string) {
  const normalized = normalizeText(projectGoal);
  const services: string[] = [];

  const addServices = (...values: string[]) => {
    services.push(...values);
  };

  if (deliveryPreference === "web") addServices("React", "Next.js", "Node.js");
  if (deliveryPreference === "mobile") addServices("Mobile", "Flutter", "React Native");
  if (deliveryPreference === "both") addServices("React", "Next.js", "Node.js", "Mobile", "Flutter", "React Native");
  if (deliveryPreference === "internal") addServices("社内業務ソフト", "基幹システム", "ERP/CRM", "Laravel", "Django", "Python");
  if (deliveryPreference === "integration") addServices("ERP/CRM", "Data Engineering", "AWS");

  for (const projectType of projectTypes) {
    if (projectType === "Webサービス") addServices("React", "Next.js", "Node.js", "AWS");
    if (projectType === "EC / マーケットプレイス") addServices("React", "Next.js", "Node.js", "AWS", "Security");
    if (projectType === "社内システム / 業務改善") addServices("社内業務ソフト", "基幹システム", "ERP/CRM", "Laravel", "Django", "Python");
    if (projectType === "モバイルアプリ") addServices("Mobile", "Flutter", "React Native");
    if (projectType === "SaaS / 業務ツール") addServices("React", "Node.js", "AWS", "Security");
    if (projectType === "ERP / 基幹連携") addServices("ERP/CRM", "Data Engineering", "Legacy Modernization");
    if (projectType === "AI / データ活用") addServices("Python", "Data Engineering", "AWS");
    if (projectType === "VR / AR / 3D") addServices("VR/AR", "Unity", "Unreal");
    if (projectType === "保守 / 運用改善") addServices("DevOps", "SRE", "Security", "Legacy Modernization");
  }

  if (normalized.includes("aws") || normalized.includes("cloud")) addServices("AWS", "DevOps");
  if (normalized.includes("security")) addServices("Security");
  if (normalized.includes("data") || normalized.includes("analytics")) addServices("Data Engineering", "Python");
  if (normalized.includes("legacy") || normalized.includes("migration")) addServices("Legacy Modernization", "DevOps");

  return uniqueStrings(services);
}

export function inferBuyerCriteriaFromIntake(input: {
  projectGoal: string;
  selectedProjectTypes: PortfolioProjectType[];
  deliveryPreference: "web" | "mobile" | "both" | "internal" | "integration" | "";
  budgetCeiling: number | null;
  teamNeeded: number | null;
  durationMonths: number | null;
  englishRequired: boolean;
  japaneseRequired: boolean;
}): BuyerCriteria {
  const projectTypes = inferProjectTypesFromGoal(input.projectGoal, input.selectedProjectTypes, input.deliveryPreference);
  const technologies = inferTechnologiesFromIntake(input.projectGoal, projectTypes, input.deliveryPreference);

  return {
    technologies,
    projectTypes,
    budgetCeiling: input.budgetCeiling,
    teamNeeded: input.teamNeeded,
    englishRequired: input.englishRequired,
    japaneseRequired: input.japaneseRequired,
    durationMonths: input.durationMonths
  };
}

function normalizeServiceLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, "");
}

function serviceMatchesCriterion(companyService: string, criterion: string) {
  const service = normalizeServiceLabel(companyService);
  const needle = normalizeServiceLabel(criterion);
  if (!service || !needle) return false;

  const aliases: Record<string, string[]> = {
    aws: ["aws", "cloud"],
    cloud: ["aws", "cloud"],
    mobile: ["mobile", "flutter", "reactnative"],
    react: ["react", "nextjs"],
    nextjs: ["nextjs"],
    reactnative: ["reactnative"],
    nodejs: ["nodejs"],
    erpcrm: ["erpcrm"],
    dataengineering: ["dataengineering"],
    security: ["security"],
    legacymodernization: ["legacymodernization"],
    vrar: ["vrar", "unity", "unreal"],
    unity: ["unity"],
    unreal: ["unreal"]
  };

  const accepted = aliases[needle] ?? [needle];
  if (accepted.includes(service)) return true;

  // Japanese service labels are longer descriptors, so substring matching is useful there.
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(needle) && (service.includes(needle) || needle.includes(service));
}

function scoreTechnologyFit(company: Company, criteria: BuyerCriteria, reasons: string[]) {
  if (criteria.technologies.length === 0) return 0;

  const companyServices = company.services;
  const matches = criteria.technologies.filter((needle) => {
    return companyServices.some((service) => serviceMatchesCriterion(service, needle));
  }).length;

  if (matches === 0) return -24;

  const score = Math.min(40, matches * 14);
  reasons.push(`技術一致 ${matches}件`);
  return score;
}

function scoreProjectTypeFit(company: Company, criteria: BuyerCriteria, reasons: string[]) {
  if (criteria.projectTypes.length === 0) return 0;
  const portfolioTypes = new Set(company.portfolioProjects.map((project) => project.projectType));
  const matches = criteria.projectTypes.filter((type) => portfolioTypes.has(type));
  if (matches.length === 0) return -10;
  reasons.push("同種案件の実績あり");
  return Math.min(
    22,
    matches.reduce((score, type) => {
      if (type === "Webサービス") return score + 6;
      if (type === "モバイルアプリ") return score + 10;
      return score + 18;
    }, 0)
  );
}

function scoreBudgetFit(company: Company, criteria: BuyerCriteria, reasons: string[]) {
  if (criteria.budgetCeiling === null) return 0;
  if (company.minRate <= criteria.budgetCeiling && company.maxRate <= criteria.budgetCeiling) {
    reasons.push("予算条件に収まる");
    return 18;
  }
  if (company.minRate <= criteria.budgetCeiling) {
    reasons.push("予算帯に一部収まる");
    return 8;
  }
  return -18;
}

function scoreTeamFit(company: Company, criteria: BuyerCriteria, reasons: string[]) {
  if (criteria.teamNeeded === null) return 0;
  if (company.teamSize >= criteria.teamNeeded) {
    reasons.push("必要人数を満たす");
    return 12;
  }
  if (company.teamSize >= Math.max(1, Math.ceil(criteria.teamNeeded * 0.6))) {
    reasons.push("小規模体制で対応可能");
    return 4;
  }
  return -12;
}

function scoreDurationFit(criteria: BuyerCriteria) {
  if (criteria.durationMonths === null) return 0;
  if (criteria.durationMonths >= 6) return 6;
  if (criteria.durationMonths >= 3) return 4;
  return 2;
}

function scoreLanguageFit(company: Company, criteria: BuyerCriteria, reasons: string[]) {
  let score = 0;
  if (criteria.englishRequired) {
    if (company.english === "native" || company.english === "high") {
      score += 10;
      reasons.push("英語対応が強い");
    } else if (company.english === "medium") {
      score += 4;
    } else {
      score -= 10;
    }
  }

  if (criteria.japaneseRequired) {
    if (company.japaneseSupport === "native" || company.japaneseSupport === "high") {
      score += 10;
      reasons.push("日本語対応が強い");
    } else if (company.japaneseSupport === "medium") {
      score += 4;
    } else {
      score -= 10;
    }
  }

  return score;
}

function scoreMarketplaceStrength(company: Company, reasons: string[]) {
  const listingScore = company.listingScore ?? 0;
  const normalized = Math.min(18, Math.round(listingScore / 6));
  if (normalized > 0) reasons.push("掲載品質が高い");
  return normalized;
}

function scoreCompany(company: Company, criteria: BuyerCriteria) {
  const reasons: string[] = [];
  const total =
    scoreTechnologyFit(company, criteria, reasons) +
    scoreProjectTypeFit(company, criteria, reasons) +
    scoreBudgetFit(company, criteria, reasons) +
    scoreTeamFit(company, criteria, reasons) +
    scoreDurationFit(criteria) +
    scoreLanguageFit(company, criteria, reasons) +
    scoreMarketplaceStrength(company, reasons);

  return {
    score: Math.max(0, total + 30),
    reasons: reasons.slice(0, 4)
  };
}

export function runTierAwareMatch(companies: Company[], criteria: BuyerCriteria, _unusedBoostMap = {}, limit = 6): MatchResult[] {
  return companies
    .map((company) => {
      const result = scoreCompany(company, criteria);
      return { company, score: result.score, reasons: result.reasons };
    })
    .sort((a, b) => b.score - a.score || (b.company.listingScore ?? 0) - (a.company.listingScore ?? 0))
    .slice(0, limit);
}
