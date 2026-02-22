import { PLAN_SETTINGS, formatYen } from "../domain/plans.js";

function jpLevel(label) {
  if (label === "high") return "高";
  if (label === "medium") return "中";
  return "標準";
}

export function createRenderer(elements) {
  function renderCompanyCard(company, target, options = {}) {
    const node = elements.companyCardTemplate.content.cloneNode(true);
    node.querySelector(".name").textContent = company.name;

    const tierLabel = PLAN_SETTINGS[company.plan].jpLabel;
    const boostSuffix = options.boostBonus > 0 ? ` | Boost +${options.boostBonus}` : "";
    node.querySelector(".tier").textContent = `${tierLabel}${boostSuffix}`;

    node.querySelector(".summary").textContent = company.summary;
    node.querySelector(".rate").textContent = `$${company.minRate} - $${company.maxRate} / h`;

    const tags = node.querySelector(".tags");
    company.services.slice(0, 4).forEach((service) => {
      const li = document.createElement("li");
      li.textContent = service;
      tags.appendChild(li);
    });

    const meta = [];
    if (typeof options.score === "number") meta.push(`マッチスコア ${options.score.toFixed(1)}`);
    meta.push(`${company.country} | ${company.teamSize}名`);
    meta.push(`英語 ${jpLevel(company.english)} / 日本語 ${jpLevel(company.japaneseSupport)}`);
    node.querySelector(".meta").textContent = meta.join(" | ");

    target.appendChild(node);
  }

  function renderDirectory(companies, getBoostBonus) {
    elements.directory.innerHTML = "";
    companies.forEach((company) => {
      renderCompanyCard(company, elements.directory, { boostBonus: getBoostBonus(company.id) });
    });
  }

  function renderMatchResults(matches, getBoostBonus) {
    elements.matchResults.innerHTML = "";
    matches.forEach(({ company, score }) => {
      renderCompanyCard(company, elements.matchResults, {
        score,
        boostBonus: getBoostBonus(company.id)
      });
    });
  }

  function renderCriteria(criteria) {
    elements.criteriaBox.textContent = JSON.stringify(criteria, null, 2);
  }

  function renderPricing(plans) {
    elements.pricingGrid.innerHTML = "";

    Object.entries(plans).forEach(([planKey, plan]) => {
      const el = document.createElement("article");
      el.className = "pricing-card";
      el.innerHTML = `
        <span class="badge">${plan.jpLabel}</span>
        <h3>${plan.label}</h3>
        <p class="price">${formatYen(plan.monthlyFeeJpy)} / 月</p>
        <p class="muted">AI候補表示: ${plan.monthlyMatchExposure}</p>
        <p class="muted">サポート: ${plan.support}</p>
        <p class="muted">優先係数: ${plan.slotWeight}x</p>
      `;
      elements.pricingGrid.appendChild(el);
    });
  }

  function renderBoostCatalog(packages) {
    elements.boostCatalog.innerHTML = "<h3>ブースト商品</h3>";
    const grid = document.createElement("div");
    grid.className = "package-grid";
    packages.forEach((pkg) => {
      const el = document.createElement("article");
      el.className = "package";
      el.innerHTML = `
        <h4>${pkg.name}</h4>
        <p class="price">${formatYen(pkg.priceJpy)}</p>
        <p class="muted">${pkg.days}日間 / スコア +${pkg.scoreBonus}</p>
        <p class="muted">${pkg.description}</p>
      `;
      grid.appendChild(el);
    });
    elements.boostCatalog.appendChild(grid);
  }

  return {
    renderDirectory,
    renderMatchResults,
    renderCriteria,
    renderPricing,
    renderBoostCatalog
  };
}
