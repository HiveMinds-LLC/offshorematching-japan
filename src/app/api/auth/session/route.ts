import { NextResponse } from "next/server";

import { getAppUserRole, getBuyerByUserId, getBuyerFromSessionToken, getVendorCompanyByUserId, isSupabaseConfigured } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ role: "guest", buyer: null, vendor: null, admin: null, supabaseSession: null });
    }

    const appUser = await getAppUserRole(user.id);
    if (!appUser) {
      return NextResponse.json({ role: "guest", buyer: null, vendor: null, admin: null, supabaseSession: null });
    }

    if (appUser.accountType === "admin") {
      return NextResponse.json({
        role: "admin",
        buyer: null,
        vendor: null,
        admin: { email: appUser.email || user.email || "" },
        supabaseSession: session
          ? {
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            }
          : null
      });
    }

    if (appUser.accountType === "vendor") {
      const vendor = await getVendorCompanyByUserId(user.id);
      return NextResponse.json({
        role: vendor ? "vendor" : "guest",
        buyer: null,
        vendor,
        admin: null,
        supabaseSession: session
          ? {
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            }
          : null
      });
    }

    const buyer = await getBuyerByUserId(user.id, user.email ?? undefined);
    return NextResponse.json({
      role: buyer ? "buyer" : "guest",
      buyer: buyer ?? null,
      vendor: null,
      admin: null,
      supabaseSession: session
        ? {
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          }
        : null
    });
  }

  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token) ?? null;
  return NextResponse.json({ role: buyer ? "buyer" : "guest", buyer, vendor: null, admin: null, supabaseSession: null });
}
