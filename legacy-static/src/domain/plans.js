export const PLAN_SETTINGS = {
  developer: {
    label: "Developer",
    jpLabel: "Developerプラン",
    monthlyFeeJpy: 98000,
    rankBonus: 0,
    slotWeight: 1,
    monthlyMatchExposure: "標準",
    support: "メールサポート"
  },
  pro: {
    label: "Pro",
    jpLabel: "Proプラン",
    monthlyFeeJpy: 198000,
    rankBonus: 8,
    slotWeight: 2,
    monthlyMatchExposure: "優先",
    support: "チャット + メール"
  },
  business: {
    label: "Business",
    jpLabel: "Businessプラン",
    monthlyFeeJpy: 398000,
    rankBonus: 14,
    slotWeight: 3,
    monthlyMatchExposure: "高優先",
    support: "専任CS + SLA"
  },
  enterprise: {
    label: "Enterprise",
    jpLabel: "Enterpriseプラン",
    monthlyFeeJpy: 680000,
    rankBonus: 22,
    slotWeight: 4,
    monthlyMatchExposure: "最優先",
    support: "専任担当 + 共同提案"
  }
};

export function formatYen(value) {
  return `¥${value.toLocaleString("ja-JP")}`;
}
