import { notFound } from "next/navigation";

import { CompanyProfilePageClient } from "./company-profile-page-client";
import { getAppUserRole, getBuyerByUserId, getCompanyProfile, isSupabaseConfigured, listSavedCompanyIdsByBuyerUserId } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CompanyProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyProfile(id);

  if (!company || company.active === false) {
    notFound();
  }

  let initialSessionRole: "guest" | "buyer" | "vendor" | "admin" = "guest";
  let initialBuyer = null;
  let initialFavoriteCompanyIds: string[] = [];

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
          initialSessionRole = initialBuyer ? "buyer" : "guest";
          if (initialBuyer) {
            initialFavoriteCompanyIds = await listSavedCompanyIdsByBuyerUserId(user.id);
          }
        } else if (appUser?.accountType === "vendor") {
          initialSessionRole = "vendor";
        } else if (appUser?.accountType === "admin") {
          initialSessionRole = "admin";
        }
      }
    } catch {
      initialSessionRole = "guest";
    }
  }

  return (
    <CompanyProfilePageClient
      initialCompany={company}
      initialSessionRole={initialSessionRole}
      initialBuyer={initialBuyer}
      initialFavoriteCompanyIds={initialFavoriteCompanyIds}
    />
  );
}
