import { createApiClient } from "./services/apiClient.js";
import { parseCriteria, runTierAwareMatch } from "./services/matcher.js";
import { createRenderer } from "./ui/render.js";
import { PLAN_SETTINGS, formatYen } from "./domain/plans.js";

const api = createApiClient();

const elements = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  views: Array.from(document.querySelectorAll(".view")),
  kpiGrid: document.getElementById("kpiGrid"),
  searchInput: document.getElementById("searchInput"),
  techFilter: document.getElementById("techFilter"),
  rateFilter: document.getElementById("rateFilter"),
  directory: document.getElementById("directory"),
  authBlock: document.getElementById("authBlock"),
  matcher: document.getElementById("matcher"),
  chatInput: document.getElementById("chatInput"),
  runMatch: document.getElementById("runMatch"),
  criteriaBox: document.getElementById("criteriaBox"),
  matchResults: document.getElementById("matchResults"),
  vendorCompany: document.getElementById("vendorCompany"),
  vendorSummary: document.getElementById("vendorSummary"),
  planSelect: document.getElementById("planSelect"),
  savePlan: document.getElementById("savePlan"),
  planMessage: document.getElementById("planMessage"),
  boostPackages: document.getElementById("boostPackages"),
  boostMessage: document.getElementById("boostMessage"),
  pricingGrid: document.getElementById("pricingGrid"),
  boostCatalog: document.getElementById("boostCatalog"),
  companyCardTemplate: document.getElementById("companyCardTemplate")
};

const renderer = createRenderer(elements);

const state = {
  companies: [],
  plans: PLAN_SETTINGS,
  boostPackages: [],
  boostMap: {},
  activeBuyerEmail: null,
  latestCriteria: null,
  selectedVendorCompanyId: null
};

function normalizeBoostEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return { endsAt: entry, bonus: 10 };
  return entry;
}

function getBoostBonus(companyId) {
  const boost = normalizeBoostEntry(state.boostMap[companyId]);
  if (!boost) return 0;
  return Date.now() < new Date(boost.endsAt).getTime() ? boost.bonus || 0 : 0;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

function renderKpis() {
  const activeBoosts = Object.keys(state.boostMap).filter((companyId) => getBoostBonus(companyId) > 0).length;
  const avgRate = state.companies.length
    ? Math.round(state.companies.reduce((sum, c) => sum + c.minRate, 0) / state.companies.length)
    : 0;

  const cards = [
    { label: "登録開発会社", value: `${state.companies.length}社` },
    { label: "アクティブBoost", value: `${activeBoosts}社` },
    { label: "平均開始単価", value: `$${avgRate}/h` },
    { label: "料金プラン", value: `${Object.keys(state.plans).length}種類` }
  ];

  elements.kpiGrid.innerHTML = "";
  cards.forEach((card) => {
    const el = document.createElement("article");
    el.className = "kpi-card";
    el.innerHTML = `<p class="kpi-card__label">${card.label}</p><p class="kpi-card__value">${card.value}</p>`;
    elements.kpiGrid.appendChild(el);
  });
}

function bindTabs() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      elements.tabs.forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");

      elements.views.forEach((section) => {
        section.classList.toggle("is-visible", section.id === `view-${view}`);
      });
    });
  });
}

function applyMarketplaceFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const tech = elements.techFilter.value.trim().toLowerCase();
  const rateCap = elements.rateFilter.value ? Number(elements.rateFilter.value) : null;

  const filtered = state.companies.filter((company) => {
    const techText = company.services.join(" ").toLowerCase();
    const searchable = `${company.name} ${techText} ${company.summary}`.toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (tech && !techText.includes(tech)) return false;
    if (rateCap !== null && company.minRate > rateCap) return false;
    return true;
  });

  renderer.renderDirectory(filtered, getBoostBonus);
}

function populateVendorControls() {
  elements.vendorCompany.innerHTML = "";
  state.companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company.id;
    option.textContent = `${company.name} (${state.plans[company.plan].jpLabel})`;
    elements.vendorCompany.appendChild(option);
  });

  elements.planSelect.innerHTML = "";
  Object.entries(state.plans).forEach(([planKey, plan]) => {
    const option = document.createElement("option");
    option.value = planKey;
    option.textContent = `${plan.jpLabel} - ${formatYen(plan.monthlyFeeJpy)} / 月`;
    elements.planSelect.appendChild(option);
  });

  if (!state.selectedVendorCompanyId && state.companies.length) {
    state.selectedVendorCompanyId = state.companies[0].id;
  }
  elements.vendorCompany.value = state.selectedVendorCompanyId || "";
  renderVendorSummary();
}

function renderVendorSummary() {
  const company = state.companies.find((entry) => entry.id === state.selectedVendorCompanyId);
  if (!company) {
    elements.vendorSummary.textContent = "会社を選択してください。";
    return;
  }

  elements.planSelect.value = company.plan;
  const boost = normalizeBoostEntry(state.boostMap[company.id]);
  const boostText = boost && getBoostBonus(company.id) > 0
    ? `有効Boost: +${boost.bonus}（${formatDate(boost.endsAt)}まで）`
    : "有効Boost: なし";

  elements.vendorSummary.innerHTML = `
    <strong>${company.name}</strong><br />
    現在プラン: ${state.plans[company.plan].jpLabel}（${formatYen(state.plans[company.plan].monthlyFeeJpy)} / 月）<br />
    ${boostText}
  `;
}

