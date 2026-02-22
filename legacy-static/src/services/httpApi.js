function createJsonClient(baseUrl) {
  async function request(path, init = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || `Request failed: ${response.status}`);
    }
    return json;
  }

  return { request };
}

export function createHttpApi(baseUrl) {
  const client = createJsonClient(baseUrl);

  return {
    async listCompanies() {
      const result = await client.request("/companies");
      return result.companies || [];
    },

    async getCompany(companyId) {
      const result = await client.request(`/companies/${companyId}`);
      return result.company || null;
    },

    async listPlans() {
      const result = await client.request("/plans");
      return result.plans || {};
    },

    async listBoostPackages() {
      const result = await client.request("/boost-packages");
      return result.packages || [];
    },

    async signUpBuyer(email, password) {
      try {
        const result = await client.request("/buyers/signup", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        return { ok: true, buyer: result.buyer };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },

    async signInBuyer(email, password) {
      try {
        const result = await client.request("/buyers/signin", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        return { ok: true, buyer: result.buyer };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },

    async signOutBuyer() {
      await client.request("/buyers/signout", { method: "POST" });
      return { ok: true };
    },

    async getSession() {
      const result = await client.request("/session");
      return { email: result.email || null };
    },

    async getBoostMap() {
      const result = await client.request("/boosts");
      return result.boostMap || {};
    },

    async activateBoost(companyId, days = 7) {
      await client.request("/boosts", {
        method: "POST",
        body: JSON.stringify({ companyId, days })
      });
      return { ok: true };
    },

    async clearBoosts() {
      await client.request("/boosts", { method: "DELETE" });
      return { ok: true };
    },

    async updateCompanyPlan(companyId, planKey) {
      await client.request(`/companies/${companyId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ planKey })
      });
      return { ok: true };
    },

    async purchaseBoost(companyId, packageId) {
      return client.request(`/companies/${companyId}/boost-purchase`, {
        method: "POST",
        body: JSON.stringify({ packageId })
      });
    },

    async listBoostPurchases(companyId) {
      const result = await client.request(`/companies/${companyId}/boost-purchases`);
      return result.purchases || [];
    },

    hasActiveBoost() {
      return false;
    }
  };
}
