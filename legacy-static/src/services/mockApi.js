import { MOCK_COMPANIES, SEED_BUYERS } from "../data/mockData.js";
import { storage } from "../data/storage.js";
import { BOOST_PACKAGES } from "../domain/boosts.js";
import { PLAN_SETTINGS } from "../domain/plans.js";

function ensureSeedData() {
  if (storage.getBuyers().length === 0) storage.setBuyers(SEED_BUYERS);
  if (storage.getCompanies().length === 0) storage.setCompanies(MOCK_COMPANIES);
}

function normalizeBoostEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return { endsAt: entry, bonus: 10 };
  return entry;
}

function getBoostEnd(companyId) {
  const entry = normalizeBoostEntry(storage.getBoostMap()[companyId]);
  return entry ? new Date(entry.endsAt).getTime() : 0;
}

function hasActiveBoost(companyId) {
  return Date.now() < getBoostEnd(companyId);
}

function applyBoost(companyId, days, bonus) {
  const boostMap = storage.getBoostMap();
  const base = Math.max(Date.now(), getBoostEnd(companyId));
  const endsAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  boostMap[companyId] = { endsAt, bonus };
  storage.setBoostMap(boostMap);
  return boostMap[companyId];
}

export function createMockApi() {
  ensureSeedData();

  return {
    async listCompanies() {
      return storage.getCompanies();
    },

    async getCompany(companyId) {
      return storage.getCompanies().find((company) => company.id === companyId) || null;
    },

    async listPlans() {
      return PLAN_SETTINGS;
    },

    async listBoostPackages() {
      return BOOST_PACKAGES;
    },

    async signUpBuyer(email, password) {
      const buyers = storage.getBuyers();
      if (buyers.some((buyer) => buyer.email === email)) {
        return { ok: false, error: "このメールアドレスは登録済みです" };
      }
      buyers.push({ email, password });
      storage.setBuyers(buyers);
      storage.setActiveBuyer(email);
      return { ok: true, buyer: { email } };
    },

    async signInBuyer(email, password) {
      const buyers = storage.getBuyers();
      const found = buyers.find((buyer) => buyer.email === email && buyer.password === password);
      if (!found) return { ok: false, error: "メールアドレスまたはパスワードが正しくありません" };
      storage.setActiveBuyer(email);
      return { ok: true, buyer: { email } };
    },

    async signOutBuyer() {
      storage.clearActiveBuyer();
      return { ok: true };
    },

    async getSession() {
      return { email: storage.getActiveBuyer() };
    },

    async getBoostMap() {
      return storage.getBoostMap();
    },

    async activateBoost(companyId, days = 7) {
      const boost = applyBoost(companyId, days, 10);
      return { ok: true, endsAt: boost.endsAt, bonus: boost.bonus };
    },

    async clearBoosts() {
      storage.setBoostMap({});
      return { ok: true };
    },

    async updateCompanyPlan(companyId, planKey) {
      if (!PLAN_SETTINGS[planKey]) return { ok: false, error: "不正なプランです" };

      const companies = storage.getCompanies();
      const next = companies.map((company) => {
        if (company.id !== companyId) return company;
        return { ...company, plan: planKey };
      });
      storage.setCompanies(next);
      return { ok: true };
    },

    async purchaseBoost(companyId, packageId) {
      const pkg = BOOST_PACKAGES.find((entry) => entry.id === packageId);
      if (!pkg) return { ok: false, error: "不正なブースト商品です" };

      const boost = applyBoost(companyId, pkg.days, pkg.scoreBonus);
      const history = storage.getBoostPurchases();
      history.unshift({
        id: `purchase-${Date.now()}`,
        companyId,
        packageId,
        amountJpy: pkg.priceJpy,
        createdAt: new Date().toISOString(),
        endsAt: boost.endsAt,
        bonus: boost.bonus
      });
      storage.setBoostPurchases(history.slice(0, 50));

      return { ok: true, endsAt: boost.endsAt, bonus: boost.bonus, package: pkg };
    },

    async listBoostPurchases(companyId) {
      return storage.getBoostPurchases().filter((entry) => entry.companyId === companyId);
    },

    hasActiveBoost
  };
}
