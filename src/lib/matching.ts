import type { BuyerCriteria, Company, MatchResult } from "@/lib/domain/types";

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

function scoreCompany(company: Company, criteria: BuyerCriteria) {
  let score = 10;
  const reasons: string[] = [];

  if (criteria.technologies.length) {
    const tech = company.services.map((v) => v.toLowerCase());
    const overlap = criteria.technologies.filter((needle) => tech.some((t) => t.includes(needle))).length;
    score += overlap * 12;
    if (overlap > 0) reasons.push(`技術一致 ${overlap}件`);
  }

  if (criteria.budgetCeiling !== null) {
    if (company.minRate <= criteria.budgetCeiling) {
      score += 16;
      reasons.push("予算条件に適合");
    }
    if (company.maxRate > criteria.budgetCeiling) score -= 4;
  }

  if (criteria.teamNeeded !== null) {
    if (company.teamSize >= criteria.teamNeeded) {
      score += 8;
      reasons.push("必要人数を満たす");
    } else {
      score -= 6;
    }
  }

  if (criteria.englishRequired && company.english === "high") {
    score += 8;
    reasons.push("英語対応が強い");
  }
  if (criteria.japaneseRequired && company.japaneseSupport !== "basic") {
    score += 6;
    reasons.push("日本語対応あり");
  }

  return { score: Math.max(0, score), reasons };
}

export function runTierAwareMatch(companies: Company[], criteria: BuyerCriteria, _unusedBoostMap = {}, limit = 6): MatchResult[] {
  return companies
    .map((company) => {
      const result = scoreCompany(company, criteria);
      return { company, score: result.score, reasons: result.reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
