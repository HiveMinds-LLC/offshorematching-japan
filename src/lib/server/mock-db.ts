import { MOCK_COMPANIES, SEED_BUYER_ORGANIZATIONS, SEED_VENDOR_APPLICATIONS } from "@/lib/data/mockData";
import type { BuyerOrganization, Company, DealRecord, DealStatus, MessageRecord, VendorApplication, VendorBillingAccount, VendorPreferredLanguage } from "@/lib/domain/types";

export type MockThread = {
  id: string;
  buyerEmail: string;
  vendorCompanyId: string;
  createdAt: string;
};

const state = {
  companies: [...MOCK_COMPANIES] as Company[],
  vendorApplications: [...SEED_VENDOR_APPLICATIONS] as VendorApplication[],
  buyers: [...SEED_BUYER_ORGANIZATIONS] as BuyerOrganization[],
  sessions: new Map<string, string>(),
  threads: [] as MockThread[],
  messages: [] as MessageRecord[],
  deals: new Map<string, DealRecord>(),
  billingAccounts: new Map<string, VendorBillingAccount>(
    SEED_VENDOR_APPLICATIONS.map((application) => [
      application.company.id,
      {
        companyId: application.company.id,
        applicationId: application.id,
        companyName: application.company.name,
        contactEmail: application.contactEmail,
        plan: application.company.plan,
        translationEnabled: application.company.plan === "translation",
        monthlyPriceJpy: application.company.plan === "translation" ? 10000 : 5000,
        status: "active",
        termsAcceptedAt: application.termsAcceptedAt,
        termsVersion: application.termsVersion,
        currentPeriodEnd: new Date("2026-04-30T00:00:00Z").toISOString(),
        stripeCustomerId: `cus_mock_${application.company.id}`,
        stripeSubscriptionId: `sub_mock_${application.company.id}`
      }
    ])
  )
};

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function companyLangForCountry(country: string): VendorPreferredLanguage {
  const lower = country.toLowerCase();
  if (lower.includes("japan")) return "ja";
  if (lower.includes("vietnam")) return "vi";
  if (lower.includes("indonesia")) return "id";
  if (lower.includes("thailand")) return "th";
  if (lower.includes("poland")) return "pl";
  if (lower.includes("romania")) return "ro";
  if (lower.includes("korea")) return "ko";
  if (lower.includes("india")) return "hi";
  if (lower.includes("ukraine")) return "uk";
  if (lower.includes("estonia")) return "et";
  if (lower.includes("chile")) return "es";
  if (lower.includes("malaysia")) return "ms";
  if (lower.includes("philippines")) return "tl";
  return "en";
}

function makeTranslatedText(body: string, target: string) {
  if (target === "ja") return `[JA] ${body}`;
  if (target === "en") return `[EN] ${body}`;
  return `[${target.toUpperCase()}] ${body}`;
}

