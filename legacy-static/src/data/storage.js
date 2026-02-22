const STORAGE_KEYS = {
  buyers: "prototype_buyers",
  activeBuyer: "prototype_active_buyer",
  boostMap: "prototype_boost_map",
  companies: "prototype_companies",
  boostPurchases: "prototype_boost_purchases"
};

function getJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getBuyers() {
    return getJSON(STORAGE_KEYS.buyers, []);
  },
  setBuyers(buyers) {
    setJSON(STORAGE_KEYS.buyers, buyers);
  },
  getActiveBuyer() {
    return localStorage.getItem(STORAGE_KEYS.activeBuyer);
  },
  setActiveBuyer(email) {
    localStorage.setItem(STORAGE_KEYS.activeBuyer, email);
  },
  clearActiveBuyer() {
    localStorage.removeItem(STORAGE_KEYS.activeBuyer);
  },
  getBoostMap() {
    return getJSON(STORAGE_KEYS.boostMap, {});
  },
  setBoostMap(boostMap) {
    setJSON(STORAGE_KEYS.boostMap, boostMap);
  },
  getCompanies() {
    return getJSON(STORAGE_KEYS.companies, []);
  },
  setCompanies(companies) {
    setJSON(STORAGE_KEYS.companies, companies);
  },
  getBoostPurchases() {
    return getJSON(STORAGE_KEYS.boostPurchases, []);
  },
  setBoostPurchases(entries) {
    setJSON(STORAGE_KEYS.boostPurchases, entries);
  }
};
