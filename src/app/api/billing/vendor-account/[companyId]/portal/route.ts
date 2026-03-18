import { NextResponse } from "next/server";

import { getVendorBillingAccount } from "@/lib/server/api-store";
import { createStripeBillingPortalSession } from "@/lib/server/stripe";

type Params = { params: Promise<{ companyId: string }> };

function safeOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request, { params }: Params) {
  const { companyId } = await params;
  const billingAccount = await getVendorBillingAccount(companyId);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求アカウントが見つかりません。" }, { status: 404 });
  }

  if (billingAccount.stripeCustomerId) {
    try {
      const portalSession = await createStripeBillingPortalSession({
        customerId: billingAccount.stripeCustomerId,
        origin: safeOrigin(request),
        companyId
      });
      if (portalSession?.url) {
        return NextResponse.json({ url: portalSession.url, provider: "stripe" });
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Stripe ポータルの生成に失敗しました。" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    url: `${safeOrigin(request)}/app`,
    provider: "mock"
  });
}
