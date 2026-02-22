import type { BoostPackage } from "./types";

export const BOOST_PACKAGES: BoostPackage[] = [
  {
    id: "boost-lite",
    name: "Boost Lite",
    days: 7,
    scoreBonus: 8,
    priceJpy: 39000,
    description: "1週間、露出を底上げ"
  },
  {
    id: "boost-pro",
    name: "Boost Pro",
    days: 14,
    scoreBonus: 14,
    priceJpy: 68000,
    description: "2週間、優先候補に入りやすくなる"
  },
  {
    id: "boost-launch",
    name: "Boost Launch",
    days: 30,
    scoreBonus: 22,
    priceJpy: 128000,
    description: "新規参入向けの月次露出強化"
  }
];
