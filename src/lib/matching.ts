import type { BuyerCriteria, Company } from "@/lib/domain/types";

const KEYWORDS = [
  "react",
  "node",
  "python",
  "java",
  "go",
  "vue",
  "aws",
  "mobile",
  "php",
  "laravel",
  "vr",
  "ar",
  "blockchain",
  "unity",
  "unreal",
  "erp",
  "crm",
  "社内業務",
  "legacy"
];

export function parseCriteria(input: string): BuyerCriteria {
  const lower = input.toLowerCase();
  const criteria: BuyerCriteria = {
    technologies: [],
    budgetCeiling: null,
    teamNeeded: null,
    englishRequired: /english|英語/.test(lower),
    japaneseRequired: /日本語|japanese/.test(lower),
    durationMonths: null
  };

  KEYWORDS.forEach((tech) => {
    if (lower.includes(tech)) criteria.technologies.push(tech);
  });

  const budgetUsd = lower.match(/\$\s?(\d{2,3})|(?:時給|hour).{0,4}(\d{2,3})/);
  if (budgetUsd) criteria.budgetCeiling = Number(budgetUsd[1] ?? budgetUsd[2]);

  const teamMatch = lower.match(/(\d{1,2})\s*(名|人|developers|engineers|devs)/);
  if (teamMatch) criteria.teamNeeded = Number(teamMatch[1]);

  const monthMatch = lower.match(/(\d{1,2})\s*(months|month|ヶ月|か月)/);
  if (monthMatch) criteria.durationMonths = Number(monthMatch[1]);

  return criteria;
}

function scoreCompany(company: Company, criteria: BuyerCriteria): number {
  let score = 10;

  if (criteria.technologies.length) {
    const tech = company.services.map((v) => v.toLowerCase());
    const overlap = criteria.technologies.filter((needle) => tech.some((t) => t.includes(needle))).length;
    score += overlap * 12;
  }

  if (criteria.budgetCeiling !== null) {
    if (company.minRate <= criteria.budgetCeiling) score += 16;
    if (company.maxRate > criteria.budgetCeiling) score -= 4;
  }

  if (criteria.teamNeeded !== null) {
    score += company.teamSize >= criteria.teamNeeded ? 8 : -6;
  }

  if (criteria.englishRequired && company.english === "high") score += 8;
  if (criteria.japaneseRequired && company.japaneseSupport !== "basic") score += 6;

  return Math.max(0, score);
}

export function runTierAwareMatch(companies: Company[], criteria: BuyerCriteria, _unusedBoostMap = {}, limit = 6) {
  return companies
    .map((company) => ({ company, score: scoreCompany(company, criteria) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
