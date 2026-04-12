import { getAppUserRole, getBuyerByUserId, isSupabaseConfigured } from "@/lib/server/api-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BuyerSession = {
  id: string;
  email: string;
  buyerOrgId: string;
};

export async function getCurrentBuyerSession(): Promise<BuyerSession | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const appUser = await getAppUserRole(user.id);
  if (!appUser || appUser.accountType !== "buyer") return null;

  const buyer = await getBuyerByUserId(user.id, user.email ?? undefined);
  if (!buyer) return null;

  return {
    id: user.id,
    email: user.email ?? appUser.email ?? "",
    buyerOrgId: buyer.id
  };
}
