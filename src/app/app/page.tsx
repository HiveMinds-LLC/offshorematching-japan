import { AppTopbar } from "@/components/app/app-topbar";
import { OffshoreMatchApp } from "@/components/offshorematch-app";
import { getAppUserRole, getBuyerByUserId, getVendorApplicationByUserId, getVendorBillingAccount, getVendorCompanyByUserId, isSupabaseConfigured, listSavedCompanyIdsByBuyerUserId } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppPage({
  searchParams
}: {
  searchParams?: Promise<{ section?: string; thread?: string }>;
}) {
  let initialBuyer = null;
  let initialAdminEmail: string | null = null;
  let initialVendorCompany = null;
  let initialVendorApplication = null;
  let initialVendorBilling = null;
  let initialRole: "guest" | "buyer" | "vendor" | "admin" = "guest";
  let initialSection:
    | "marketplace"
    | "auth"
    | "buyer-overview"
    | "buyer-matching"
    | "buyer-saved"
    | "buyer-messages"
    | "buyer-projects"
    | "vendor-overview"
    | "vendor-profile"
    | "vendor-messages"
    | "vendor-projects"
    | "vendor-history"
    | "vendor-billing"
    | null = null;
  let initialThreadId = "";
  let initialFavoriteCompanyIds: string[] = [];
  const resolvedSearchParams = (await searchParams) ?? {};
  const section = resolvedSearchParams.section;
  const allowedSections = new Set([
    "marketplace",
    "auth",
    "buyer-overview",
    "buyer-matching",
    "buyer-saved",
    "buyer-messages",
    "buyer-projects",
    "vendor-overview",
    "vendor-profile",
    "vendor-messages",
    "vendor-projects",
    "vendor-history",
    "vendor-billing"
  ]);

  if (typeof section === "string" && allowedSections.has(section)) {
    initialSection = section as NonNullable<typeof initialSection>;
  }
  if (typeof resolvedSearchParams.thread === "string") {
    initialThreadId = resolvedSearchParams.thread;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const appUser = await getAppUserRole(user.id);
        if (appUser?.accountType === "buyer") {
          initialBuyer = await getBuyerByUserId(user.id, user.email ?? undefined);
          initialRole = initialBuyer ? "buyer" : "guest";
          if (initialBuyer) {
            initialFavoriteCompanyIds = await listSavedCompanyIdsByBuyerUserId(user.id);
          }
        } else if (appUser?.accountType === "vendor") {
          const [vendorCompany, vendorApplication] = await Promise.all([
            getVendorCompanyByUserId(user.id),
            getVendorApplicationByUserId(user.id)
          ]);
          initialVendorCompany = vendorCompany;
          initialVendorApplication = vendorApplication;
          if (vendorCompany) {
            initialVendorBilling = await getVendorBillingAccount(vendorCompany.id);
          }
          initialRole = initialVendorCompany ? "vendor" : "guest";
        } else if (appUser?.accountType === "admin") {
          initialAdminEmail = appUser.email || user.email || null;
          initialRole = "admin";
        }
      }
    } catch (error) {
      console.error("Failed to bootstrap /app server state", error);
    }
  }

  return (
    <div>
      <AppTopbar title="アプリ" titleEn="App" subtitle="マーケットプレイス・ログイン・マッチング" subtitleEn="Marketplace, login, and matching" />
      <main>
        <OffshoreMatchApp
          initialBuyer={initialBuyer}
          initialVendorCompany={initialVendorCompany}
          initialVendorApplication={initialVendorApplication}
          initialVendorBilling={initialVendorBilling}
          initialAdminEmail={initialAdminEmail}
          initialRole={initialRole}
          initialSection={initialSection}
          initialThreadId={initialThreadId}
          initialFavoriteCompanyIds={initialFavoriteCompanyIds}
        />
      </main>
    </div>
  );
}
