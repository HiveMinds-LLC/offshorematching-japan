import { PLAN_SETTINGS } from "../domain/plans.js";

export function parseCriteria(input) {
  const lower = input.toLowerCase();
  const criteria = {
    technologies: [],
    budgetCeiling: null,
    teamNeeded: null,
    englishRequired: /english|英語/.test(lower),
    japaneseRequired: /日本語|japanese/.test(lower),
    durationMonths: null
  };

  ["react", "node", "python", "java", "go", "vue", "aws", "mobile", "php", "laravel"].forEach((tech) => {
    if (lower.includes(tech)) criteria.technologies.push(tech);
  });

  const budgetUsd = lower.match(/\$\s?(\d{2,3})|(?:時給|hour).{0,4}(\d{2,3})/);
  if (budgetUsd) criteria.budgetCeiling = Number(budgetUsd[1] || budgetUsd[2]);

  const teamMatch = lower.match(/(\d{1,2})\s*(名|人|developers|engineers|devs)/);
  if (teamMatch) criteria.teamNeeded = Number(teamMatch[1]);

  const monthMatch = lower.match(/(\d{1,2})\s*(months|month|ヶ月|か月)/);
  if (monthMatch) criteria.durationMonths = Number(monthMatch[1]);

  return criteria;
}

function scoreCompany(company, criteria, getBoostBonus) {
  let score = 10;

  if (criteria.technologies.length) {
    const companyTech = company.services.map((service) => service.toLowerCase());
    const overlap = criteria.technologies.filter((tech) => companyTech.some((s) => s.includes(tech))).length;
    score += overlap * 12;
  }

  if (criteria.budgetCeiling !== null) {
    if (company.minRate <= criteria.budgetCeiling) score += 16;
    if (company.maxRate > criteria.budgetCeiling) score -= 4;
  }

  if (criteria.teamNeeded !== null) {
    if (company.teamSize >= criteria.teamNeeded) score += 8;
    else score -= 6;
  }

  if (criteria.englishRequired && company.english === "high") score += 8;
  if (criteria.japaneseRequired && company.japaneseSupport !== "basic") score += 6;

  score += PLAN_SETTINGS[company.plan].rankBonus;
  score += getBoostBonus(company.id);
  return Math.max(score, 0);
}

function weightedSlotOrder() {
  const slots = [];
  Object.entries(PLAN_SETTINGS).forEach(([plan, cfg]) => {
    for (let i = 0; i < cfg.slotWeight; i += 1) slots.push(plan);
  });
  return slots.sort((a, b) => PLAN_SETTINGS[b].slotWeight - PLAN_SETTINGS[a].slotWeight);
}

export function runTierAwareMatch(companies, criteria, getBoostBonus, limit = 6) {
  const scored = companies
    .map((company) => ({ company, score: scoreCompany(company, criteria, getBoostBonus) }))
    .sort((a, b) => b.score - a.score);

  const groups = { enterprise: [], business: [], pro: [], developer: [] };
  scored.forEach((entry) => groups[entry.company.plan].push(entry));

  const picks = [];
  const slots = weightedSlotOrder();
  let cursor = 0;

  while (picks.length < limit && cursor < slots.length * limit) {
    const plan = slots[cursor % slots.length];
    const next = groups[plan].shift();
    if (next) picks.push(next);
    cursor += 1;
    if (Object.values(groups).every((arr) => arr.length === 0)) break;
  }

  return picks.sort((a, b) => b.score - a.score);
}