function renderBoostPurchaseCards() {
  elements.boostPackages.innerHTML = "";
  state.boostPackages.forEach((pkg) => {
    const card = document.createElement("article");
    card.className = "package";
    card.innerHTML = `
      <h4>${pkg.name}</h4>
      <p class="price">${formatYen(pkg.priceJpy)}</p>
      <p class="muted">${pkg.days}日 / スコア +${pkg.scoreBonus}</p>
      <p class="muted">${pkg.description}</p>
      <button data-buy-id="${pkg.id}" class="ghost">このBoostを購入</button>
    `;
    elements.boostPackages.appendChild(card);
  });

  elements.boostPackages.querySelectorAll("button[data-buy-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const packageId = button.getAttribute("data-buy-id");
      const companyId = state.selectedVendorCompanyId;
      if (!companyId) return;

      const result = await api.purchaseBoost(companyId, packageId);
      if (!result.ok) {
        elements.boostMessage.textContent = result.error || "購入処理に失敗しました";
        return;
      }

      elements.boostMessage.textContent = `購入完了: ${result.package.name}（有効期限 ${formatDate(result.endsAt)}）`;
      await refreshCoreData();
      applyMarketplaceFilters();
      renderVendorSummary();
      if (!elements.matcher.classList.contains("hidden") && state.latestCriteria) await runMatch();
    });
  });
}

async function refreshCoreData() {
  const [companies, boostMap] = await Promise.all([api.listCompanies(), api.getBoostMap()]);
  state.companies = companies;
  state.boostMap = boostMap;
  renderKpis();
}

async function renderAuth() {
  const session = await api.getSession();
  state.activeBuyerEmail = session.email;

  if (state.activeBuyerEmail) {
    elements.authBlock.innerHTML = `
      <p><strong>${state.activeBuyerEmail}</strong> でログイン中</p>
      <button id="logoutBtn" class="secondary">ログアウト</button>
    `;
    elements.matcher.classList.remove("hidden");
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await api.signOutBuyer();
      await renderAuth();
    });
    return;
  }

  elements.authBlock.innerHTML = `
    <p class="muted">AIマッチングを使うには企業アカウント登録が必要です。</p>
    <form class="auth-form" id="authForm">
      <div class="auth-row">
        <input required type="email" id="email" placeholder="company@example.jp" />
        <input required type="password" id="password" minlength="6" placeholder="パスワード" />
      </div>
      <div class="auth-row">
        <button data-mode="signup" type="submit">新規登録</button>
        <button data-mode="login" type="submit" class="secondary">ログイン</button>
      </div>
      <p id="authMsg" class="muted"></p>
    </form>
  `;

  elements.matcher.classList.add("hidden");
  const authForm = document.getElementById("authForm");
  const authMsg = document.getElementById("authMsg");
  let mode = "signup";

  authForm.querySelectorAll("button[data-mode]").forEach((button) => {
    button.addEventListener("click", (event) => {
      mode = event.currentTarget.getAttribute("data-mode");
    });
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const result = mode === "signup" ? await api.signUpBuyer(email, password) : await api.signInBuyer(email, password);
    if (!result.ok) {
      authMsg.textContent = result.error || "認証に失敗しました";
      return;
    }

    authMsg.textContent = "ログイン成功";
    await renderAuth();
  });
}

async function runMatch() {
  const text = elements.chatInput.value.trim();
  if (!text || !state.activeBuyerEmail) return;

  state.latestCriteria = parseCriteria(text);
  renderer.renderCriteria(state.latestCriteria);

  const matches = runTierAwareMatch(state.companies, state.latestCriteria, getBoostBonus, 6);
  renderer.renderMatchResults(matches, getBoostBonus);
}

function bindFilters() {
  [elements.searchInput, elements.techFilter, elements.rateFilter].forEach((el) => {
    el.addEventListener("input", applyMarketplaceFilters);
    el.addEventListener("change", applyMarketplaceFilters);
  });
}

function bindVendorEvents() {
  elements.vendorCompany.addEventListener("change", () => {
    state.selectedVendorCompanyId = elements.vendorCompany.value;
    renderVendorSummary();
  });

  elements.savePlan.addEventListener("click", async () => {
    if (!state.selectedVendorCompanyId) return;
    const result = await api.updateCompanyPlan(state.selectedVendorCompanyId, elements.planSelect.value);
    if (!result.ok) {
      elements.planMessage.textContent = result.error || "プラン更新に失敗しました";
      return;
    }

    elements.planMessage.textContent = "プランを更新しました。";
    await refreshCoreData();
    applyMarketplaceFilters();
    populateVendorControls();
    if (!elements.matcher.classList.contains("hidden") && state.latestCriteria) await runMatch();
  });
}

function bindBuyerEvents() {
  elements.runMatch.addEventListener("click", runMatch);
}

async function init() {
  const [plans, boostPackages] = await Promise.all([api.listPlans(), api.listBoostPackages()]);
  state.plans = plans;
  state.boostPackages = boostPackages;

  await refreshCoreData();

  renderer.renderPricing(state.plans);
  renderer.renderBoostCatalog(state.boostPackages);
  applyMarketplaceFilters();
  populateVendorControls();
  renderBoostPurchaseCards();
  await renderAuth();

  bindTabs();
  bindFilters();
  bindVendorEvents();
  bindBuyerEvents();
}

init().catch((error) => {
  console.error(error);
  elements.authBlock.innerHTML = `<p class="muted">初期化エラー: ${error.message}</p>`;
});
