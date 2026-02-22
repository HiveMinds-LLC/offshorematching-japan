import { MOCK_COMPANIES, SEED_BUYER_ORGANIZATIONS, SEED_VENDOR_APPLICATIONS } from "@/lib/data/mockData";
import type { BuyerOrganization, Company, VendorApplication } from "@/lib/domain/types";

export type MockThread = {
  id: string;
  buyerEmail: string;
  vendorCompanyId: string;
  createdAt: string;
};

export type MockMessage = {
  id: string;
  threadId: string;
  sender: "buyer" | "vendor";
  body: string;
  createdAt: string;
};

const state = {
  companies: [...MOCK_COMPANIES] as Company[],
  vendorApplications: [...SEED_VENDOR_APPLICATIONS] as VendorApplication[],
  buyers: [...SEED_BUYER_ORGANIZATIONS] as BuyerOrganization[],
  sessions: new Map<string, string>(),
  threads: [] as MockThread[],
  messages: [] as MockMessage[]
};

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
  reviewApplication(idValue: string, status: VendorApplication["status"]) {
    const target = state.vendorApplications.find((v) => v.id === idValue);
    if (!target) return null;
    target.status = status;
    target.reviewNote = status === "approved" ? "承認" : "却下";
    if (status === "approved") {
      const exists = state.companies.some((c) => c.id === target.company.id);
      if (!exists) state.companies.unshift(target.company);
    }
    return target;
  },
  findOrCreateThread(buyerEmail: string, vendorCompanyId: string) {
    let thread = state.threads.find((t) => t.buyerEmail === buyerEmail && t.vendorCompanyId === vendorCompanyId);
    if (!thread) {
      thread = { id: id("thread"), buyerEmail, vendorCompanyId, createdAt: new Date().toISOString() };
      state.threads.unshift(thread);
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
  listMessages(threadId: string) {
    return state.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  addMessage(threadId: string, sender: "buyer" | "vendor", body: string) {
    const message = { id: id("msg"), threadId, sender, body, createdAt: new Date().toISOString() };
    state.messages.push(message);
    return message;
  }
};
