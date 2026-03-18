import type { PlanKey, PlanSetting } from "./types";

export const PLAN_SETTINGS: Record<PlanKey, PlanSetting> = {
  basic: {
    label: "Basic Listing",
    jpLabel: "掲載ベーシック",
    monthlyFeeJpy: 5000,
    rankBonus: 0,
    slotWeight: 1,
    monthlyMatchExposure: "基本掲載",
    support: "メール"
  },
  translation: {
    label: "Translation Chat",
    jpLabel: "翻訳付きプラン",
    monthlyFeeJpy: 10000,
    rankBonus: 0,
    slotWeight: 1,
    monthlyMatchExposure: "基本掲載 + 翻訳チャット",
    support: "チャット + メール"
  }
};

export function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}
