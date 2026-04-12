import { getAppUserRole, getVendorApplicationByUserId, getVendorCompanyByUserId, isSupabaseConfigured } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VendorSession = {
  id: string;
  email: string;
  companyId?: string;
  applicationId?: string;
};

export async function getCurrentVendorSession(): Promise<VendorSession | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const appUser = await getAppUserRole(user.id);
  if (!appUser || appUser.accountType !== "vendor") return null;

  const [company, application] = await Promise.all([
    getVendorCompanyByUserId(user.id),
    getVendorApplicationByUserId(user.id)
  ]);

  return {
    id: user.id,
    email: user.email ?? appUser.email ?? "",
    companyId: company?.id,
    applicationId: application?.id
  };
}