export const mockDb = {
  upsertBuyer(input: BuyerOrganization) {
    const index = state.buyers.findIndex((b) => b.email.toLowerCase() === input.email.toLowerCase());
    if (index >= 0) {
      state.buyers[index] = input;
      return state.buyers[index];
    }
    state.buyers.unshift(input);
    return input;
  },
  createSessionForEmail(email: string) {
    const token = id("session");
    state.sessions.set(token, email);
    return token;
  },
  createBuyer(input: Omit<BuyerOrganization, "id">) {
    const exists = state.buyers.some((b) => b.email.toLowerCase() === input.email.toLowerCase());
    if (exists) return { ok: false as const, error: "このメールは既に登録されています。" };
    const row = { id: id("buyer"), ...input };
    state.buyers.unshift(row);
    return { ok: true as const, buyer: row };
  },
  loginBuyer(email: string, password: string) {
    const found = state.buyers.find((b) => b.email.toLowerCase() === email.toLowerCase() && b.password === password);
    if (!found) return { ok: false as const, error: "メールアドレスまたはパスワードが正しくありません。" };
    const token = this.createSessionForEmail(found.email);
    return { ok: true as const, token, buyer: found };
  },
  getBuyerByToken(token: string | undefined) {
    if (!token) return null;
    const email = state.sessions.get(token);
    if (!email) return null;
    return state.buyers.find((b) => b.email === email) ?? null;
  },
  logout(token: string | undefined) {
    if (!token) return;
    state.sessions.delete(token);
  },
  listCompanies() {
    return state.companies;
  },
  getCompany(idValue: string) {
    return state.companies.find((c) => c.id === idValue) ?? null;
  },
  updateCompany(idValue: string, patch: Partial<Company>) {
    const company = state.companies.find((c) => c.id === idValue);
    if (!company) return null;
    Object.assign(company, patch);
    state.vendorApplications.forEach((app) => {
      if (app.company.id === idValue) {
        app.company = { ...app.company, ...patch };
      }
    });
    return company;
  },
  listApplications() {
    return state.vendorApplications;
  },
  createApplication(app: VendorApplication) {
    state.vendorApplications.unshift(app);
    return app;
  },
  upsertBillingAccount(account: VendorBillingAccount) {
    state.billingAccounts.set(account.companyId, account);
    return account;
  },
  getBillingAccount(companyId: string) {
    return state.billingAccounts.get(companyId) ?? null;
  },
  getBillingAccountByApplicationId(applicationId: string) {
    return [...state.billingAccounts.values()].find((entry) => entry.applicationId === applicationId) ?? null;
  },
  createPendingBillingAccount(application: VendorApplication) {
    const account: VendorBillingAccount = {
      companyId: application.company.id,
      applicationId: application.id,
      companyName: application.company.name,
      contactEmail: application.contactEmail,
      plan: application.company.plan,
      translationEnabled: application.company.plan === "translation",
      monthlyPriceJpy: application.company.plan === "translation" ? 10000 : 5000,
      status: "pending_checkout",
      termsAcceptedAt: application.termsAcceptedAt,
      termsVersion: application.termsVersion
    };
    state.billingAccounts.set(account.companyId, account);
    return account;
  },
  activateBillingAccount(applicationId: string) {
    const account = this.getBillingAccountByApplicationId(applicationId);
    if (!account) return null;
    const next = {
      ...account,
      status: "active" as const,
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    };
    state.billingAccounts.set(next.companyId, next);
    return next;
  },
  updateBillingStatus(companyId: string, action: "pause" | "resume" | "cancel") {
    const account = state.billingAccounts.get(companyId);
    if (!account) return null;
    if (action === "pause") {
      const next = { ...account, status: "paused" as const, pauseRequestedAt: new Date().toISOString() };
      state.billingAccounts.set(companyId, next);
      return next;
    }
    if (action === "resume") {
      const next = { ...account, status: "active" as const, pauseRequestedAt: undefined };
      state.billingAccounts.set(companyId, next);
      return next;
    }
    const next = { ...account, status: "canceled" as const, canceledAt: new Date().toISOString() };
    state.billingAccounts.set(companyId, next);
    return next;
  },
  reviewApplication(idValue: string, status: VendorApplication["status"]) {
    const target = state.vendorApplications.find((v) => v.id === idValue);
    if (!target) return null;
    target.status = status;
    target.reviewNote = status === "approved" ? "承認" : "却下";
    if (status === "approved") {
      const exists = state.companies.some((c) => c.id === target.company.id);
      if (!exists) state.companies.unshift(target.company);
      if (!state.billingAccounts.has(target.company.id)) this.createPendingBillingAccount(target);
    }
    return target;
  },
  findOrCreateThread(buyerEmail: string, vendorCompanyId: string) {
    let thread = state.threads.find((t) => {
      if (t.buyerEmail !== buyerEmail || t.vendorCompanyId !== vendorCompanyId) return false;
      const deal = state.deals.get(t.id);
      return !deal || deal.status !== "完了" || !deal.lockedAt;
    });
    if (!thread) {
      thread = { id: id("thread"), buyerEmail, vendorCompanyId, createdAt: new Date().toISOString() };
      state.threads.unshift(thread);
      state.deals.set(thread.id, {
        threadId: thread.id,
        status: "相談中",
        updatedAt: thread.createdAt,
        updatedBy: "buyer"
      });
    }
    return thread;
  },
  listThreads(buyerEmail: string) {
    return state.threads.filter((t) => t.buyerEmail === buyerEmail);
  },
  listThreadsByVendorCompanyId(vendorCompanyId: string) {
    return state.threads.filter((t) => t.vendorCompanyId === vendorCompanyId);
  },
  getThreadById(threadId: string) {
    return state.threads.find((t) => t.id === threadId) ?? null;
  },
  getDeal(threadId: string) {
    return state.deals.get(threadId) ?? null;
  },
  upsertDeal(threadId: string, patch: { status: DealStatus; updatedBy: "buyer" | "vendor"; title?: string }) {
    const current = state.deals.get(threadId);
    const next: DealRecord = {
      threadId,
      title: patch.title ?? current?.title,
      status: patch.status,
      updatedAt: new Date().toISOString(),
      updatedBy: patch.updatedBy,
      proposedStatus: null,
      proposedBy: null,
      proposalCreatedAt: null,
      lockedAt: patch.status === "完了" ? new Date().toISOString() : null
    };
    state.deals.set(threadId, next);
    return next;
  },
  listMessages(threadId: string) {
    return state.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  deleteThread(threadId: string) {
    const index = state.threads.findIndex((thread) => thread.id === threadId);
    if (index < 0) return false;
    state.threads.splice(index, 1);
    state.messages = state.messages.filter((message) => message.threadId !== threadId);
    state.deals.delete(threadId);
    return true;
  },
  addMessage(threadId: string, sender: "buyer" | "vendor", body: string) {
    const thread = state.threads.find((entry) => entry.id === threadId);
    const vendorCompany = state.companies.find((entry) => entry.id === thread?.vendorCompanyId);
    const companyLanguage = vendorCompany?.preferredLanguage ?? (vendorCompany ? companyLangForCountry(vendorCompany.country) : "en");
    const billingAccount = vendorCompany ? state.billingAccounts.get(vendorCompany.id) : null;
    const translationEnabled = billingAccount?.translationEnabled ?? vendorCompany?.plan === "translation";
    const originalLanguage = sender === "buyer" ? "ja" : companyLanguage;
    const message: MessageRecord = {
      id: id("msg"),
      threadId,
      sender,
      messageType: "text",
      body,
      originalLanguage,
      translations: translationEnabled
        ? {
            ja: originalLanguage === "ja" ? body : makeTranslatedText(body, "ja"),
            en: originalLanguage === "en" ? body : makeTranslatedText(body, "en"),
            company: originalLanguage === companyLanguage ? body : makeTranslatedText(body, companyLanguage)
          }
        : {},
      createdAt: new Date().toISOString()
    };
    state.messages.push(message);
    return message;
  }
};
