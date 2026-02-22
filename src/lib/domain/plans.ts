import type { PlanKey, PlanSetting } from "./types";

export const PLAN_SETTINGS: Record<PlanKey, PlanSetting> = {
  developer: {
    label: "Listing",
    jpLabel: "掲載ベーシック",
    monthlyFeeJpy: 5000,
    rankBonus: 0,
    slotWeight: 1,
    monthlyMatchExposure: "基本掲載",
    support: "メール"
  },
  pro: {
    label: "Pro Visibility",
    jpLabel: "露出強化プラン",
    monthlyFeeJpy: 29800,
    rankBonus: 8,
    slotWeight: 2,
    monthlyMatchExposure: "優先表示",
    support: "チャット + メール"
  },
  business: {
    label: "Business Growth",
    jpLabel: "案件獲得プラン",
    monthlyFeeJpy: 69800,
    rankBonus: 14,
    slotWeight: 3,
    monthlyMatchExposure: "高優先表示",
    support: "専任CS"
  },
  enterprise: {
    label: "Enterprise Partner",
    jpLabel: "戦略パートナープラン",
    monthlyFeeJpy: 148000,
    rankBonus: 22,
    slotWeight: 4,
    monthlyMatchExposure: "最優先表示",
    support: "専任担当 + SLA"
  }
};

export function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}
