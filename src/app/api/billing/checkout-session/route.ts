import { NextResponse } from "next/server";

import { createPendingBillingAccount, getVendorApplicationByUserId } from "@/lib/server/api-store";
import { createStripeVendorCheckoutSession } from "@/lib/server/stripe";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

function safeOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const application = await getVendorApplicationByUserId(vendor.id);
  if (!application?.id || !application.company?.id || !application.company?.name || !application.contactEmail) {
    return NextResponse.json({ error: "請求対象の申請情報が見つかりません。" }, { status: 400 });
  }

  const billingAccount = await createPendingBillingAccount(application);

  try {
    const stripeSession = await createStripeVendorCheckoutSession({
      applicationId: String(application.id),
      companyId: String(application.company.id),
      companyName: String(application.company.name),
      contactName: String(application.contactName ?? application.company.contactName ?? application.company.name),
      contactEmail: String(application.contactEmail),
      stripeCustomerId: billingAccount?.stripeCustomerId,
      plan: application.company.plan === "translation" ? "translation" : "basic",
      origin: safeOrigin(request)
    });

    if (stripeSession?.url) {
      return NextResponse.json({ url: stripeSession.url, provider: "stripe" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe セッションの生成に失敗しました。" },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Stripe 設定が不足しています。" }, { status: 500 });
}
